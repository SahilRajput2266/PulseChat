import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../security/authMiddleware';
import { Message } from '../models/Message';
import { sendManualTextMessage } from '../whatsapp/baileysManager';
import { logger } from '../utils/logger';

const router = Router();

router.use(requireAuth);

// POST /api/messages/send
router.post('/send', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { recipientPhone, text, conversationId } = req.body;

    if (!recipientPhone && !conversationId) {
      res.status(400).json({ error: 'Recipient phone number or conversation ID is required.' });
      return;
    }

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Message content cannot be blank.' });
      return;
    }

    const result = await sendManualTextMessage(userId, recipientPhone || '', text, conversationId);

    res.status(200).json({
      message: 'Message dispatched successfully',
      data: result.message,
      conversation: result.conversation
    });
  } catch (err: any) {
    logger.warn({ err: err.message, userId: req.user?._id }, 'Message send failure');

    // Return structured, helpful error message
    const errorMessage = err.message || 'Failed to send message.';
    const statusCode = errorMessage.includes('Rate limit') || errorMessage.includes('cooldown') ? 429 : 400;

    res.status(statusCode).json({ error: errorMessage });
  }
});

// POST /api/messages/:id/retry
router.post('/:id/retry', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const messageId = req.params.id;

    if (!messageId || messageId.startsWith('temp_')) {
      res.status(400).json({ error: 'Cannot retry unpersisted message ID. Resend message directly.' });
      return;
    }

    const msg = await Message.findOne({ _id: messageId, userId });
    if (!msg) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    if (msg.direction !== 'outbound') {
      res.status(400).json({ error: 'Only outbound messages can be retried' });
      return;
    }

    const result = await sendManualTextMessage(userId, msg.jid, msg.text);

    // Update retry count and remove failed mark
    await Message.deleteOne({ _id: msg._id });

    res.json({
      message: 'Message retried successfully',
      data: result.message
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Retry failed' });
  }
});

export const messageRoutes = router;
