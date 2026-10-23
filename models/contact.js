const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

/**
 * Table: contact_messages
 * One row per message sent from the Contact page, Services page or Home page form.
 */
const ContactMessage = sequelize.define(
  'ContactMessage',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      validate: {
        isEmail: { msg: 'Please enter a valid email address.' },
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '', // the Home form's message is optional
    },
    source: {
      type: DataTypes.STRING(20), // 'contact' | 'services' | 'home'
      allowNull: true,
      validate: {
        isIn: {
          args: [['contact', 'services', 'home']],
          msg: 'Unknown form source.',
        },
      },
    },
    reply_message: {
      type: DataTypes.TEXT, // last reply sent from the admin panel
      allowNull: true,
    },
    replied_at: {
      type: DataTypes.DATE, // when that reply was sent
      allowNull: true,
    },
  },
  {
    tableName: 'contact_messages',
    timestamps: true,
    createdAt: 'created_at', // keeps the column name created_at
    updatedAt: false, // messages are never edited
  }
);

module.exports = ContactMessage;