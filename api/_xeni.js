const https = require('https');

const XENI_BASE   = (process.env.XENI_API_URL || 'https://uat.travelapi.ai').replace(/\/$/, '');
const XENI_KEY    = process.env.XENI_API_KEY    || '';
const XENI_SECRET = process.env.XENI_SECRET_KEY || '';

function xeniReq(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const urlObj  = new URL(endpoint, XENI_BASE);
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${XENI_KEY}`,
        'x-api-key': XENI_KEY,
        'x-api-secret': XENI_SECRET,
        'x-teleio-agent': 'teleio-tourism/1.0',
      },
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
          else reject(Object.assign(new Error(`Xeni ${res.statusCode}`), { status: res.statusCode, body: json }));
        } catch { reject(new Error(`Xeni parse error (${res.statusCode}): ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Xeni request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = { xeniReq, cors };
