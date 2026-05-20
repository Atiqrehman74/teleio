const https = require('https');
const crypto = require('crypto');
const { cors } = require('../_xeni');

const DEALS_BASE = (process.env.XENI_DEALS_URL || 'https://travelapi.ai').trim().replace(/\/$/, '');
const XENI_KEY   = (process.env.XENI_API_KEY || '').trim();

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const {
      lat,
      long: lon,
      currency = 'USD',
      timezone = 'UTC',
    } = req.query;

    const qs = new URLSearchParams({ currency });
    if (lat != null) qs.set('lat',  String(lat));
    if (lon != null) qs.set('long', String(lon));

    const correlationId = crypto.randomUUID();
    const sessionId     = crypto.randomUUID();
    const urlObj = new URL(`/hotels/api/v2/deals?${qs.toString()}`, DEALS_BASE);

    const result = await new Promise((resolve, reject) => {
      const opts = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': XENI_KEY,
          'x-correlation-id': correlationId,
          'x-session-id':     sessionId,
          'timezone':         timezone,
        },
      };
      const r = https.request(opts, resp => {
        let data = '';
        resp.on('data', c => data += c);
        resp.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (resp.statusCode >= 200 && resp.statusCode < 300) resolve(json);
            else reject(Object.assign(new Error(`Xeni ${resp.statusCode}`), { status: resp.statusCode, body: json }));
          } catch {
            reject(new Error(`Parse error (${resp.statusCode}): ${data.slice(0, 200)}`));
          }
        });
      });
      r.on('error', reject);
      r.setTimeout(12000, () => { r.destroy(); reject(new Error('Request timeout')); });
      r.end();
    });

    res.json(result);
  } catch (err) {
    console.error('Hotel deals:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
