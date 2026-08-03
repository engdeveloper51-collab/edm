function normalizeComponentUpdatePayload(body = {}) {
  const estado = typeof body.estado === 'string' ? body.estado.trim() : '';
  const rawUnidades = body.unidades ?? body.quantidade ?? null;
  const unidades = rawUnidades === '' || rawUnidades === null || rawUnidades === undefined
    ? null
    : String(rawUnidades).trim();

  return {
    estado,
    unidades
  };
}

module.exports = {
  normalizeComponentUpdatePayload
};
