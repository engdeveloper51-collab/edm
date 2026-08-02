const test = require('node:test');
const assert = require('node:assert/strict');
const { createAtivoAndCadastro } = require('../active-creation');

test('creates a standard ativo and a cadastro record from the same payload', async () => {
  const calls = [];
  const pool = {
    request() {
      return {
        input(name, type, value) {
          this._inputs ||= [];
          this._inputs.push({ name, type, value });
          return this;
        },
        async query(sql) {
          calls.push({ sql, inputs: this._inputs || [] });

          if (sql.includes('INSERT INTO geo_poste')) {
            return { recordset: [{ id: 77 }] };
          }

          return { recordset: [{ id: 1 }] };
        }
      };
    }
  };

  const result = await createAtivoAndCadastro({
    pool,
    payload: {
      id_bairro: 3,
      id_tipo_poste: 4,
      latitude: '10,5',
      longitude: '-20,3',
      fonte_dados: 'ABC123',
      imagem: Buffer.from('img')
    }
  });

  assert.equal(result.id, 77);
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /INSERT INTO geo_poste/);
  assert.match(calls[1].sql, /INSERT INTO geo_postecadastro/);
  assert.equal(calls[1].inputs.some(input => input.name === 'id_bairro'), true);
  assert.equal(calls[1].inputs.some(input => input.name === 'id'), false);
});
