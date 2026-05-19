const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { pickupLocation, pickupDate, returnDate, dropoffLocation } = req.body;
    if (!pickupLocation || !pickupDate || !returnDate)
      return res.status(400).json({ error: 'pickupLocation, pickupDate and returnDate are required' });
    const result = await xeniReq('POST', '/api/v2/cars/search', {
      pickupLocation, dropoffLocation: dropoffLocation || pickupLocation,
      pickupDate, returnDate,
    });
    res.json(result);
  } catch (err) {
    console.error('Cars:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
