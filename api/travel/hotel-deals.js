const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

const DEALS_BASE = (process.env.XENI_DEALS_URL || 'https://travelapi.ai').trim().replace(/\/$/, '');

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

    // Pass full production URL — new URL(fullUrl, base) ignores base when first arg is absolute
    const fullUrl = `${DEALS_BASE}/hotels/api/v2/deals?${qs.toString()}`;
    const result = await xeniReq('GET', fullUrl, null, {
      'x-correlation-id': correlationId,
      'x-session-id':     sessionId,
      'timezone':         timezone,
    });
    res.json(result);
  } catch (err) {
    console.error('Hotel deals:', err.message, JSON.stringify(err.body));
    res.status(err.status || 500).json({ error: err.message, body: err.body, detail: JSON.stringify(err.body) });
  }
};
