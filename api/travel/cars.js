const { xeniReq, cors } = require('../_xeni');

/* Xeni cars API requires datetime strings with time component */
function toDateTime(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('T')) return dateStr;
  return dateStr + 'T10:00:00';
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { pickupLocation, pickupDate, returnDate, dropoffLocation } = req.body;
    if (!pickupLocation || !pickupDate || !returnDate)
      return res.status(400).json({ error: 'pickupLocation, pickupDate and returnDate are required' });

    const dropoff = dropoffLocation || pickupLocation;

    // Step 1: autocomplete for pickup
    const [autoPickup, autoDrop] = await Promise.all([
      xeniReq('GET', `/cars/api/v2/autocomplete?key=${encodeURIComponent(pickupLocation)}`),
      dropoffLocation && dropoffLocation !== pickupLocation
        ? xeniReq('GET', `/cars/api/v2/autocomplete?key=${encodeURIComponent(dropoffLocation)}`)
        : Promise.resolve(null),
    ]);

    const pickupLocs = Array.isArray(autoPickup) ? autoPickup : (autoPickup.data || autoPickup.locations || []);
    const pickLoc = pickupLocs[0];
    if (!pickLoc) return res.json({ rentals: [], message: 'Pickup location not found. Try a city name or airport code.' });

    const dropLocs = autoDrop ? (Array.isArray(autoDrop) ? autoDrop : (autoDrop.data || autoDrop.locations || [])) : pickupLocs;
    const dropLoc = dropLocs[0] || pickLoc;

    // Determine pickup type and correct parameter name for Xeni cars API:
    //   airport → pickup_type=airport + pickup_code=DXB
    //   geo     → pickup_type=geo     + pickup_geo=lat,lon
    function getLocParams(loc, prefix, fallbackStr) {
      const iata = loc.iata_code || (loc.type === 'airport' && loc.code) || '';
      if (iata) {
        return `${prefix}_type=airport&${prefix}_code=${encodeURIComponent(iata)}`;
      }
      const lon = (loc.coordinates && (loc.coordinates.lon || loc.coordinates.lng)) || '';
      const lat = (loc.coordinates && loc.coordinates.lat) || '';
      if (lat && lon) {
        return `${prefix}_type=geo&${prefix}_geo=${encodeURIComponent(lat + ',' + lon)}`;
      }
      return `${prefix}_type=geo&${prefix}_geo=${encodeURIComponent(fallbackStr)}`;
    }

    const country = pickLoc.country_code || 'AE';
    const pickupParams = getLocParams(pickLoc, 'pickup', pickupLocation);
    const returnParams = getLocParams(dropLoc, 'return', dropoff);
    const pd = encodeURIComponent(toDateTime(pickupDate));
    const rd = encodeURIComponent(toDateTime(returnDate));

    const result = await xeniReq('GET',
      `/cars/api/v2/rentals?country=${country}&${pickupParams}&${returnParams}` +
      `&currency=USD&pickup_date=${pd}&return_date=${rd}&driver_age=25&page=1&limit=20`
    );
    res.json(result);
  } catch (err) {
    console.error('Cars:', err.message, err.body && JSON.stringify(err.body));
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
