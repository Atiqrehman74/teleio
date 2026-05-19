const { xeniReq, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, checkIn, checkOut, adults = 2, children = 0 } = req.body;
    if (!destination || !checkIn || !checkOut)
      return res.status(400).json({ error: 'destination, checkIn and checkOut are required' });

    // Step 1: autocomplete → lat/long + place_id
    const auto = await xeniReq('GET',
      `/hotels/api/v2/autocomplete?key=${encodeURIComponent(destination)}&currency=USD`
    );
    const places = (auto.data && Array.isArray(auto.data)) ? auto.data : (Array.isArray(auto) ? auto : []);
    if (!places.length) return res.json({ hotels: [], total: 0 });

    const { lat, long } = places[0].location;
    const place_id = places[0].place_id || places[0].id || '';

    // Step 2: async property search with x-correlation-id
    const correlationId = crypto.randomUUID();
    const searchBody = {
      checkin_date: checkIn,
      checkout_date: checkOut,
      occupancy: [{ adults: Number(adults), childs: Number(children), childages: [] }],
      lat,
      long,
      country_of_residence: 'US',
      sort: [{ key: 'price', order: 'asc' }],
      filters: { ratings: [] },
      is_async: true,
    };
    if (place_id) searchBody.place_id = place_id;

    const initial = await xeniReq(
      'POST',
      '/hotels/api/v2/properties?currency=USD&page=1&limit=50',
      searchBody,
      { 'x-correlation-id': correlationId }
    );

    // If the API returned hotels directly (sync or fast async), enrich and return
    if (initial.data && initial.data.hotels) {
      return res.json(await enrichHotels(initial));
    }

    // Async flow: poll until data arrives or timeout (25 s)
    const pollCorrelation = initial.correlation_id || correlationId;
    const deadline = Date.now() + 25000;
    let pollResult = null;

    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const poll = await xeniReq(
          'GET',
          `/hotels/api/v2/properties/${pollCorrelation}?currency=USD&page=1&limit=50`,
          null,
          { 'x-correlation-id': correlationId }
        );
        if (poll.data && poll.data.hotels) {
          pollResult = poll;
          break;
        }
      } catch (_) {
        // polling endpoint may return 404/202 while processing — keep trying
      }
    }

    if (pollResult) return res.json(await enrichHotels(pollResult));
    return res.json(initial);

  } catch (err) {
    console.error('Hotels:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};

// Enrich search results with full content (images, descriptions) via content-ids
async function enrichHotels(searchResult) {
  try {
    const hotels = searchResult.data && searchResult.data.hotels;
    if (!hotels || !hotels.length) return searchResult;

    const ids = hotels.map(h => h.property_id).filter(Boolean).slice(0, 50);
    if (!ids.length) return searchResult;

    const content = await xeniReq('POST', '/hotels/v2/hotel/content-ids', {
      property_ids: ids,
      filters: { ratings: [], name: '' },
      sort: [],
    });

    // Build a lookup map from content response
    const contentMap = {};
    const contentList = (content.data && Array.isArray(content.data))
      ? content.data
      : (content.data && content.data.hotels) || [];
    contentList.forEach(c => { if (c.property_id) contentMap[c.property_id] = c; });

    // Merge content into each hotel (content fields win for images/descriptions)
    searchResult.data.hotels = hotels.map(h => {
      const c = contentMap[h.property_id];
      if (!c) return h;
      return Object.assign({}, h, {
        name:    c.name    || h.name,
        image:   c.image   || c.images || h.image,
        images:  c.images  || h.images,
        ratings: c.ratings || h.ratings,
        contact: c.contact || h.contact,
        description: c.description || h.description,
      });
    });
  } catch (_) {
    // enrichment is best-effort — return original if it fails
  }
  return searchResult;
}
