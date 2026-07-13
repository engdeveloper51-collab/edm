const mysql = require('mysql2/promise');

const sqlTypes = {
  Int: 'Int',
  VarChar: 'VarChar',
  VarBinary: 'VarBinary',
  MAX: 'MAX'
};

function createConnectionPool(config) {
  const pool = mysql.createPool({
    host: config.host || process.env.DB_HOST || 'localhost',
    port: Number(config.port || process.env.DB_PORT || 3306),
    user: config.user || process.env.DB_USER || 'root',
    password: config.password || process.env.DB_PASSWORD || '',
    database: config.database || process.env.DB_DATABASE || 'db_dlaudo_erp',
    connectionLimit: Number(config.connectionLimit || process.env.DB_CONNECTION_LIMIT || 10),
    waitForConnections: true,
    charset: 'utf8mb4'
  });

  return {
    pool,
    async connect() {
      await pool.getConnection();
      return this;
    },
    async close() {
      await pool.end();
    },
    request() {
      return new Request(this.pool);
    }
  };
}

class Request {
  constructor(pool) {
    this.pool = pool;
    this.parameters = [];
  }

  input(name, type, value) {
    this.parameters.push({ name, type, value });
    return this;
  }

  async query(text) {
    return executeTranslatedQuery(this.pool, text, this.parameters);
  }
}

async function executeTranslatedQuery(pool, text, params = []) {
  const statements = splitSqlStatements(text);

  let lastResult = { recordset: [], rowsAffected: [0], output: {}, fields: [] };

  for (const statement of statements) {
    const { sql, values } = translateSqlServerQueryToMysql(statement, params);
    const [rows, fields] = await pool.execute(sql, values);

    if (Array.isArray(rows)) {
      lastResult = {
        recordset: rows,
        rowsAffected: [rows.affectedRows ?? rows.length ?? 0],
        output: {},
        fields
      };
    } else {
      lastResult = {
        recordset: rows ? [rows] : [],
        rowsAffected: [rows?.affectedRows ?? 0],
        output: {},
        fields
      };
    }
  }

  return lastResult;
}

function splitSqlStatements(text) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '\'' && !inDoubleQuote) {
      if (inSingleQuote && next === '\'') {
        current += "''";
        i += 1;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      current += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const lastStatement = current.trim();
  if (lastStatement) {
    statements.push(lastStatement);
  }

  return statements;
}

function translateSqlServerQueryToMysql(query, params = []) {
  let translated = query;
  translated = translated.replace(/ISNULL\s*\(/gi, 'IFNULL(');
  translated = translated.replace(/\bUPPER\s*\(/gi, 'UPPER(');
  translated = translated.replace(/\bLOWER\s*\(/gi, 'LOWER(');
  translated = translated.replace(/\bCONVERT\s*\(/gi, 'CONVERT(');
  translated = translated.replace(/SCOPE_IDENTITY\(\)/gi, 'LAST_INSERT_ID()');

  const values = [];
  for (const param of params) {
    if (param && param.name) {
      values.push(param.value);
    }
  }

  const paramPattern = /@([A-Za-z_][A-Za-z0-9_]*)/g;
  translated = translated.replace(paramPattern, () => '?');

  return { sql: translated, values };
}

async function queryWithParams(sqlText, params = []) {
  const pool = createConnectionPool({});
  const { sql, values } = translateSqlServerQueryToMysql(sqlText, params);
  const [rows] = await pool.pool.execute(sql, values);
  await pool.close();
  return rows;
}

const pool = createConnectionPool({});

module.exports = {
  ConnectionPool: createConnectionPool,
  pool,
  Int: sqlTypes.Int,
  VarChar: (length) => ({ type: 'VarChar', length }),
  VarBinary: (length) => ({ type: 'VarBinary', length }),
  MAX: sqlTypes.MAX,
  translateSqlServerQueryToMysql,
  queryWithParams,
  executeTranslatedQuery,
  splitSqlStatements
};
