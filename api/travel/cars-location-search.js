const crypto = require('crypto');
const { carsReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { key } = req.query;
    if (!key || key.trim().length < 2) return res.status(400).json({ error: 'key must be at least 2 characters' });

    const correlationId = crypto.randomUUID();
    const result = await carsReq(
      'GET',
      `/search?key=${encodeURIComponent(key.trim())}`,
      null,
      { 'x-correlation-id': correlationId }
    );

    res.json(result);
  } catch (err) {
    console.error('Cars location search:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
