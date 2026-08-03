const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveServerMode, resolveDatabaseEngine, resolveColumnIdentifier } = require('../server-config');

test('defaults to HTTP when HTTPS is not explicitly enabled', () => {
  const result = resolveServerMode({
    env: {},
    sslOptions: { key: 'dummy-key', cert: 'dummy-cert' }
  });

  assert.equal(result.protocol, 'http');
  assert.equal(result.useHttps, false);
});

test('uses HTTPS when explicitly enabled and certificates are available', () => {
  const result = resolveServerMode({
    env: { USE_HTTPS: 'true' },
    sslOptions: { key: 'dummy-key', cert: 'dummy-cert' }
  });

  assert.equal(result.protocol, 'https');
  assert.equal(result.useHttps, true);
});

test('defaults to SQL Server in local development when DB_ENGINE is not provided', () => {
  const result = resolveDatabaseEngine({
    env: {},
    nodeEnv: 'development'
  });

  assert.equal(result, 'mssql');
});

test('uses SQL Server brackets and MySQL backticks for reserved column names', () => {
  assert.equal(resolveColumnIdentifier('long', 'mssql'), '[long]');
  assert.equal(resolveColumnIdentifier('long', 'mysql'), '`long`');
});
