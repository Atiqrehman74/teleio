const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, checkIn, checkOut, rooms = 1, adults = 2, children = 0 } = req.body;
    if (!destination || !checkIn || !checkOut)
      return res.status(400).json({ error: 'destination, checkIn and checkOut are required' });
    const result = await xeniReq('POST', '/api/v2/hotels/search', {
      destination, checkIn, checkOut,
      occupancies: [{ rooms: Number(rooms), adults: Number(adults), children: Number(children) }],
    });
    res.json(result);
  } catch (err) {
    console.error('Hotels:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
