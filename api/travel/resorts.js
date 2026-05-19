const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, departureDate } = req.body;
    if (!destination) return res.status(400).json({ error: 'destination is required' });

    const result = await xeniReq('GET',
      `/resorts/api/v2/search?key=${encodeURIComponent(destination)}&currency=USD`
    );
    res.json(result);
  } catch (err) {
    console.error('Resorts:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
