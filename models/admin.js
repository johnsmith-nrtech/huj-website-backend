const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

/**
 * Table: admins
 * Stores admin accounts. Only a bcrypt HASH of the password is saved, never the password itself.
 */
const Admin = sequelize.define(
  'Admin',
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(value) {
        this.setDataValue('email', String(value).trim().toLowerCase());
      },
    },
    passwordHash: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'password_hash',
    },
  },
  {
    tableName: 'admins',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Admin;