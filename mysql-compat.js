const mysql = require('mysql2/promise');

function translateSqlServerQueryToMysql(query, params = []) {
  let sql = query;
  const values = [];

  sql = sql.replace(/\bISNULL\s*\(([^,]+),\s*([^\)]+)\)/gi, 'IFNULL($1, $2)');
  sql = sql.replace(/\bSCOPE_IDENTITY\s*\(\s*\)/gi, 'LAST_INSERT_ID()');
  sql = sql.replace(/@([A-Za-z0-9_]+)/g, (match, name) => {
    const param = params.find((entry) => entry.name === name);
    if (!param) {
      throw new Error(`Missing parameter ${name}`);
    }
    values.push(param.value);
    return '?';
  });

  return { sql, values };
}

function normalizeMysqlResult(rows) {
  if (Array.isArray(rows)) {
    const lastItem = rows[rows.length - 1];

    if (Array.isArray(lastItem)) {
      const affected = rows.find((item) => item && item.affectedRows !== undefined);
      return {
        recordset: lastItem,
        rowsAffected: affected ? [affected.affectedRows] : undefined,
        insertId: affected && typeof affected.insertId === 'number' ? affected.insertId : undefined
      };
    }

    if (lastItem && typeof lastItem.affectedRows === 'number') {
      return {
        recordset: [],
        rowsAffected: [lastItem.affectedRows],
        insertId: typeof lastItem.insertId === 'number' ? lastItem.insertId : undefined
      };
    }

    return {
      recordset: rows,
      rowsAffected: undefined,
      insertId: undefined
    };
  }

  return {
    recordset: [],
    rowsAffected: typeof rows.affectedRows === 'number' ? [rows.affectedRows] : undefined,
    insertId: typeof rows.insertId === 'number' ? rows.insertId : undefined
  };
}

async function executeTranslatedQuery(pool, sqlText, params = []) {
  const { sql, values } = translateSqlServerQueryToMysql(sqlText, params);
  const [rows] = await pool.execute(sql, values);
  return normalizeMysqlResult(rows);
}

class ConnectionPool {
  constructor(config) {
    this.config = config;
    this.pool = mysql.createPool({
      host: config.host || '127.0.0.1',
      port: config.port || 3306,
      user: config.user || 'edm_user',
      password: config.password || 'EdmPass!123',
      database: config.database || 'db_dlaudo_erp',
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4',
      multipleStatements: true
    });
  }

  async connect() {
    await this.pool.query('SELECT 1');
    return this;
  }

  async close() {
    await this.pool.end();
  }

  request() {
    return {
      input(name, type, value) {
        this._params = this._params || [];
        this._params.push({ name, value });
        return this;
      },
      async query(sqlText) {
        const { sql, values } = translateSqlServerQueryToMysql(sqlText, this._params || []);
        const [rows] = await this._pool.query(sql, values);
        return normalizeMysqlResult(rows);
      },
      _pool: this.pool
    };
  }
}

const Int = (value) => value;
const VarChar = (length) => (value) => value;
const VarBinary = (length) => (value) => value;
const MAX = Number.MAX_SAFE_INTEGER;

module.exports = {
  ConnectionPool,
  Int,
  VarChar,
  VarBinary,
  MAX,
  translateSqlServerQueryToMysql,
  executeTranslatedQuery
};
