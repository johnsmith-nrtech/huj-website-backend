const fs = require('fs');
const path = require('path');
const PageImage = require('../models/pageImage');

// Image slots the admin is allowed to change.
// Must match the `slot` values in the frontend's src/lib/serviceImages.ts
const VALID_SLOTS = [
  'home_hero',
  'about_main',
  'services_qms',
  'services_regulatory',
  'services_digital',
  'services_get_in_touch',
];

// Uploaded files are saved here and served at /uploads/page-images/...
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'page-images');
const PUBLIC_PREFIX = '/uploads/page-images/';

/** Deletes an uploaded file from disk (only inside our upload folder). */
function removeFile(imagePath) {
  if (!imagePath || !imagePath.startsWith(PUBLIC_PREFIX)) return;
  const fileName = path.basename(imagePath);
  fs.promises.unlink(path.join(UPLOAD_DIR, fileName)).catch(() => {});
}

/** Middleware: rejects unknown slots before anything is uploaded. */
function checkSlot(req, res, next) {
  if (!VALID_SLOTS.includes(req.params.slot)) {
    return res.status(400).json({ success: false, message: 'Unknown image slot.' });
  }
  return next();
}

/** GET /api/page-images  (public: { slot: imagePath } for replaced images only) */
async function getPageImages(req, res) {
  try {
    const rows = await PageImage.findAll({ attributes: ['slot', 'image_path'] });
    const images = {};
    rows.forEach((r) => {
      images[r.slot] = r.image_path;
    });
    return res.json({ success: true, images });
  } catch (err) {
    console.error('getPageImages failed:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong on our side. Please try again later.',
    });
  }
}

/** POST /api/page-images/:slot  (admin, multipart field "image") */
async function uploadPageImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please choose an image to upload.' });
    }

    const { slot } = req.params;
    const imagePath = `${PUBLIC_PREFIX}${req.file.filename}`;

    const existing = await PageImage.findOne({ where: { slot } });
    if (existing) {
      const oldPath = existing.image_path;
      await existing.update({ image_path: imagePath });
      removeFile(oldPath); // old upload no longer needed
    } else {
      await PageImage.create({ slot, image_path: imagePath });
    }

    return res.status(201).json({
      success: true,
      message: 'Image updated.',
      slot,
      image_path: imagePath,
    });
  } catch (err) {
    if (req.file) removeFile(`${PUBLIC_PREFIX}${req.file.filename}`);
    console.error('uploadPageImage failed:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong on our side. Please try again later.',
    });
  }
}

/** DELETE /api/page-images/:slot  (admin: back to the default image) */
async function resetPageImage(req, res) {
  try {
    const existing = await PageImage.findOne({ where: { slot: req.params.slot } });
    if (existing) {
      const oldPath = existing.image_path;
      await existing.destroy();
      removeFile(oldPath);
    }
    return res.json({ success: true, message: 'Image reset to default.' });
  } catch (err) {
    console.error('resetPageImage failed:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong on our side. Please try again later.',
    });
  }
}

module.exports = {
  UPLOAD_DIR,
  checkSlot,
  getPageImages,
  uploadPageImage,
  resetPageImage,
};