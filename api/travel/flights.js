const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { origin, destination, departureDate, returnDate, adults = 1, children = 0 } = req.body;
    if (!origin || !destination || !departureDate)
      return res.status(400).json({ error: 'origin, destination and departureDate are required' });
    const result = await xeniReq('POST', '/api/v2/flights/search', {
      origin, destination, departureDate,
      ...(returnDate ? { returnDate } : {}),
      passengers: { adults: Number(adults), children: Number(children) },
    });
    res.json(result);
  } catch (err) {
    console.error('Flights:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
