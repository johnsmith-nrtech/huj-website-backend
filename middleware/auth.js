const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'admin_token';

/** Blocks the request unless a valid admin login cookie is present. */
function requireAdmin(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not logged in.' });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
}

module.exports = { requireAdmin, COOKIE_NAME };