import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
  proto,
  WAMessageStatus
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import pino from 'pino';
import { useEncryptedAuthState } from './authStateAdapter';
import { WhatsAppSession, WhatsAppSessionStatus } from '../models/WhatsAppSession';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { validateAndNormalizePhone } from '../utils/phoneValidator';
import { checkMessageRateLimit, recordMessageSent } from '../security/rateLimiter';
import {
  emitWhatsAppStatus,
  emitWhatsAppQR,
  emitNewMessage,
  emitMessageUpdate,
  emitConversationUpdate
} from '../realtime/socketManager';
import { logger } from '../utils/logger';

interface ActiveSession {
  sock: WASocket;
  clearSession: () => Promise<void>;
  isExplicitDisconnect?: boolean;
}

// Memory registry of active user sockets (Tenant Isolation)
const activeSessions = new Map<string, ActiveSession>();
const connectingLocks = new Set<string>();

/**
 * Returns current status of user's WhatsApp session
 */
export async function getSessionStatus(userId: string): Promise<{
  status: WhatsAppSessionStatus;
  phoneNumber?: string;
  pushName?: string;
  jid?: string;
  qrCode?: string;
  qrExpiresAt?: Date;
  lastConnectedAt?: Date;
  disconnectReason?: string;
}> {
  const sessionDoc = await WhatsAppSession.findOne({ userId });
  const inMemory = activeSessions.get(userId);

  if (!sessionDoc) {
    return { status: 'disconnected' };
  }

  // If in-memory is open and connected, ensure status matches
  if (inMemory && sessionDoc.status !== 'connected' && inMemory.sock.user?.id) {
    sessionDoc.status = 'connected';
    await sessionDoc.save();
  } else if (!inMemory && (sessionDoc.status === 'connected' || sessionDoc.status === 'connecting')) {
    // Automatically resume session in background
    startWhatsAppSession(userId).catch(() => {});
  }

  return {
    status: sessionDoc.status,
    phoneNumber: sessionDoc.phoneNumber,
    pushName: sessionDoc.pushName,
    jid: sessionDoc.jid,
    qrCode: sessionDoc.qrCode,
    qrExpiresAt: sessionDoc.qrExpiresAt,
    lastConnectedAt: sessionDoc.lastConnectedAt,
    disconnectReason: sessionDoc.disconnectReason
  };
}

/**
 * Starts or connects to the user's isolated WhatsApp session
 */
export async function startWhatsAppSession(userId: string): Promise<{
  status: WhatsAppSessionStatus;
  qrCode?: string;
}> {
  // Prevent duplicate concurrent initialization
  if (connectingLocks.has(userId)) {
    const existing = await WhatsAppSession.findOne({ userId });
    return {
      status: existing?.status || 'connecting',
      qrCode: existing?.qrCode
    };
  }

  const existingSession = activeSessions.get(userId);
  if (existingSession && existingSession.sock.user?.id) {
    return { status: 'connected' };
  }

  connectingLocks.add(userId);

  try {
    // Upsert session record in DB
    let sessionDoc = await WhatsAppSession.findOne({ userId });
    if (!sessionDoc) {
      sessionDoc = new WhatsAppSession({
        userId,
        status: 'connecting'
      });
    } else {
      sessionDoc.status = 'connecting';
      sessionDoc.disconnectReason = undefined;
      sessionDoc.lastError = undefined;
    }
    await sessionDoc.save();

    emitWhatsAppStatus(userId, { status: 'connecting' });

    // Load encrypted credentials for this specific user
    const { state, saveCreds, clearSession } = await useEncryptedAuthState(userId);

    // Fetch latest WhatsApp Web version
    let version: [number, number, number] = [2, 3000, 1017531287];
    try {
      const versionResult = await fetchLatestBaileysVersion();
      version = versionResult.version;
    } catch (err) {
      logger.warn({ err }, 'Could not fetch latest Baileys version, using default fallback');
    }

    // Create isolated Baileys socket with quiet internal logger
    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: state,
      browser: ['PulseChat Web', 'Chrome', '1.0.0'],
      syncFullHistory: false, // Prevents giant payload downloads on initial connect
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000
    });

    const activeSessionRecord: ActiveSession = {
      sock,
      clearSession,
      isExplicitDisconnect: false
    };

    activeSessions.set(userId, activeSessionRecord);

    // Handle credential updates
    sock.ev.on('creds.update', saveCreds);

    // Handle connection lifecycle
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Handle QR code generation
      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            scale: 7
          });

          const expiresAt = new Date(Date.now() + 60 * 1000); // Standard QR expiry ~60s
          await WhatsAppSession.updateOne(
            { userId },
            {
              status: 'connecting',
              qrCode: qrDataUrl,
              qrExpiresAt: expiresAt
            }
          );

          emitWhatsAppQR(userId, { qrCode: qrDataUrl, expiresAt: expiresAt.toISOString() });
          emitWhatsAppStatus(userId, { status: 'connecting' });
        } catch (err) {
          logger.error({ userId, err }, 'Failed to generate QR data URL');
        }
      }

      // Handle Connected
      if (connection === 'open') {
        const rawUser = sock.user;
        const rawId = rawUser?.id || '';
        const phoneNumber = rawId.split(':')[0] || rawId.split('@')[0];
        const pushName = rawUser?.name || 'My WhatsApp';

        await WhatsAppSession.updateOne(
          { userId },
          {
            status: 'connected',
            phoneNumber: `+${phoneNumber}`,
            pushName,
            jid: rawUser?.id,
            qrCode: undefined,
            qrExpiresAt: undefined,
            lastConnectedAt: new Date(),
            disconnectReason: undefined,
            lastError: undefined
          }
        );

        emitWhatsAppStatus(userId, {
          status: 'connected',
          phoneNumber: `+${phoneNumber}`,
          pushName,
          jid: rawUser?.id
        });

        logger.info({ userId, phoneNumber }, 'WhatsApp connection established successfully');
      }

      // Handle Disconnected / Closed
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const reasonStr = (lastDisconnect?.error as Error)?.message || `Code ${statusCode}`;

        logger.warn({ userId, statusCode, reasonStr }, 'WhatsApp connection closed');

        const currentActive = activeSessions.get(userId);
        const wasExplicit = currentActive?.isExplicitDisconnect;

        activeSessions.delete(userId);

        if (isLoggedOut || wasExplicit) {
          // Logged out or explicitly disconnected: wipe session credentials
          await clearSession();
          await WhatsAppSession.updateOne(
            { userId },
            {
              status: 'disconnected',
              qrCode: undefined,
              qrExpiresAt: undefined,
              disconnectReason: wasExplicit ? 'User requested disconnect' : 'Logged out from device'
            }
          );

          emitWhatsAppStatus(userId, {
            status: 'disconnected',
            error: wasExplicit ? undefined : 'Session was logged out from WhatsApp.'
          });
        } else {
          // Temporary disconnection: attempt safe reconnection
          await WhatsAppSession.updateOne(
            { userId },
            {
              status: 'connecting',
              disconnectReason: `Reconnecting: ${reasonStr}`
            }
          );

          emitWhatsAppStatus(userId, {
            status: 'connecting',
            error: 'Connection lost. Reconnecting...'
          });

          // Wait 3 seconds and retry connection safely
          setTimeout(() => {
            if (!activeSessions.has(userId)) {
              startWhatsAppSession(userId).catch((err) => {
                logger.error({ userId, err }, 'Auto-reconnection failed');
              });
            }
          }, 3500);
        }
      }
    });

    // Handle incoming & outgoing messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      // Process both notify (live) and append messages
      for (const msg of messages) {
        if (!msg.message) continue;

        // Ignore status broadcasts
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.includes('@broadcast')) {
          continue;
        }

        // Extract message content
        const messageText =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          (msg.message.imageMessage ? '[Image]' : null) ||
          (msg.message.videoMessage ? '[Video]' : null) ||
          (msg.message.audioMessage ? '[Audio]' : null) ||
          (msg.message.documentMessage ? '[Document]' : null) ||
          '[Attachment]';

        const isFromMe = Boolean(msg.key.fromMe);
        const direction = isFromMe ? 'outbound' : 'inbound';
        const messageId = msg.key.id || `msg_${Date.now()}_${Math.random()}`;

        // Deduplication: check if message already stored
        const existing = await Message.findOne({ userId, messageId });
        if (existing) continue;

        // Find or create Conversation
        const phoneValidation = validateAndNormalizePhone(remoteJid);
        const contactName = (!isFromMe && msg.pushName)
          ? msg.pushName
          : (phoneValidation.e164 || remoteJid.split('@')[0] || 'Contact');

        let conversation = await Conversation.findOne({
          userId,
          $or: [
            { jid: remoteJid },
            { lid: remoteJid },
            ...(msg.key.participant ? [{ jid: msg.key.participant }, { lid: msg.key.participant }] : [])
          ]
        });

        // If not found and remoteJid is a WhatsApp LID (@lid), match with existing contact
        if (!conversation && remoteJid.endsWith('@lid')) {
          // 1. Match by pushName if present
          if (msg.pushName) {
            const matchedByPush = await Conversation.findOne({
              userId,
              $or: [
                { name: msg.pushName },
                { name: new RegExp(msg.pushName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i') }
              ]
            });
            if (matchedByPush) {
              conversation = matchedByPush;
              conversation.lid = remoteJid;
            }
          }

          // 2. If still not matched, check existing conversations without LID in parallel
          if (!conversation) {
            try {
              const pendingConvs = await Conversation.find({
                userId,
                $or: [{ lid: { $exists: false } }, { lid: null }, { lid: '' }]
              }).limit(5);

              const allDigits = pendingConvs
                .map((c) => c.phoneNumber?.replace(/\D/g, ''))
                .filter(Boolean) as string[];

              if (allDigits.length > 0) {
                const checks = await Promise.allSettled(
                  allDigits.map((d) => sock.onWhatsApp(d))
                );
                for (let i = 0; i < checks.length; i++) {
                  const res = checks[i];
                  if (res.status === 'fulfilled' && res.value && res.value.length > 0) {
                    const found = res.value[0];
                    if ((found as any).lid === remoteJid) {
                      conversation = pendingConvs[i];
                      conversation.lid = remoteJid;
                      break;
                    }
                  }
                }
              }
            } catch (err) {
              logger.warn({ err }, 'Error resolving LID against existing conversations');
            }
          }
        }

        if (!conversation) {
          conversation = new Conversation({
            userId,
            jid: remoteJid,
            lid: remoteJid.endsWith('@lid') ? remoteJid : undefined,
            phoneNumber: phoneValidation.e164 || remoteJid.split('@')[0],
            name: contactName,
            unreadCount: isFromMe ? 0 : 1,
            lastMessagePreview: messageText,
            lastMessageTimestamp: new Date((Number(msg.messageTimestamp) || Date.now() / 1000) * 1000),
            lastMessageStatus: isFromMe ? 'sent' : undefined,
            lastMessageDirection: direction
          });
        } else {
          if (!isFromMe) {
            conversation.unreadCount += 1;
          }
          if (msg.pushName && (!conversation.name || conversation.name === conversation.phoneNumber)) {
            conversation.name = msg.pushName;
          }
          if (remoteJid.endsWith('@lid') && !conversation.lid) {
            conversation.lid = remoteJid;
          }
          conversation.lastMessagePreview = messageText;
          conversation.lastMessageTimestamp = new Date((Number(msg.messageTimestamp) || Date.now() / 1000) * 1000);
          conversation.lastMessageStatus = isFromMe ? 'sent' : undefined;
          conversation.lastMessageDirection = direction;
        }

        await conversation.save();

        // Create Message document
        const newMsgDoc = await Message.create({
          userId,
          conversationId: conversation._id,
          jid: remoteJid,
          messageId,
          direction,
          text: messageText,
          status: isFromMe ? 'sent' : 'delivered',
          timestamp: new Date((Number(msg.messageTimestamp) || Date.now() / 1000) * 1000)
        });

        // Real-time broadcasts to authenticated user's room
        emitNewMessage(userId, {
          message: newMsgDoc,
          conversationId: conversation._id.toString()
        });

        emitConversationUpdate(userId, {
          conversation
        });
      }
    });

    // Handle message status updates (sent, delivered, read receipts)
    sock.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        if (!update.key?.id) continue;

        let newStatus: 'sent' | 'delivered' | 'read' | undefined;
        const rawStatus = update.update.status as any;
        if (rawStatus === WAMessageStatus.READ || rawStatus === 4 || rawStatus === 'READ') {
          newStatus = 'read';
        } else if (rawStatus === WAMessageStatus.DELIVERY_ACK || rawStatus === 3 || rawStatus === 'DELIVERY_ACK') {
          newStatus = 'delivered';
        } else if (rawStatus === WAMessageStatus.SERVER_ACK || rawStatus === 2 || rawStatus === 'SERVER_ACK') {
          newStatus = 'sent';
        }

        if (newStatus) {
          const updatedMsg = await Message.findOneAndUpdate(
            { userId, messageId: update.key.id },
            { status: newStatus },
            { new: true }
          );

          if (updatedMsg) {
            emitMessageUpdate(userId, {
              messageId: update.key.id,
              status: newStatus,
              conversationId: updatedMsg.conversationId
            });
          }
        }
      }
    });

    return {
      status: sessionDoc.status,
      qrCode: sessionDoc.qrCode
    };
  } finally {
    connectingLocks.delete(userId);
  }
}

/**
 * Manually sends a single 1-to-1 text message via Baileys
 */
export async function sendManualTextMessage(
  userId: string,
  recipientPhone: string,
  text: string,
  conversationId?: string
): Promise<{ message: unknown; conversation: unknown }> {
  // 1. Anti-Spam Rate Limit & Cooldown Check
  const rateLimitCheck = checkMessageRateLimit(userId);
  if (!rateLimitCheck.allowed) {
    throw new Error(rateLimitCheck.reason || 'Rate limit exceeded. Please wait before sending again.');
  }

  // 2. Validate text content
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Message text cannot be empty.');
  }
  if (trimmed.length > 4000) {
    throw new Error('Message text exceeds maximum allowed length of 4000 characters.');
  }

  // 3. Resolve target conversation and destination JID
  let existingConv = null;
  if (conversationId) {
    existingConv = await Conversation.findOne({ _id: conversationId, userId });
  }

  if (!existingConv && recipientPhone) {
    const cleanedDigits = recipientPhone.replace(/\D/g, '');
    existingConv = await Conversation.findOne({
      userId,
      $or: [
        { jid: recipientPhone },
        { lid: recipientPhone },
        { phoneNumber: recipientPhone },
        ...(cleanedDigits ? [{ jid: `${cleanedDigits}@s.whatsapp.net` }, { phoneNumber: `+${cleanedDigits}` }] : [])
      ]
    });
  }

  let canonicalJid: string = '';
  let canonicalLid: string | undefined = undefined;
  let formattedPhone: string = '';

  if (existingConv) {
    canonicalJid = existingConv.jid;
    canonicalLid = existingConv.lid;
    formattedPhone = existingConv.phoneNumber;
  } else {
    const phoneValidation = validateAndNormalizePhone(recipientPhone);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.error || 'Invalid recipient phone number format.');
    }
    canonicalJid = phoneValidation.jid;
    formattedPhone = phoneValidation.e164;
  }

  // 4. Retrieve active WhatsApp session
  let activeSession = activeSessions.get(userId);
  if (!activeSession || !activeSession.sock.user?.id) {
    const sessionDoc = await WhatsAppSession.findOne({ userId });
    if (sessionDoc && (sessionDoc.status === 'connected' || sessionDoc.status === 'connecting')) {
      startWhatsAppSession(userId).catch(() => {});
      for (let i = 0; i < 8; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        activeSession = activeSessions.get(userId);
        if (activeSession && activeSession.sock.user?.id) break;
      }
    }
  }

  if (!activeSession || !activeSession.sock.user?.id) {
    throw new Error('WhatsApp is not connected. Please connect your account first via QR code.');
  }

  const { sock } = activeSession;

  // 5. If brand new recipient, verify on WhatsApp and extract canonical IDs
  if (!existingConv) {
    try {
      const digits = formattedPhone.replace(/\D/g, '');
      const results = await sock.onWhatsApp(digits);
      const onWaResult = results && results.length > 0 ? results[0] : null;
      if (onWaResult && !onWaResult.exists) {
        throw new Error(`The phone number ${formattedPhone} is not registered on WhatsApp.`);
      }
      if (onWaResult?.jid) canonicalJid = onWaResult.jid;
      if ((onWaResult as any)?.lid) canonicalLid = (onWaResult as any).lid;
    } catch (err: any) {
      if (err.message && err.message.includes('not registered')) {
        throw err;
      }
    }
  }

  // 6. Send message via Baileys
  const sentResult = await sock.sendMessage(canonicalJid, { text: trimmed });

  if (!sentResult || !sentResult.key?.id) {
    throw new Error('Failed to dispatch message to WhatsApp network.');
  }

  // Record rate limit consumption
  recordMessageSent(userId);

  // 7. Upsert Conversation
  let conversation = existingConv || await Conversation.findOne({
    userId,
    $or: [
      { jid: canonicalJid },
      ...(canonicalLid ? [{ lid: canonicalLid }] : [])
    ]
  });

  if (!conversation) {
    conversation = new Conversation({
      userId,
      jid: canonicalJid,
      lid: canonicalLid,
      phoneNumber: formattedPhone,
      name: formattedPhone,
      unreadCount: 0,
      lastMessagePreview: trimmed,
      lastMessageTimestamp: new Date(),
      lastMessageStatus: 'sent',
      lastMessageDirection: 'outbound'
    });
  } else {
    if (canonicalLid && !conversation.lid) {
      conversation.lid = canonicalLid;
    }
    conversation.lastMessagePreview = trimmed;
    conversation.lastMessageTimestamp = new Date();
    conversation.lastMessageStatus = 'sent';
    conversation.lastMessageDirection = 'outbound';
  }
  await conversation.save();

  // 8. Persist Message record in MongoDB
  const messageDoc = await Message.create({
    userId,
    conversationId: conversation._id,
    jid: canonicalJid,
    messageId: sentResult.key.id,
    direction: 'outbound',
    text: trimmed,
    status: 'sent',
    timestamp: new Date()
  });

  // 9. Real-time broadcast
  emitNewMessage(userId, {
    message: messageDoc,
    conversationId: conversation._id.toString()
  });

  emitConversationUpdate(userId, {
    conversation
  });

  return {
    message: messageDoc,
    conversation
  };
}

/**
 * Disconnects and purges WhatsApp session for a user
 */
export async function disconnectWhatsAppSession(userId: string): Promise<void> {
  const active = activeSessions.get(userId);
  if (active) {
    active.isExplicitDisconnect = true;
    try {
      await active.sock.logout();
    } catch {
      try {
        active.sock.end(undefined);
      } catch {
        // Ignore socket termination error
      }
    }
    await active.clearSession();
    activeSessions.delete(userId);
  } else {
    const { clearSession } = await useEncryptedAuthState(userId);
    await clearSession();
  }

  await WhatsAppSession.updateOne(
    { userId },
    {
      status: 'disconnected',
      phoneNumber: undefined,
      pushName: undefined,
      jid: undefined,
      qrCode: undefined,
      qrExpiresAt: undefined,
      disconnectReason: 'User initiated disconnect'
    }
  );

  emitWhatsAppStatus(userId, { status: 'disconnected' });
  logger.info({ userId }, 'WhatsApp session disconnected and wiped.');
}

/**
 * Gracefully shuts down all active sessions (on server terminate)
 */
export async function shutdownAllSessions(): Promise<void> {
  logger.info('Shutting down all active WhatsApp sessions gracefully...');
  for (const [userId, session] of activeSessions.entries()) {
    try {
      session.isExplicitDisconnect = false;
      session.sock.end(undefined);
    } catch {
      // Ignore
    }
  }
  activeSessions.clear();
}

/**
 * Resolves canonical JID and LID for a given phone number digits if session is connected
 */
export async function resolveWhatsAppContact(
  userId: string,
  digits: string
): Promise<{ jid?: string; lid?: string; exists?: boolean } | null> {
  const activeSession = activeSessions.get(userId);
  if (!activeSession || !activeSession.sock.user?.id) {
    return null;
  }
  try {
    const results = await activeSession.sock.onWhatsApp(digits);
    return results && results.length > 0 ? (results[0] as any) : null;
  } catch {
    return null;
  }
}

/**
 * Restores previously connected WhatsApp sessions on server startup
 */
export async function restoreSavedSessions(): Promise<void> {
  try {
    const sessions = await WhatsAppSession.find({
      status: { $in: ['connected', 'connecting'] }
    });
    logger.info({ count: sessions.length }, 'Restoring saved WhatsApp sessions on boot...');
    for (const session of sessions) {
      const userId = session.userId.toString();
      startWhatsAppSession(userId).catch((err) => {
        logger.warn({ userId, err: err.message }, 'Failed auto-restoring WhatsApp session on boot');
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error restoring saved sessions on boot');
  }
}

