const Faq = require('../models/faq');

// Order used everywhere: by sort_order, then oldest first
const ORDER = [
  ['sort_order', 'ASC'],
  ['id', 'ASC'],
];

/** Cleans and validates the body sent by the admin FAQ form. */
function validateFaq(body = {}) {
  const question = String(body.question || '').trim();
  const answer = String(body.answer || '').trim();
  const rawOrder = body.sort_order;
  const sortOrder = rawOrder === undefined || rawOrder === '' ? 0 : Number(rawOrder);
  const isActive = body.is_active === undefined ? true : Boolean(body.is_active);

  const errors = {};

  if (question.length < 5) errors.question = 'Question must be at least 5 characters.';
  else if (question.length > 300) errors.question = 'Question must be 300 characters or less.';

  if (answer.length < 5) errors.answer = 'Answer must be at least 5 characters.';
  else if (answer.length > 5000) errors.answer = 'Answer must be 5000 characters or less.';

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    errors.sort_order = 'Order must be 0 or a positive whole number.';
  }

  return {
    errors,
    data: { question, answer, sort_order: sortOrder, is_active: isActive },
  };
}

/** Shared error response (same style as contactController). */
function handleError(res, err, where) {
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: err.errors?.[0]?.message || 'Please check the form and try again.',
    });
  }

  console.error(`${where} failed:`, err.message);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong on our side. Please try again later.',
  });
}

/** Finds an FAQ by the :id in the URL, or sends 404. */
async function findFaqOr404(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: 'Invalid FAQ id.' });
    return null;
  }

  const faq = await Faq.findByPk(id);
  if (!faq) {
    res.status(404).json({ success: false, message: 'FAQ not found.' });
    return null;
  }
  return faq;
}

/** GET /api/faqs  (public: only active FAQs, for the website) */
async function getPublicFaqs(req, res) {
  try {
    const faqs = await Faq.findAll({
      where: { is_active: true },
      attributes: ['id', 'question', 'answer', 'sort_order'],
      order: ORDER,
    });
    return res.json({ success: true, faqs });
  } catch (err) {
    return handleError(res, err, 'getPublicFaqs');
  }
}

/** GET /api/faqs/admin  (admin: all FAQs, including hidden ones) */
async function getAllFaqs(req, res) {
  try {
    const faqs = await Faq.findAll({ order: ORDER });
    return res.json({ success: true, faqs });
  } catch (err) {
    return handleError(res, err, 'getAllFaqs');
  }
}

/** POST /api/faqs  (admin) */
async function createFaq(req, res) {
  try {
    const { errors, data } = validateFaq(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please check the form and try again.',
        errors,
      });
    }

    const faq = await Faq.create(data);
    return res.status(201).json({ success: true, message: 'FAQ added.', faq });
  } catch (err) {
    return handleError(res, err, 'createFaq');
  }
}

/** PUT /api/faqs/:id  (admin) */
async function updateFaq(req, res) {
  try {
    const faq = await findFaqOr404(req, res);
    if (!faq) return;

    const { errors, data } = validateFaq(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please check the form and try again.',
        errors,
      });
    }

    await faq.update(data);
    return res.json({ success: true, message: 'FAQ updated.', faq });
  } catch (err) {
    return handleError(res, err, 'updateFaq');
  }
}

/** DELETE /api/faqs/:id  (admin) */
async function deleteFaq(req, res) {
  try {
    const faq = await findFaqOr404(req, res);
    if (!faq) return;

    await faq.destroy();
    return res.json({ success: true, message: 'FAQ deleted.' });
  } catch (err) {
    return handleError(res, err, 'deleteFaq');
  }
}

module.exports = { getPublicFaqs, getAllFaqs, createFaq, updateFaq, deleteFaq };