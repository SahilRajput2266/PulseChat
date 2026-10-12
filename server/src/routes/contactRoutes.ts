import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../security/authMiddleware';
import { Contact } from '../models/Contact';
import { Conversation } from '../models/Conversation';
import { validateAndNormalizePhone } from '../utils/phoneValidator';
import { resolveWhatsAppContact } from '../whatsapp/baileysManager';
import { logger } from '../utils/logger';

const router = Router();

router.use(requireAuth);

/**
 * Ensures any existing conversation has a corresponding Contact created and linked
 */
export async function syncExistingConversationsToContacts(userId: string): Promise<void> {
  try {
    const unlinkedConversations = await Conversation.find({
      userId,
      $or: [{ contactId: { $exists: false } }, { contactId: null }]
    });

    for (const conv of unlinkedConversations) {
      let contact = await Contact.findOne({
        userId,
        $or: [
          { jid: conv.jid },
          ...(conv.lid ? [{ lid: conv.lid }] : []),
          { phoneNumber: conv.phoneNumber }
        ]
      });

      if (!contact) {
        contact = await Contact.create({
          userId,
          name: conv.name || conv.phoneNumber,
          phoneNumber: conv.phoneNumber,
          jid: conv.jid,
          lid: conv.lid
        });
      }

      conv.contactId = contact._id;
      await conv.save();
    }
  } catch (err) {
    logger.warn({ err }, 'Error syncing conversations to contacts');
  }
}

// GET /api/contacts (List contacts)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const search = (req.query.search as string)?.trim();
    const tag = (req.query.tag as string)?.trim();

    // Auto-sync unlinked conversations to contacts
    await syncExistingConversationsToContacts(userId.toString());

    const query: Record<string, unknown> = { userId };

    if (search) {
      const regex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      query.$or = [{ name: regex }, { phoneNumber: regex }, { notes: regex }];
    }

    if (tag) {
      query.tags = tag;
    }

    const contacts = await Contact.find(query)
      .sort({ name: 1 })
      .lean();

    res.json({ contacts });
  } catch (err) {
    logger.error({ err }, 'Error listing contacts');
    res.status(500).json({ error: 'Failed to retrieve contacts' });
  }
});

// POST /api/contacts (Create new contact)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { name, phone, notes, tags } = req.body;

    if (!phone) {
      res.status(400).json({ error: 'Phone number is required.' });
      return;
    }

    const phoneValidation = validateAndNormalizePhone(phone);
    if (!phoneValidation.isValid) {
      res.status(400).json({ error: phoneValidation.error });
      return;
    }

    let canonicalLid: string | undefined = undefined;
    let canonicalJid: string = phoneValidation.jid;
    try {
      const waContact = await resolveWhatsAppContact(userId.toString(), phoneValidation.digits);
      if (waContact) {
        if (waContact.lid) canonicalLid = waContact.lid;
        if (waContact.jid) canonicalJid = waContact.jid;
      }
    } catch {
      // Non-blocking
    }

    // Check if contact already exists
    let contact = await Contact.findOne({
      userId,
      $or: [
        { jid: canonicalJid },
        { phoneNumber: phoneValidation.e164 },
        ...(canonicalLid ? [{ lid: canonicalLid }] : [])
      ]
    });

    const contactName = name?.trim() || phoneValidation.e164;

    if (!contact) {
      contact = await Contact.create({
        userId,
        name: contactName,
        phoneNumber: phoneValidation.e164,
        jid: canonicalJid,
        lid: canonicalLid,
        notes: notes?.trim() || undefined,
        tags: Array.isArray(tags) ? tags : []
      });
    } else {
      contact.name = contactName;
      if (canonicalLid && !contact.lid) contact.lid = canonicalLid;
      if (notes !== undefined) contact.notes = notes?.trim() || undefined;
      if (Array.isArray(tags)) contact.tags = tags;
      await contact.save();
    }

    // Find or create linked Conversation
    let conversation = await Conversation.findOne({
      userId,
      $or: [
        { contactId: contact._id },
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
        name: contactName,
        unreadCount: 0,
        lastMessageTimestamp: new Date()
      });
    } else {
      conversation.contactId = contact._id;
      conversation.name = contactName;
      if (canonicalLid && !conversation.lid) conversation.lid = canonicalLid;
      await conversation.save();
    }

    res.status(201).json({
      contact,
      conversation
    });
  } catch (err: any) {
    logger.error({ err }, 'Error creating contact');
    res.status(400).json({ error: err.message || 'Failed to create contact' });
  }
});

// PUT /api/contacts/:id (Update contact)
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const contactId = req.params.id;
    const { name, notes, tags } = req.body;

    const contact = await Contact.findOne({ _id: contactId, userId });
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    if (name?.trim()) contact.name = name.trim();
    if (notes !== undefined) contact.notes = notes?.trim() || undefined;
    if (Array.isArray(tags)) contact.tags = tags;
    await contact.save();

    // Sync Conversation name
    await Conversation.updateMany(
      { userId, contactId: contact._id },
      { name: contact.name }
    );

    res.json({ contact });
  } catch (err: any) {
    logger.error({ err }, 'Error updating contact');
    res.status(400).json({ error: err.message || 'Failed to update contact' });
  }
});

// DELETE /api/contacts/:id (Delete contact)
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const contactId = req.params.id;

    const contact = await Contact.findOneAndDelete({ _id: contactId, userId });
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    // Unlink from Conversation
    await Conversation.updateMany(
      { userId, contactId: contact._id },
      { $unset: { contactId: '' } }
    );

    res.json({ message: 'Contact deleted successfully' });
  } catch (err: any) {
    logger.error({ err }, 'Error deleting contact');
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export const contactRoutes = router;
