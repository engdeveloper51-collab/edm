const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeComponentUpdatePayload } = require('../component-update-utils');

test('normaliza estado e unidades para o payload de atualização', () => {
  const payload = normalizeComponentUpdatePayload({ estado: 'Danificado', unidades: '5' });

  assert.equal(payload.estado, 'Danificado');
  assert.equal(payload.unidades, '5');
});

test('aceita quantidade como alias de unidades e converte vazio para null', () => {
  const payload = normalizeComponentUpdatePayload({ estado: 'Bom', quantidade: '' });

  assert.equal(payload.estado, 'Bom');
  assert.equal(payload.unidades, null);
});
