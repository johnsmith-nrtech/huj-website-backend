require('dotenv').config();
const { Sequelize } = require('sequelize');

/**
 * One shared Sequelize instance for the whole app.
 * Credentials come from .env (separate values, so special characters in the
 * password never need to be percent-encoded).
 */
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    // Set DB_LOGGING=true in .env if you want to see every SQL query in the console
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    dialectOptions:
      // Supabase requires SSL
      process.env.DB_SSL === 'false'
        ? {}
        : { ssl: { require: true, rejectUnauthorized: false } },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000, // ms to wait for a free connection
      idle: 10000, // ms before an unused connection is closed
    },
  }
);

/** Checks the credentials work. Used at startup and by /health/db */
async function testConnection() {
  await sequelize.authenticate();
  return new Date().toISOString();
}

/**
 * Creates any missing tables from the Sequelize models (safe to run many times).
 * It never changes or deletes a table that already exists.
 */
async function initDatabase() {
  // Load every model first so sync() knows about it
  require('../models/contact');
  require('../models/admin');
  await sequelize.sync();
}

module.exports = { sequelize, testConnection, initDatabase };