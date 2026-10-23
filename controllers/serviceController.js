const Service = require('../models/service');

const PER_PAGE = 9; // cards per page on the website
const ICON_REGEX = /^[A-Za-z0-9]{1,50}$/; // lucide icon names, e.g. 'FlaskConical'

// Order used everywhere: by sort_order, then oldest first
const ORDER = [
  ['sort_order', 'ASC'],
  ['id', 'ASC'],
];

/** Cleans and validates the body sent by the admin Services form. */
function validateService(body = {}) {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const icon = String(body.icon || '').trim() || 'Briefcase';
  const rawOrder = body.sort_order;
  const sortOrder = rawOrder === undefined || rawOrder === '' ? 0 : Number(rawOrder);
  const isActive = body.is_active === undefined ? true : Boolean(body.is_active);

  const errors = {};

  if (title.length < 3) errors.title = 'Title must be at least 3 characters.';
  else if (title.length > 150) errors.title = 'Title must be 150 characters or less.';

  if (description.length < 10) errors.description = 'Description must be at least 10 characters.';
  else if (description.length > 1000) errors.description = 'Description must be 1000 characters or less.';

  if (!ICON_REGEX.test(icon)) errors.icon = 'Please choose a valid icon.';

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    errors.sort_order = 'Order must be 0 or a positive whole number.';
  }

  return {
    errors,
    data: { title, description, icon, sort_order: sortOrder, is_active: isActive },
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

/** Finds a service by the :id in the URL, or sends 400/404. */
async function findServiceOr404(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: 'Invalid service id.' });
    return null;
  }

  const service = await Service.findByPk(id);
  if (!service) {
    res.status(404).json({ success: false, message: 'Service not found.' });
    return null;
  }
  return service;
}

/** GET /api/services?page=1  (public: active services, 9 per page) */
async function getPublicServices(req, res) {
  try {
    const where = { is_active: true };
    const total = await Service.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    // Bad or too-high page numbers fall back to a real page
    let page = Number.parseInt(req.query.page, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const services = await Service.findAll({
      where,
      attributes: ['id', 'title', 'description', 'icon', 'sort_order'],
      order: ORDER,
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
    });

    return res.json({
      success: true,
      services,
      pagination: { page, perPage: PER_PAGE, total, totalPages },
    });
  } catch (err) {
    return handleError(res, err, 'getPublicServices');
  }
}

/** GET /api/services/admin  (admin: all services, including hidden ones) */
async function getAllServices(req, res) {
  try {
    const services = await Service.findAll({ order: ORDER });
    return res.json({ success: true, services });
  } catch (err) {
    return handleError(res, err, 'getAllServices');
  }
}

/** POST /api/services  (admin) */
async function createService(req, res) {
  try {
    const { errors, data } = validateService(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please check the form and try again.',
        errors,
      });
    }

    const service = await Service.create(data);
    return res.status(201).json({ success: true, message: 'Service added.', service });
  } catch (err) {
    return handleError(res, err, 'createService');
  }
}

/** PUT /api/services/:id  (admin) */
async function updateService(req, res) {
  try {
    const service = await findServiceOr404(req, res);
    if (!service) return;

    const { errors, data } = validateService(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please check the form and try again.',
        errors,
      });
    }

    await service.update(data);
    return res.json({ success: true, message: 'Service updated.', service });
  } catch (err) {
    return handleError(res, err, 'updateService');
  }
}

/** DELETE /api/services/:id  (admin) */
async function deleteService(req, res) {
  try {
    const service = await findServiceOr404(req, res);
    if (!service) return;

    await service.destroy();
    return res.json({ success: true, message: 'Service deleted.' });
  } catch (err) {
    return handleError(res, err, 'deleteService');
  }
}

module.exports = {
  getPublicServices,
  getAllServices,
  createService,
  updateService,
  deleteService,
};