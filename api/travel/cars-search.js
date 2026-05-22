const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const {
      country,
      pickup_type: rawPickupType = 'iata',
      return_type: rawReturnType = 'iata',
      pickup_code,
      return_code,
      pickup_geo,
      return_geo,
      currency = 'USD',
      driver_age = 30,
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

    // Normalise legacy 'airport' type to Xeni's expected 'iata'
    const typeMap = { airport: 'iata' };
    const pickup_type = typeMap[rawPickupType] || rawPickupType;
    const return_type = typeMap[rawReturnType] || rawReturnType;

    function geoEncode(val) {
      return val.replace(/,/g, '%2C');
    }

    const qs = new URLSearchParams();
    if (country) qs.set('country', country);
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

    const effectivePickupGeo = pickup_geo || (pickup_type === 'geo' ? pickup_code : null);
    const effectiveReturnGeo = return_geo || pickup_geo || (return_type === 'geo' ? return_code : null);

    let queryStr = qs.toString();
    queryStr += '&pickup_code=' + geoEncode(pickup_code);
    queryStr += '&return_code=' + geoEncode(return_code);
    if (effectivePickupGeo) queryStr += '&pickup_geo=' + geoEncode(effectivePickupGeo);
    if (effectiveReturnGeo) queryStr += '&return_geo=' + geoEncode(effectiveReturnGeo);

    const correlationId = crypto.randomUUID();
    const result = await xeniReq('GET', `/cars/api/v2/rentals?${queryStr}`, null, {
      'x-correlation-id': correlationId,
    });
    res.json(result);
  } catch (err) {
    console.error('Cars search:', err.message, JSON.stringify(err.body));
    res.status(err.status || 500).json({ error: err.message, body: err.body, detail: JSON.stringify(err.body) });
  }
};
