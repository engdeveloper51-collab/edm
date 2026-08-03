require('dotenv').config();

const path = require('path');
const dbEngine = String(process.env.DB_ENGINE || 'mysql').toLowerCase();

async function main() {
  try {
    if (dbEngine === 'mssql') {
      const sql = require('mssql');
      const config = {
        server: process.env.DB_SERVER || 'localhost',
        database: process.env.DB_DATABASE || 'db_dlaudo_erp',
        authentication: {
          type: 'default',
          options: {
            userName: process.env.DB_USER || 'sa',
            password: process.env.DB_PASSWORD || '12345'
          }
        },
        options: {
          encrypt: String(process.env.DB_ENCRYPT || 'false').toLowerCase() === 'true',
          trustServerCertificate: String(process.env.DB_TRUST_CERT || 'true').toLowerCase() === 'true'
        }
      };

      const pool = new sql.ConnectionPool(config);
      await pool.connect();
      const sqlText = `SELECT TOP 200 * FROM geo_poste ORDER BY id`;
      const result = await pool.request().query(sqlText);
      console.log(JSON.stringify(result.recordset || [], null, 2));
      await pool.close();
      return;
    }

    // MySQL path (uses mysql-compat to match server behavior)
    const mysqlCompat = require('./mysql-compat');
    const config = {
      host: process.env.DB_SERVER || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'edm_user',
      password: process.env.DB_PASSWORD || 'EdmPass!123',
      database: process.env.DB_DATABASE || 'db_dlaudo_erp',
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      charset: 'utf8mb4'
    };

    const pool = new mysqlCompat.ConnectionPool(config);
    await pool.connect();
    const sqlText = `SELECT * FROM geo_poste ORDER BY id LIMIT 200`;
    const result = await pool.request().query(sqlText);
    console.log(JSON.stringify(result.recordset || [], null, 2));
    await pool.end && pool.end();
  } catch (err) {
    console.error('Erro ao listar geo_poste:', err && err.message ? err.message : err);
    process.exitCode = 2;
  }
}

main();
