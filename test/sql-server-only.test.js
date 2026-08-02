const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('does not ship mysql compatibility modules in the runtime', () => {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.equal(pkg.dependencies && pkg.dependencies.mysql2, undefined);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'db.js')), false);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'mysql-compat.js')), false);
});
