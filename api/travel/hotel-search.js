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
      checkin_date,
      checkout_date,
      occupancy,
      place_id,
      lat,
      long: lon,
      country_of_residence = 'US',
      radius,
      sort,
      filters,
      currency = 'USD',
      page = 1,
      limit = 20,
    } = req.body || {};

    if (!checkin_date)  return res.status(400).json({ error: 'checkin_date is required' });
    if (!checkout_date) return res.status(400).json({ error: 'checkout_date is required' });
    if (!place_id && (lat == null || lon == null))
      return res.status(400).json({ error: 'place_id or lat+long is required' });

    const body = {
      checkin_date,
      checkout_date,
      occupancy: occupancy && occupancy.length ? occupancy : [{ adults: 1, childs: 0, childages: [] }],
      country_of_residence,
      is_async: true,
    };

    if (place_id)       body.place_id = place_id;
    if (lat  != null)   body.lat  = Number(lat);
    if (lon  != null)   body.long = Number(lon);
    if (radius != null) body.radius = Number(radius);
    if (sort   && sort.length) body.sort = sort;
    else body.sort = [{ key: 'price', order: 'asc' }];
    if (filters) body.filters = filters;

    const correlationId = crypto.randomUUID();
    const payload = JSON.stringify(body);
    const urlObj  = new URL(
      `/hotels/api/v2/properties?currency=${encodeURIComponent(currency)}&page=${page}&limit=${limit}`,
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
      r.setTimeout(25000, () => { r.destroy(); reject(new Error('Request timeout')); });
      r.write(payload);
      r.end();
    });

    res.json(result);
  } catch (err) {
    console.error('Hotel search:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
