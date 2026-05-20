const https = require('https');
const crypto = require('crypto');
const { cors } = require('../_xeni');

const XENI_BASE = (process.env.XENI_API_URL || 'https://uat.travelapi.ai').replace(/\/$/, '');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'query is required' });

    const correlationId = crypto.randomUUID();
    const urlObj = new URL(`/activities/api/v2/autocomplete?query=${encodeURIComponent(query)}&limit=8`, XENI_BASE);

    const result = await new Promise((resolve, reject) => {
      const opts = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-correlation-id': correlationId,
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
      r.setTimeout(10000, () => { r.destroy(); reject(new Error('Request timeout')); });
      r.end();
    });

    res.json(result);
  } catch (err) {
    console.error('Activity autocomplete:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
