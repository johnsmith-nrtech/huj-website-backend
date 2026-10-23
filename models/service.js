const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

/**
 * Table: services
 * One row per card in the "What We Do" section of the Services page.
 * Managed from the admin panel (/admin/services).
 */
const Service = sequelize.define(
  'Service',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Title is required.' },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Description is required.' },
      },
    },
    icon: {
      type: DataTypes.STRING(50), // lucide-react icon name, e.g. 'FlaskConical'
      allowNull: false,
      defaultValue: 'Briefcase',
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
    tableName: 'services',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Service;