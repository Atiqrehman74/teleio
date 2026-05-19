const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, checkIn, checkOut, adults = 2, children = 0 } = req.body;
    if (!destination || !checkIn || !checkOut)
      return res.status(400).json({ error: 'destination, checkIn and checkOut are required' });

    // Step 1: autocomplete to get location id
    const auto = await xeniReq('GET',
      `/vacation-rentals/api/v2/autocomplete?key=${encodeURIComponent(destination)}&currency=USD`
    );
    const places = auto.data || (Array.isArray(auto) ? auto : []);
    if (!places.length) return res.json({ properties: [], total: 0 });

    const loc = places[0];
    const locationId = loc.id || loc.location_id || loc.destination_id || '';
    const { lat, long } = loc.location || loc.coordinates || {};

    // Step 2: search vacation rentals
    const body = {
      checkin_date: checkIn,
      checkout_date: checkOut,
      occupancy: [{ adults: Number(adults), children: Number(children) }],
      currency: 'USD',
      pagination: { page: 1, limit: 20 },
    };
    if (locationId) body.location_id = locationId;
    if (lat && long) { body.lat = lat; body.long = long; }

    const result = await xeniReq('POST', '/vacation-rentals/api/v2/search', body);
    res.json(result);
  } catch (err) {
    console.error('Vacation Rentals:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
