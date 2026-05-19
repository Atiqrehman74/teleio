const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, checkIn, checkOut, adults = 2, children = 0 } = req.body;
    if (!destination || !checkIn || !checkOut)
      return res.status(400).json({ error: 'destination, checkIn and checkOut are required' });

    // Step 1: autocomplete to get lat/long for destination
    const auto = await xeniReq('GET',
      `/hotels/api/v2/autocomplete?key=${encodeURIComponent(destination)}&currency=USD`
    );
    const places = auto.data || (Array.isArray(auto) ? auto : []);
    if (!places.length) return res.json({ hotels: [], total: 0 });

    const { lat, long } = places[0].location;

    // Step 2: search properties with lat/long and dates
    const result = await xeniReq('POST', '/hotels/api/v2/properties?currency=USD&page=1&limit=20', {
      lat,
      long,
      checkin_date: checkIn,
      checkout_date: checkOut,
      occupancy: [{ adults: Number(adults), childs: Number(children), childages: [] }],
      country_of_residence: 'US',
    });
    res.json(result);
  } catch (err) {
    console.error('Hotels:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
