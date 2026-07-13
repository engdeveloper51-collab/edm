const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'edm_user',
  password: process.env.DB_PASSWORD || 'edm_pass',
  database: process.env.DB_DATABASE || 'db_dlaudo_erp',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  charset: 'utf8mb4'
};

const pool = mysql.createPool(config);

module.exports = pool;
