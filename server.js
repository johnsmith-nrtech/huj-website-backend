require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { testConnection, initDatabase } = require('./utils/database');
const contactRoutes = require('./routes/contactRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const faqRoutes = require('./routes/faqRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const pageImageRoutes = require('./routes/pageImageRoutes');


// The admin login signs its cookie with this secret, so refuse to start without it
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing in .env, stopping.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Allow the Next.js frontend (localhost for now)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL, // your live site once deployed
].filter(Boolean);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: '10kb' })); // contact messages are small
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({ message: 'hujj-backend is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Confirms the database credentials work
app.get('/health/db', async (req, res) => {
  try {
    const time = await testConnection();
    res.json({ status: 'ok', database: 'connected', time });
  } catch (err) {
    console.error('DB health check failed:', err.message);
    res.status(500).json({ status: 'error', database: 'not connected' });
  }
});

// ---- API routes ----
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/page-images', pageImageRoutes);
app.use('/api/services', serviceRoutes);

// ---- 404 + error handlers (always answer with JSON) ----
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  // e.g. malformed JSON sent by a client
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 400 ? 'Invalid request body' : 'Server error',
  });
});

app.listen(PORT, async () => {
  console.log(`server running on http://localhost:${PORT}`);

  try {
    await testConnection();
    await initDatabase();
    console.log('Database connected and tables are ready');
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }
});