const Contact = require('../models/contact');
const {
  sendContactNotification,
  sendContactConfirmation,
  sendContactReply,
} = require('../utils/email');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SOURCES = ['contact', 'services', 'home'];
const ADMIN_PAGE_SIZE = 10; 


/** POST /api/contact */
async function submitContact(req, res) {
  try {
    const body = req.body || {};

    // Hidden spam-trap field: real people never fill it. Pretend success, save nothing.
    if (body.website) {
      return res.status(201).json({ success: true, message: 'Message received.' });
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const message = String(body.message || '').trim();
    const source = VALID_SOURCES.includes(body.source) ? body.source : 'contact';

    // ---- Validation ----
    const errors = {};

    if (name.length > 100) errors.name = 'Name must be 100 characters or less.';

    if (!email) errors.email = 'Email is required.';
    else if (email.length > 254 || !EMAIL_REGEX.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    // The home-page form has an optional message; the other two require one
    if (source !== 'home' && message.length < 10) {
      errors.message = 'Message must be at least 10 characters.';
    }
    if (message.length > 2000) errors.message = 'Message must be 2000 characters or less.';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please check the form and try again.',
        errors,
      });
    }

    // ---- Save ----
    const contact = await Contact.create({ name: name || null, email, message, source });

    // ---- Emails: notify info@ + confirm to the visitor ----
    // The message is already saved, so an email problem never fails the form.
    await Promise.allSettled([sendContactNotification(contact), sendContactConfirmation(contact)]);

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been sent.',
    });
  } catch (err) {
    // Sequelize's own validation (e.g. bad email) -> tell the user, not "server error"
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: err.errors?.[0]?.message || 'Please check the form and try again.',
      });
    }

    console.error('submitContact failed:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong on our side. Please try again later.',
    });
  }
}

/** GET /api/contact/admin?page=1  (admin: newest first, 10 per page) */
async function listContacts(req, res) {
  try {
    const total = await Contact.count();
    const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

    // Bad or too-high page numbers fall back to a real page
    let page = Number.parseInt(req.query.page, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const messages = await Contact.findAll({
      order: [
        ['created_at', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: ADMIN_PAGE_SIZE,
      offset: (page - 1) * ADMIN_PAGE_SIZE,
    });

    return res.json({
      success: true,
      messages,
      pagination: { page, perPage: ADMIN_PAGE_SIZE, total, totalPages },
    });
  } catch (err) {
    console.error('listContacts failed:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong on our side. Please try again later.',
    });
  }
}

/** POST /api/contact/:id/reply  (admin: email a reply to the visitor) */
async function replyToContact(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid message id.' });
    }

    const reply = String(req.body?.reply || '').trim();
    if (reply.length < 2) {
      return res.status(400).json({ success: false, message: 'Please write a reply.' });
    }
    if (reply.length > 5000) {
      return res.status(400).json({ success: false, message: 'Reply must be 5000 characters or less.' });
    }

    const contact = await Contact.findByPk(id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    const result = await sendContactReply(contact, reply);
    if (!result.ok) {
      return res.status(502).json({
        success: false,
        message: 'The reply could not be sent. Please try again later.',
      });
    }

    await contact.update({ reply_message: reply, replied_at: new Date() });

    return res.json({
      success: true,
      message: `Reply sent to ${contact.email}.`,
      replied_at: contact.replied_at,
    });
  } catch (err) {
    console.error('replyToContact failed:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong on our side. Please try again later.',
    });
  }
}

module.exports = { submitContact, listContacts, replyToContact };