import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../security/authMiddleware';
import { Conversation } from '../models/Conversation';
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
      .limit(100)
      .lean();

    res.json({ conversations });
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

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      userId,
      $or: [
        { jid: targetJid },
        { jid: canonicalJid },
        ...(canonicalLid ? [{ lid: canonicalLid }] : [])
      ]
    });

    if (!conversation) {
      conversation = await Conversation.create({
        userId,
        jid: canonicalJid,
        lid: canonicalLid,
        phoneNumber: phoneValidation.e164,
        name: name?.trim() || phoneValidation.e164,
        unreadCount: 0,
        lastMessageTimestamp: new Date()
      });
    } else {
      if (canonicalLid && !conversation.lid) {
        conversation.lid = canonicalLid;
      }
      if (name?.trim() && conversation.name === conversation.phoneNumber) {
        conversation.name = name.trim();
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
