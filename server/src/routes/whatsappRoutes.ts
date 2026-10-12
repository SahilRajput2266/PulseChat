import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../security/authMiddleware';
import {
  startWhatsAppSession,
  getSessionStatus,
  disconnectWhatsAppSession
} from '../whatsapp/baileysManager';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

const router = Router();

// Protect all WhatsApp routes with JWT authentication
router.use(requireAuth);

// GET /api/whatsapp/status
router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const status = await getSessionStatus(userId);
    res.json(status);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch WhatsApp status');
    res.status(500).json({ error: 'Failed to retrieve WhatsApp connection status' });
  }
});

// POST /api/whatsapp/connect
router.post('/connect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();

    const result = await startWhatsAppSession(userId);

    await AuditLog.create({
      userId: req.user!._id,
      action: 'WHATSAPP_CONNECT_INITIATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      message: 'WhatsApp session initiated',
      status: result.status,
      qrCode: result.qrCode
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start WhatsApp session');
    res.status(500).json({ error: 'Failed to initialize WhatsApp connection. Please try again.' });
  }
});

// POST /api/whatsapp/disconnect
router.post('/disconnect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();

    await disconnectWhatsAppSession(userId);

    await AuditLog.create({
      userId: req.user!._id,
      action: 'WHATSAPP_DISCONNECTED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'WhatsApp account disconnected and credentials wiped.' });
  } catch (err) {
    logger.error({ err }, 'Failed to disconnect WhatsApp session');
    res.status(500).json({ error: 'Failed to disconnect WhatsApp session' });
  }
});

export const whatsappRoutes = router;
