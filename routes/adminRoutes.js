const express = require('express');
const { getStats } = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Everything in this file needs an admin login
router.use(requireAdmin);

router.get('/stats', getStats);

module.exports = router;