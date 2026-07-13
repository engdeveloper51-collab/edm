const test = require('node:test');
const assert = require('node:assert/strict');
const { translateSqlServerQueryToMysql, executeTranslatedQuery } = require('../mysql-compat');

test('translates SQL Server parameters and ISNULL to MySQL syntax', () => {
  const { sql, values } = translateSqlServerQueryToMysql(
    'SELECT ISNULL(name, \'N/A\') FROM users WHERE id = @id AND status = @status',
    [
      { name: 'id', value: 7 },
      { name: 'status', value: 'A' }
    ]
  );

  assert.equal(sql, 'SELECT IFNULL(name, \'N/A\') FROM users WHERE id = ? AND status = ?');
  assert.deepEqual(values, [7, 'A']);
});

test('exposes an mssql-like request API for server compatibility', () => {
  const { ConnectionPool, Int, VarChar, VarBinary, MAX } = require('../mysql-compat');

  const pool = new ConnectionPool({ host: 'localhost' });
  const request = pool.request();

  request.input('id', Int, 7);
  request.input('name', VarChar(50), 'Ana');
  request.input('image', VarBinary(MAX), Buffer.from('x'));

  assert.equal(typeof request.input, 'function');
  assert.equal(typeof request.query, 'function');
  assert.equal(typeof pool.connect, 'function');
  assert.equal(typeof pool.close, 'function');
});

test('executes multi-statement SQL and returns the last result', async () => {
  const calls = [];
  const pool = {
    async execute(sql, values) {
      calls.push({ sql, values });
      return [[{ id: 42 }]];
    }
  };

  const result = await executeTranslatedQuery(pool, 'INSERT INTO users (name) VALUES (\'Ana\'); SELECT LAST_INSERT_ID() as id;', []);

  assert.deepEqual(calls.map(({ sql }) => sql), ['INSERT INTO users (name) VALUES (\'Ana\')', 'SELECT LAST_INSERT_ID() as id']);
  assert.deepEqual(result.recordset, [{ id: 42 }]);
});
