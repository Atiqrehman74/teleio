const https = require('https');
const crypto = require('crypto');
const { cors } = require('../_xeni');

const CARS_BASE = (process.env.XENI_CARS_URL || 'https://uat.travelapi.ai').replace(/\/$/, '');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const {
      country = 'US',
      pickup_type = 'geo',
      return_type = 'geo',
      pickup_code,
      return_code,
      pickup_geo,
      currency = 'USD',
      driver_age = 25,
      pickup_date,
      return_date,
      filter,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    if (!pickup_code) return res.status(400).json({ error: 'pickup_code is required' });
    if (!return_code) return res.status(400).json({ error: 'return_code is required' });
    if (!pickup_date) return res.status(400).json({ error: 'pickup_date is required' });
    if (!return_date) return res.status(400).json({ error: 'return_date is required' });

    /* Geo coordinates must be sent with an encoded comma (%2C) as the separator.
       Accept either "lat,lon" or "lat%2Clon" from frontend and normalise. */
    function geoEncode(val) {
      return val.replace(/,/g, '%2C');
    }

    const qs = new URLSearchParams();
    qs.set('country',      country);
    qs.set('pickup_type',  pickup_type);
    qs.set('return_type',  return_type);
    qs.set('currency',     currency);
    qs.set('driver_age',   String(driver_age));
    qs.set('pickup_date',  pickup_date);
    qs.set('return_date',  return_date);
    qs.set('page',         String(page));
    qs.set('limit',        String(limit));
    if (filter) qs.set('filter', filter);
    if (sort)   qs.set('sort',   sort);

    /* Build query string manually for geo params to preserve %2C encoding */
    let queryStr = qs.toString();
    queryStr += '&pickup_code=' + geoEncode(pickup_code);
    queryStr += '&return_code=' + geoEncode(return_code);
    if (pickup_geo || pickup_type === 'geo') {
      queryStr += '&pickup_geo=' + geoEncode(pickup_geo || pickup_code);
    }

    const correlationId = crypto.randomUUID();
    const path = '/cars/api/v2/rentals?' + queryStr;

    const result = await new Promise((resolve, reject) => {
      const urlObj = new URL(CARS_BASE);
      const opts = {
        hostname: urlObj.hostname,
        port: 443,
        path,
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
            else reject(Object.assign(new Error(`Cars API ${resp.statusCode}`), { status: resp.statusCode, body: json }));
          } catch {
            reject(new Error(`Parse error (${resp.statusCode}): ${data.slice(0, 200)}`));
          }
        });
      });
      r.on('error', reject);
      r.setTimeout(20000, () => { r.destroy(); reject(new Error('Request timeout')); });
      r.end();
    });

    res.json(result);
  } catch (err) {
    console.error('Cars search:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
