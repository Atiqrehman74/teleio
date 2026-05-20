const { xeniReq, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, checkIn, checkOut, adults = 2, children = 0 } = req.body;
    if (!destination) return res.status(400).json({ error: 'destination is required' });

    // Step 1: autocomplete → get region code, lat/lon, type/name
    const auto = await xeniReq('GET',
      `/resorts/api/v2/search?key=${encodeURIComponent(destination)}`
    );
    const places = Array.isArray(auto.data) ? auto.data : [];
    if (!places.length) return res.json({ data: { properties: [], total: 0 } });

    const loc    = places.find(p => p.type === 'resort') || places[0];
    const region = loc.region || '';
    const lat    = loc.location?.lat  || null;
    const lon    = loc.location?.lon  || loc.location?.long || null;
    const resortName = loc.full_name || loc.name || destination;

    if (!region) return res.json({ data: { properties: [], total: 0, _resort_name: resortName } });

    const start = checkIn  || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const end   = checkOut || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];

    const correlationId = crypto.randomUUID();
    const searchBody = {
      stay_period: { start, end },
      filters: {
        all_inclusive: ['O', 'M', 'N'],
        regions: [{ type: loc.type || 'resort', name: loc.name || destination }],
      },
    };
    if (lat && lon) { searchBody.lat = lat; searchBody.lon = lon; }

    let result;
    try {
      result = await xeniReq(
        'POST',
        `/resorts/api/v2/properties/${encodeURIComponent(region)}?currency=USD`,
        searchBody,
        { 'x-correlation-id': correlationId }
      );
    } catch (resortErr) {
      console.warn('Resorts properties endpoint failed, falling back to Hotels:', resortErr.message);
      const ci = checkIn  || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const co = checkOut || new Date(Date.now() + 34 * 86400000).toISOString().split('T')[0];
      if (!lat || !lon) return res.json({ data: { properties: [], total: 0, _resort_name: resortName } });
      result = await xeniReq('POST',
        '/hotels/api/v2/properties?currency=USD&page=1&limit=20', {
          lat, long: lon,
          checkin_date: ci, checkout_date: co,
          occupancy: [{ adults: Number(adults), childs: Number(children), childages: [] }],
          country_of_residence: 'US',
          is_async: false,
          sort: [{ key: 'price', order: 'asc' }],
        }
      );
    }

    if (result.data) result.data._resort_name = resortName;
    else result._resort_name = resortName;
    res.json(result);

  } catch (err) {
    console.error('Resorts:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
