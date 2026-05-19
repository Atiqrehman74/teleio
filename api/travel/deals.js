const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const location = (req.query && req.query.location)
      || (req.body && req.body.location)
      || 'Dubai';

    const result = await xeniReq('GET',
      `/deals/api/v2/search?location=${encodeURIComponent(location)}&currency=USD`
    );
    res.json(result);
  } catch (err) {
    console.error('Deals:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
