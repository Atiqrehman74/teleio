const https = require('https');

const XENI_BASE   = (process.env.XENI_API_URL || 'https://uat.travelapi.ai').trim().replace(/\/$/, '');
const XENI_KEY    = (process.env.XENI_API_KEY    || '').trim();
const XENI_SECRET = (process.env.XENI_SECRET_KEY || '').trim();

const CARS_BASE             = (process.env.XENI_CARS_URL || 'https://uat.travelapi.ai').trim().replace(/\/$/, '');
const CARS_SECURITY_CONTEXT = (process.env.XENI_CARS_SECURITY_CONTEXT || '').trim();

// Token cache { token, expiresAt }
let _tokenCache = null;

function getToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache && _tokenCache.expiresAt > now + 60) return Promise.resolve(_tokenCache.token);

  const payload = JSON.stringify({ api_key: XENI_KEY, secret: XENI_SECRET, timestamp: now });

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: new URL(XENI_BASE).hostname,
      port: 443,
      path: '/identity/v2/auth/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(Object.assign(
            new Error(`Xeni auth failed (${res.statusCode}): ${data.slice(0, 150)}`),
            { status: 401 }
          ));
        }
        try {
          const json = JSON.parse(data);
          const token = json.signature || json.token || json.access_token || data.trim();
          const expiresAt = (typeof json.expiry     === 'number' ? json.expiry     : null)
                         || (typeof json.expires_at === 'number' ? json.expires_at : null)
                         || (now + 3600);
          _tokenCache = { token, expiresAt };
          resolve(token);
        } catch {
          _tokenCache = { token: data.trim(), expiresAt: now + 3600 };
          resolve(_tokenCache.token);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Xeni auth timeout')); });
    req.write(payload);
    req.end();
  });
}

async function xeniReq(method, endpoint, body, extraHeaders) {
  const token = await getToken();
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
        'Authorization': token,
        ...extraHeaders,
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
        } catch {
          reject(new Error(`Xeni parse error (${res.statusCode}): ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Xeni request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// V1 API requests use x-api-key header instead of HMAC token auth
function xeniV1Req(method, endpoint, body, extraHeaders) {
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
        'x-api-key': XENI_KEY,
        ...extraHeaders,
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
        } catch {
          reject(new Error(`Xeni parse error (${res.statusCode}): ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Xeni request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// Cars V2 API requests use x-security-context header
function carsReq(method, path, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const urlObj  = new URL(path, CARS_BASE);
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-security-context': CARS_SECURITY_CONTEXT,
        ...extraHeaders,
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
          else reject(Object.assign(new Error(`Cars API ${res.statusCode}`), { status: res.statusCode, body: json }));
        } catch {
          reject(new Error(`Cars parse error (${res.statusCode}): ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Cars API timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = { xeniReq, xeniV1Req, carsReq, cors };
