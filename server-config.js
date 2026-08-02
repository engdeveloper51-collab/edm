function resolveServerMode({ env = process.env, sslOptions = null } = {}) {
  const forceHttps = env.USE_HTTPS === 'true' || env.USE_HTTPS === '1';
  const useHttps = Boolean(forceHttps && sslOptions);

  return {
    useHttps,
    protocol: useHttps ? 'https' : 'http'
  };
}

function resolveDatabaseEngine({ env = process.env } = {}) {
  const engine = String(env.DB_ENGINE || env.DB_TYPE || 'mysql').toLowerCase();

  if (engine === 'mssql' || engine === 'sqlserver') {
    return 'mssql';
  }

  return 'mysql';
}

module.exports = {
  resolveServerMode,
  resolveDatabaseEngine
};
