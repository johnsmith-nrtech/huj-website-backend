const fs = require('fs');
const express = require('express');
const multer = require('multer');
const {
  UPLOAD_DIR,
  checkSlot,
  getPageImages,
  uploadPageImage,
  resetPageImage,
} = require('../controllers/pageImageController');

// TODO: use the same admin-auth middleware as faqRoutes.js
const { requireAdmin } = require('../middleware/auth');

// Make sure the upload folder exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    // e.g. services_qms-1729500000000.jpg (new name every time, so browsers never show a cached old image)
    filename: (req, file, cb) => cb(null, `${req.params.slot}-${Date.now()}${ALLOWED_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    return cb(new Error('Only JPG, PNG or WebP images are allowed.'));
  },
});

/** Runs multer and turns its errors into a normal JSON response. */
function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : err.message || 'Upload failed.';
    return res.status(400).json({ success: false, message });
  });
}

const router = express.Router();

// Public: the Services page reads replaced images from here
// GET /api/page-images
router.get('/', getPageImages);

// Admin only
// POST   /api/page-images/:slot  -> upload a new image (form field "image")
// DELETE /api/page-images/:slot  -> go back to the default image
router.post('/:slot', requireAdmin, checkSlot, handleUpload, uploadPageImage);
router.delete('/:slot', requireAdmin, checkSlot, resetPageImage);

module.exports = router;