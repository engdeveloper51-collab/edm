const test = require('node:test');
const assert = require('node:assert/strict');
const { translateSqlServerQueryToMysql } = require('../mysql-compat');

test('translates SQL Server syntax to MySQL placeholders', () => {
  const { sql, values } = translateSqlServerQueryToMysql(
    "SELECT ISNULL(name, 'N/A') FROM users WHERE id = @id AND status = @status",
    [
      { name: 'id', value: 7 },
      { name: 'status', value: 'A' }
    ]
  );

  assert.equal(sql, "SELECT IFNULL(name, 'N/A') FROM users WHERE id = ? AND status = ?");
  assert.deepEqual(values, [7, 'A']);
});
