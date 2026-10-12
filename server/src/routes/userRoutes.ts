import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, AuthenticatedRequest } from '../security/authMiddleware';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { WhatsAppSession } from '../models/WhatsAppSession';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { AuditLog } from '../models/AuditLog';
import { disconnectWhatsAppSession } from '../whatsapp/baileysManager';
import { logger } from '../utils/logger';

const router = Router();

router.use(requireAuth);

// PUT /api/user/profile
router.put('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { name, themePreference } = req.body;

    if (name && name.trim()) {
      user.name = name.trim();
    }
    if (themePreference && ['dark', 'light', 'system'].includes(themePreference)) {
      user.themePreference = themePreference;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        themePreference: user.themePreference
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/user/password
router.put('/password', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'Valid current password and new password (min 8 characters) required.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Incorrect current password.' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Revoke other refresh tokens
    await RefreshToken.updateMany({ userId: user._id }, { revokedAt: new Date() });

    await AuditLog.create({
      userId: user._id,
      action: 'PASSWORD_CHANGED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// GET /api/user/audit-logs
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await AuditLog.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// DELETE /api/user/account
router.delete('/account', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();

    // 1. Purge WhatsApp connection and credentials
    await disconnectWhatsAppSession(userId);
    await WhatsAppSession.deleteOne({ userId });

    // 2. Delete conversations and messages
    await Message.deleteMany({ userId });
    await Conversation.deleteMany({ userId });

    // 3. Delete auth tokens
    await RefreshToken.deleteMany({ userId });

    // 4. Delete user record
    await User.deleteOne({ _id: userId });

    logger.info({ userId }, 'User account and all associated tenant data permanently deleted');

    res.json({ message: 'Account and all associated session data have been permanently purged.' });
  } catch (err) {
    logger.error({ err }, 'Error deleting user account');
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export const userRoutes = router;
