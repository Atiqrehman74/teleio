const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, checkIn, checkOut, adults = 2, children = 0 } = req.body;
    if (!destination) return res.status(400).json({ error: 'destination is required' });

    // Step 1: get lat/long via resort location lookup
    const auto = await xeniReq('GET',
      `/resorts/api/v2/search?key=${encodeURIComponent(destination)}&currency=USD`
    );
    const places = Array.isArray(auto.data) ? auto.data : [];
    if (!places.length) return res.json({ hotels: [], total: 0 });

    const loc = places[0];
    const lat  = loc.location?.lat;
    const long = loc.location?.lon || loc.location?.long;
    if (!lat || !long) return res.json({ hotels: [], total: 0, message: 'Location not found' });

    // Step 2: search properties via Hotels endpoint (Resorts properties/search has server-side issues)
    const ci = checkIn  || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const co = checkOut || new Date(Date.now() + 34 * 86400000).toISOString().split('T')[0];

    const result = await xeniReq('POST',
      '/hotels/api/v2/properties?currency=USD&page=1&limit=20', {
        lat, long,
        checkin_date: ci,
        checkout_date: co,
        occupancy: [{ adults: Number(adults), childs: Number(children), childages: [] }],
        country_of_residence: 'US',
      }
    );
    res.json(result);
  } catch (err) {
    console.error('Resorts:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
