const https = require('https');
const crypto = require('crypto');
const { cors } = require('../_xeni');

const XENI_BASE = (process.env.XENI_API_URL || 'https://uat.travelapi.ai').replace(/\/$/, '');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { reference_number, reason } = req.body || {};
    if (!reference_number) return res.status(400).json({ error: 'reference_number is required' });

    const correlationId = crypto.randomUUID();
    const payload = JSON.stringify({
      booking_status: 'CANCELLED',
      reason: reason || 'Customer requested cancellation',
    });
    const urlObj = new URL(
      `/activities/api/v2/bookings/${encodeURIComponent(reference_number)}`,
      XENI_BASE
    );

    const result = await new Promise((resolve, reject) => {
      const opts = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method: 'PATCH',
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
      r.setTimeout(15000, () => { r.destroy(); reject(new Error('Request timeout')); });
      r.write(payload);
      r.end();
    });

    res.json(result);
  } catch (err) {
    console.error('Activity cancel:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
