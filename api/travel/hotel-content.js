const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, lat: directLat, long: directLong, radius = 20 } = req.body;

    let lat = directLat;
    let long = directLong;

    // Resolve destination name → lat/long via autocomplete
    if (!lat || !long) {
      if (!destination) return res.status(400).json({ error: 'destination or lat/long is required' });
      const auto = await xeniReq('GET',
        `/hotels/api/v2/autocomplete?key=${encodeURIComponent(destination)}&currency=USD`
      );
      const places = (auto.data && Array.isArray(auto.data)) ? auto.data : (Array.isArray(auto) ? auto : []);
      if (!places.length) return res.json({ data: { hotels: [], total: 0 } });
      lat  = places[0].location.lat;
      long = places[0].location.long;
    }

    const result = await xeniReq('POST', '/hotels/v2/hotel/content', {
      lat,
      long,
      radius,
      filters: {},
      sort: [],
    });

    res.json(result);
  } catch (err) {
    console.error('Hotel content:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
