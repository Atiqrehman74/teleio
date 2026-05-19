const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { pickupLocation, pickupDate, returnDate, dropoffLocation } = req.body;
    if (!pickupLocation || !pickupDate || !returnDate)
      return res.status(400).json({ error: 'pickupLocation, pickupDate and returnDate are required' });

    // First autocomplete to get location code
    const auto = await xeniReq('GET',
      `/cars/api/v2/autocomplete?key=${encodeURIComponent(pickupLocation)}`
    );
    const locations = Array.isArray(auto) ? auto : (auto.data || auto.locations || []);
    const loc = locations[0];

    if (!loc) return res.json({ rentals: [], message: 'Location not found' });

    // Use geo coordinates or location code from autocomplete
    const pickup = loc.coordinates
      ? `${loc.coordinates.lat},${loc.coordinates.lng}`
      : (loc.code || loc.iata_code || pickupLocation);

    const result = await xeniReq('GET',
      `/cars/api/v2/rentals?country=${loc.country_code || 'US'}&pickup_type=geo&return_type=geo` +
      `&pickup_code=${encodeURIComponent(pickup)}&return_code=${encodeURIComponent(pickup)}` +
      `&currency=USD&pickup_date=${encodeURIComponent(pickupDate)}&return_date=${encodeURIComponent(returnDate)}` +
      `&driver_age=25&page=1&limit=20`
    );
    res.json(result);
  } catch (err) {
    console.error('Cars:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
