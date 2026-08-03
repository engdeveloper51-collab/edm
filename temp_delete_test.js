const https = require('https');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '212.227.165.26',
      port: 443,
      path,
      method,
      rejectUnauthorized: false,
      headers: {
        'Accept': 'application/json'
      }
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let response = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => response += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: response, headers: res.headers }));
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const id = 15;
    const delResult = await request('DELETE', `/api/tipos-activos/${id}`);
    console.log('DELETE', delResult.status);
    console.log(delResult.body);
  } catch (error) {
    console.error('ERROR', error);
  }
})();
