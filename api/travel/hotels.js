const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, checkIn, checkOut, rooms = 1, adults = 2, children = 0 } = req.body;
    if (!destination || !checkIn || !checkOut)
      return res.status(400).json({ error: 'destination, checkIn and checkOut are required' });

    // Step 1: autocomplete to find matching properties
    const autocomplete = await xeniReq('GET',
      `/hotels/api/v2/autocomplete?key=${encodeURIComponent(destination)}&currency=USD`
    );

    // Step 2: if we got a property_id from autocomplete, check availability
    const properties = Array.isArray(autocomplete) ? autocomplete
      : (autocomplete.data || autocomplete.properties || autocomplete.results || []);

    if (!properties.length) return res.json({ properties: [], message: 'No hotels found' });

    // Check availability for top 5 properties
    const topIds = properties.slice(0, 5).map(p => p.property_id || p.id).filter(Boolean);
    if (!topIds.length) return res.json(autocomplete);

    const availability = await xeniReq('POST', '/hotels/api/v2/properties/availability?currency=USD', {
      property_id: topIds[0],
      checkin_date: checkIn,
      checkout_date: checkOut,
      occupancy: [{ adults: Number(adults), childs: Number(children), childages: [] }],
      country_of_residence: 'US',
    });
    res.json({ properties, availability });
  } catch (err) {
    console.error('Hotels:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
