const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('keeps the MySQL compatibility module available for the VPS runtime', () => {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.equal(pkg.dependencies && pkg.dependencies.mysql2, '^3.3.0');
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'mysql-compat.js')), true);
});
