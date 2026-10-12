import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../security/authMiddleware';
import { Conversation } from '../models/Conversation';
import { Contact } from '../models/Contact';
import { Message } from '../models/Message';
import { validateAndNormalizePhone } from '../utils/phoneValidator';
import { sendManualTextMessage, resolveWhatsAppContact } from '../whatsapp/baileysManager';
import { logger } from '../utils/logger';

const router = Router();

router.use(requireAuth);

// GET /api/conversations
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const search = (req.query.search as string)?.trim();

    const query: Record<string, unknown> = { userId };

    if (search) {
      const regex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      query.$or = [{ name: regex }, { phoneNumber: regex }, { lastMessagePreview: regex }];
    }

    const conversations = await Conversation.find(query)
      .sort({ lastMessageTimestamp: -1 })
      .limit(100);

    const syncedConversations = await Promise.all(
      conversations.map(async (conv) => {
        if (conv.lastMessageDirection === 'outbound') {
          const latestMsg = await Message.findOne({ conversationId: conv._id, userId })
            .sort({ timestamp: -1, createdAt: -1 });
          if (latestMsg && latestMsg.status && latestMsg.status !== conv.lastMessageStatus) {
            conv.lastMessageStatus = latestMsg.status;
            await conv.save();
          }
        }
        return conv.toObject ? conv.toObject() : conv;
      })
    );

    res.json({ conversations: syncedConversations });
  } catch (err) {
    logger.error({ err }, 'Error listing conversations');
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

// POST /api/conversations (Start new conversation)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { phone, name, initialMessage } = req.body;

    if (!phone) {
      res.status(400).json({ error: 'Recipient phone number is required.' });
      return;
    }

    const phoneValidation = validateAndNormalizePhone(phone);
    if (!phoneValidation.isValid) {
      res.status(400).json({ error: phoneValidation.error });
      return;
    }

    const targetJid = phoneValidation.jid;

    // Check if WhatsApp is connected and resolve canonical JID & LID
    let canonicalLid: string | undefined = undefined;
    let canonicalJid: string = targetJid;
    try {
      const waContact = await resolveWhatsAppContact(userId.toString(), phoneValidation.digits);
      if (waContact) {
        if (waContact.lid) canonicalLid = waContact.lid;
        if (waContact.jid) canonicalJid = waContact.jid;
      }
    } catch {
      // Non-blocking
    }

    const contactName = name?.trim() || phoneValidation.e164;

    // 1. Find or create Contact in Contact collection
    let contact = await Contact.findOne({
      userId,
      $or: [
        { jid: targetJid },
        { jid: canonicalJid },
        { phoneNumber: phoneValidation.e164 },
        ...(canonicalLid ? [{ lid: canonicalLid }] : [])
      ]
    });

    if (!contact) {
      contact = await Contact.create({
        userId,
        name: contactName,
        phoneNumber: phoneValidation.e164,
        jid: canonicalJid,
        lid: canonicalLid
      });
    } else {
      if (canonicalLid && !contact.lid) contact.lid = canonicalLid;
      if (name?.trim()) contact.name = name.trim();
      await contact.save();
    }

    // 2. Check if conversation already exists
    let conversation = await Conversation.findOne({
      userId,
      $or: [
        { contactId: contact._id },
        { jid: targetJid },
        { jid: canonicalJid },
        ...(canonicalLid ? [{ lid: canonicalLid }] : [])
      ]
    });

    if (!conversation) {
      conversation = await Conversation.create({
        userId,
        contactId: contact._id,
        jid: canonicalJid,
        lid: canonicalLid,
        phoneNumber: phoneValidation.e164,
        name: contact.name,
        unreadCount: 0,
        lastMessageTimestamp: new Date()
      });
    } else {
      conversation.contactId = contact._id;
      conversation.name = contact.name;
      if (canonicalLid && !conversation.lid) {
        conversation.lid = canonicalLid;
      }
      await conversation.save();
    }

    // If an initial message was supplied, send it now
    let messageDoc = null;
    if (initialMessage && initialMessage.trim()) {
      const sendResult = await sendManualTextMessage(userId.toString(), phoneValidation.e164, initialMessage.trim());
      messageDoc = sendResult.message;
      conversation = sendResult.conversation as any;
    }

    res.status(201).json({
      conversation,
      message: messageDoc
    });
  } catch (err: any) {
    logger.error({ err }, 'Error starting conversation');
    res.status(400).json({ error: err.message || 'Failed to start new conversation.' });
  }
});

// GET /api/conversations/:jid/messages
router.get('/:jid/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const jid = decodeURIComponent(req.params.jid);
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before ? new Date(req.query.before as string) : null;

    const conv = await Conversation.findOne({
      userId,
      $or: [{ jid }, { lid: jid }]
    });

    const query: Record<string, unknown> = { userId };
    if (conv) {
      query.conversationId = conv._id;
    } else {
      query.jid = jid;
    }

    if (before && !isNaN(before.getTime())) {
      query.timestamp = { $lt: before };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Reset unread count for this conversation
    if (conv) {
      conv.unreadCount = 0;
      await conv.save();
    }

    // Return in chronological order for UI display
    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === limit
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching messages');
    res.status(500).json({ error: 'Failed to retrieve conversation messages' });
  }
});

// DELETE /api/conversations/:jid
router.delete('/:jid', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const jid = decodeURIComponent(req.params.jid);

    await Message.deleteMany({ userId, jid });
    await Conversation.deleteOne({ userId, jid });

    res.json({ message: 'Conversation deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export const conversationRoutes = router;
