const https = require('https');

const data = JSON.stringify({ username: 'grandal', password: '123' });
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  },
  rejectUnauthorized: false
};

const req = https.request(options, (res) => {
  console.log('statusCode=', res.statusCode);
  console.log('headers=', res.headers);
  res.on('data', (chunk) => {
    process.stdout.write(chunk.toString());
  });
});

req.on('error', (error) => {
  console.error('ERROR:', error.message);
});

req.write(data);
req.end();
