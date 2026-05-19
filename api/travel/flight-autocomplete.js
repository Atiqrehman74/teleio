const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const key = req.query && req.query.key;
    if (!key) return res.status(400).json({ error: 'key is required' });

    const result = await xeniReq('GET', `/flights/api/v2/autocomplete?key=${encodeURIComponent(key)}`);
    res.json(result);
  } catch (err) {
    console.error('Flight autocomplete:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
