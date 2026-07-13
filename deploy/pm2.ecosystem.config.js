module.exports = {
  apps: [
    {
      name: 'edm',
      script: 'server.js',
      cwd: '/var/www/edm',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        USE_HTTPS: 'false'
      }
    }
  ]
}
