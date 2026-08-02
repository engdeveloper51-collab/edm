const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('o formulário de cadastro usa o endpoint principal de ativos', () => {
  const filePath = path.join(__dirname, '..', 'Paginas', 'cadastro.html');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.match(content, /fetch\(`\$\{API_URL\}\/activos`,/);
  assert.doesNotMatch(content, /fetch\(`\$\{API_URL\}\/cadastro-activos`,/);
});
