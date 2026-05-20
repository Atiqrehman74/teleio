const https = require('https');
const crypto = require('crypto');
const { cors } = require('../_xeni');

const XENI_BASE = (process.env.XENI_API_URL || 'https://uat.travelapi.ai').replace(/\/$/, '');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const {
      availability_token,
      contact, participants, questions, language_guide,
    } = req.body || {};

    if (!availability_token) return res.status(400).json({ error: 'availability_token is required' });
    if (!contact || !contact.email) return res.status(400).json({ error: 'contact.email is required' });

    const body = { contact, participants: participants || [], questions: questions || [] };
    if (language_guide) body.language_guide = language_guide;

    const correlationId = crypto.randomUUID();
    const payload = JSON.stringify(body);
    const urlObj  = new URL(
      `/activities/api/v2/bookings?availability_token=${encodeURIComponent(availability_token)}`,
      XENI_BASE
    );

    const result = await new Promise((resolve, reject) => {
      const opts = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-correlation-id': correlationId,
          'Content-Length': Buffer.byteLength(payload),
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
      r.setTimeout(20000, () => { r.destroy(); reject(new Error('Request timeout')); });
      r.write(payload);
      r.end();
    });

    res.json(result);
  } catch (err) {
    console.error('Activity book:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
