async function createAtivoRecord({ pool, payload, typeFactory = {}, includeCadastro = false }) {
  const Int = typeFactory.Int || 'Int';
  const VarChar = typeFactory.VarChar || ((length) => ({ type: 'VarChar', length }));
  const VarBinary = typeFactory.VarBinary || ((length) => ({ type: 'VarBinary', length }));
  const MAX = typeFactory.MAX || 8000;

  const ativoResult = await pool.request()
    .input('id_bairro', Int, payload.id_bairro)
    .input('id_tipo_poste', Int, payload.id_tipo_poste)
    .input('latitude', VarChar(50), payload.latitude)
    .input('longitude', VarChar(50), payload.longitude)
    .input('fonte_dados', VarChar(50), payload.fonte_dados)
    .input('imagem', VarBinary(MAX), payload.imagem)
    .query(`
      INSERT INTO geo_poste (id_bairro, id_tipo_poste, latitude, longitude, fonte_dados, imgem)
      VALUES (@id_bairro, @id_tipo_poste, @latitude, @longitude, @fonte_dados, @imagem);
      SELECT SCOPE_IDENTITY() as id;
    `);

  const ativoId = ativoResult.recordset[0].id;

  if (includeCadastro) {
    await pool.request()
      .input('id_bairro', Int, payload.id_bairro)
      .input('id_tipo_poste', Int, payload.id_tipo_poste)
      .input('latitude', VarChar(50), payload.latitude)
      .input('longitude', VarChar(50), payload.longitude)
      .input('fonte_dados', VarChar(50), payload.fonte_dados)
      .input('imagem', VarBinary(MAX), payload.imagem)
      .query(`
        INSERT INTO geo_postecadastro (id_bairro, id_tipo_poste, latitude, longitude, fonte_dados, imgem)
        VALUES (@id_bairro, @id_tipo_poste, @latitude, @longitude, @fonte_dados, @imagem);
      `);
  }

  return { id: ativoId };
}

async function createAtivoAndCadastro(options) {
  return createAtivoRecord({ ...options, includeCadastro: true });
}

module.exports = { createAtivoRecord, createAtivoAndCadastro };
