const express = require('express');
const {
  getPublicServices,
  getAllServices,
  createService,
  updateService,
  deleteService,
} = require('../controllers/serviceController');

// TODO: use the same admin-auth middleware as faqRoutes.js
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public: the Services page reads active services from here
// GET /api/services?page=1   (9 per page)
router.get('/', getPublicServices);
router.get('/admin', requireAdmin, getAllServices);
router.post('/', requireAdmin, createService);
router.put('/:id', requireAdmin, updateService);
router.delete('/:id', requireAdmin, deleteService);

module.exports = router;