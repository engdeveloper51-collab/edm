const { spawn, exec } = require('child_process');
const https = require('https');

const PORT = process.env.PORT || 3000;
const HEALTH_URL = `https://localhost:${PORT}/health`;

let serverProcess = null;

function checkHealth() {
  const req = https.request(HEALTH_URL, { method: 'GET', rejectUnauthorized: false, timeout: 2000 }, res => {
    if (res.statusCode === 200) {
      console.log(`\n✅ Servidor disponível em https://localhost:${PORT}`);
      openBrowser();
      clearInterval(interval);
    }
  });
  req.on('error', () => {});
  req.on('timeout', () => req.destroy());
  req.end();
}

// If server already running, just open browser. Otherwise spawn it.
function ensureServerAndOpen() {
  const req = https.request(HEALTH_URL, { method: 'GET', rejectUnauthorized: false, timeout: 2000 }, res => {
    if (res.statusCode === 200) {
      console.log('\nℹ️  Server already running. Opening browser...');
      openBrowser();
    } else {
      spawnServer();
    }
  });
  req.on('error', () => {
    // assume server not running
    spawnServer();
  });
  req.on('timeout', () => { req.destroy(); spawnServer(); });
  req.end();
}

function spawnServer() {
  serverProcess = spawn('node', ['server.js'], { stdio: 'inherit' });
  serverProcess.on('error', (err) => console.error('Erro ao iniciar processo do servidor:', err.message));
  serverProcess.on('exit', (code, sig) => {
    if (code !== 0) console.warn(`Servidor child saiu com código ${code} ${sig || ''}`);
  });
}

function openBrowser() {
  const url = `https://localhost:${PORT}`;
  let cmd;
  if (process.platform === 'win32') {
    cmd = `cmd /c start "" "${url}"`;
  } else if (process.platform === 'darwin') {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, (err) => {
    if (err) console.error('Falha ao abrir o navegador:', err.message);
  });
}

// Ensure server is running and poll health until ready
ensureServerAndOpen();
const interval = setInterval(checkHealth, 1000);

// Forward signals to child and exit gracefully
process.on('SIGINT', () => {
  if (serverProcess) serverProcess.kill('SIGINT');
  process.exit();
});

process.on('exit', () => {
  if (serverProcess) serverProcess.kill();
});
