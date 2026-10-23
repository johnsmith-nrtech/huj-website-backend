const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

/**
 * Table: faqs
 * One row per question shown in the "Common Questions" section of the Services page.
 * Managed from the admin panel (/admin/faq).
 */
const Faq = sequelize.define(
  'Faq',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    question: {
      type: DataTypes.STRING(300),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Question is required.' },
      },
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Answer is required.' },
      },
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0, // lower number = shown first
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true, // false = hidden from the website, kept in admin
    },
  },
  {
    tableName: 'faqs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at', // FAQs can be edited, so keep this one
  }
);

module.exports = Faq;