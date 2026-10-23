const express = require('express');
const {
  getPublicFaqs,
  getAllFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
} = require('../controllers/faqController');

// TODO: use the SAME admin-auth middleware your admin stats/me routes use.
// Change this path and name to match yours (e.g. '../middleware/adminAuth').
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public: the Services page reads active FAQs from here
// GET /api/faqs
router.get('/', getPublicFaqs);


router.get('/admin', requireAdmin, getAllFaqs);
router.post('/', requireAdmin, createFaq);
router.put('/:id', requireAdmin, updateFaq);
router.delete('/:id', requireAdmin, deleteFaq);

module.exports = router;