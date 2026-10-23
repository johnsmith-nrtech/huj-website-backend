const express = require('express');
const { submitContact, listContacts, replyToContact } = require('../controllers/contactController');

// TODO: use the same admin-auth middleware as faqRoutes.js
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/contact  (public: website forms)
router.post('/', submitContact);

// GET /api/contact/admin?page=1  (admin: messages, 10 per page, newest first)
router.get('/admin', requireAdmin, listContacts);

// POST /api/contact/:id/reply  (admin: reply to a message by email)
router.post('/:id/reply', requireAdmin, replyToContact);

module.exports = router;