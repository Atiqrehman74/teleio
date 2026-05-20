const https = require('https');
const crypto = require('crypto');
const { cors } = require('../_xeni');

const XENI_BASE = (process.env.XENI_API_URL || 'https://uat.travelapi.ai').trim().replace(/\/$/, '');
const XENI_KEY  = (process.env.XENI_API_KEY || '').trim();

function plainReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: new URL(XENI_BASE).hostname,
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': XENI_KEY,
        'x-correlation-id': crypto.randomUUID(),
      },
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
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
    r.setTimeout(20000, () => { r.destroy(); reject(new Error('Request timeout')); });
    if (payload) r.write(payload);
    r.end();
  });
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination_id, destination, category, date, currency = 'USD' } = req.body || {};

    let destId = destination_id || '';

    // If no destination_id, resolve via autocomplete
    if (!destId && destination) {
      try {
        const auto = await plainReq('GET', `/activities/api/v2/autocomplete?query=${encodeURIComponent(destination)}&limit=1`);
        const suggestions = (auto.data && auto.data.suggestions) || auto.suggestions || [];
        destId = suggestions[0] ? (suggestions[0].id || '') : '';
      } catch(e) {
        console.warn('Activity autocomplete fallback failed:', e.message);
      }
    }

    if (!destId) return res.status(400).json({ error: 'Could not resolve destination. Please select from the autocomplete suggestions.' });

    const body = {
      destination_id: destId,
      currency,
      page: 1,
      limit: 20,
    };
    if (category) body.category = category;
    if (date) body.date = date;

    const result = await plainReq('POST', '/activities/api/v2/search', body);
    res.json(result);
  } catch (err) {
    console.error('Activity search:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
