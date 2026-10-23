const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

/**
 * Table: page_images
 * One row per image the admin has REPLACED.
 * No row for a slot = the website shows its default image.
 */
const PageImage = sequelize.define(
  'PageImage',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    slot: {
      type: DataTypes.STRING(50), // e.g. 'services_qms'
      allowNull: false,
      unique: true,
    },
    image_path: {
      type: DataTypes.STRING(255), // e.g. '/uploads/page-images/services_qms-1729500000000.jpg'
      allowNull: false,
    },
  },
  {
    tableName: 'page_images',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = PageImage;