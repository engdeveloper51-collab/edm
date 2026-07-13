const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveServerMode } = require('../server-config');

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
