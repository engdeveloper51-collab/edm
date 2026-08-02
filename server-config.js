function resolveServerMode({ env = process.env, sslOptions = null } = {}) {
  const forceHttps = env.USE_HTTPS === 'true' || env.USE_HTTPS === '1';
  const useHttps = Boolean(forceHttps && sslOptions);

  return {
    useHttps,
    protocol: useHttps ? 'https' : 'http'
  };
}

module.exports = {
  resolveServerMode
};
