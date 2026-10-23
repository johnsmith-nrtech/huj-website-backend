const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const { COOKIE_NAME } = require('../middleware/auth');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Used so a wrong email takes the same time as a wrong password
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const cookieOptions = () => ({
  httpOnly: true, // JavaScript in the browser cannot read this cookie
  secure: process.env.NODE_ENV === 'production', // HTTPS only when live
  sameSite: 'lax',
  path: '/',
});

/** POST /api/auth/login */
async function login(req, res) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ where: { email } });
    const passwordOk = await bcrypt.compare(password, admin ? admin.passwordHash : DUMMY_HASH);

    if (!admin || !passwordOk) {
      // Same message for both cases, so attackers can't tell which emails exist
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: ONE_DAY_MS });
    return res.json({ success: true, admin: { email: admin.email } });
  } catch (err) {
    console.error('login failed:', err.message);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
}

/** POST /api/auth/logout */
function logout(req, res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  return res.json({ success: true });
}

/** GET /api/auth/me  (requires login) */
function me(req, res) {
  return res.json({ success: true, admin: { email: req.admin.email } });
}

module.exports = { login, logout, me };