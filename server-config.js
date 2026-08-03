function resolveServerMode({ env = process.env, sslOptions = null } = {}) {
  const forceHttps = env.USE_HTTPS === 'true' || env.USE_HTTPS === '1';
  const useHttps = Boolean(forceHttps && sslOptions);

  return {
    useHttps,
    protocol: useHttps ? 'https' : 'http'
  };
}

function resolveDatabaseEngine({ env = process.env, nodeEnv = process.env.NODE_ENV || 'development' } = {}) {
  const explicitEngine = String(env.DB_ENGINE || '').trim().toLowerCase();
  if (explicitEngine) {
    return explicitEngine;
  }

  return nodeEnv === 'production' ? 'mysql' : 'mssql';
}

module.exports = {
  resolveServerMode,
  resolveDatabaseEngine
};
