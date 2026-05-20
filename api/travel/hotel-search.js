const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

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
    body.sort = (sort && sort.length) ? sort : [{ key: 'price', order: 'asc' }];
    if (filters) body.filters = filters;

    const correlationId = crypto.randomUUID();
    const result = await xeniReq(
      'POST',
      `/hotels/api/v2/properties?currency=${encodeURIComponent(currency)}&page=${page}&limit=${limit}`,
      body,
      { 'x-correlation-id': correlationId }
    );
    res.json(result);
  } catch (err) {
    console.error('Hotel search error:', err.message, JSON.stringify(err.body));
    res.status(err.status || 500).json({ error: err.message, body: err.body, detail: JSON.stringify(err.body) });
  }
};
