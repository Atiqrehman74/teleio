const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { origin, destination, departureDate, returnDate, adults = 1, children = 0 } = req.body;
    if (!origin || !destination || !departureDate)
      return res.status(400).json({ error: 'origin, destination and departureDate are required' });

    const flightInfo = [{ departure_date: departureDate, origin, destination }];
    if (returnDate) flightInfo.push({ departure_date: returnDate, origin: destination, destination: origin });

    const result = await xeniReq('POST', '/flights/api/v2/search', {
      flight_info: flightInfo,
      route_type: returnDate ? 'return' : 'oneway',
      cabin_type: 'economy',
      adults: Number(adults),
      children: Number(children),
      infants: 0,
      pagination: { page: 1, limit: 20 },
    });
    res.json(result);
  } catch (err) {
    console.error('Flights:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
