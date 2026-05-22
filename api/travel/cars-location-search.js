const crypto = require('crypto');
const { carsReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { key } = req.query;
    if (!key || key.trim().length < 2) return res.status(400).json({ error: 'key must be at least 2 characters' });

    const result = await carsReq(
      'GET',
      `/cars/api/v2/autocomplete?key=${encodeURIComponent(key.trim())}`,
      null,
      { 'x-correlation-id': crypto.randomUUID() }
    );

    res.json(result);
  } catch (err) {
    console.error('Cars location search:', err.message, JSON.stringify(err.body));
    res.status(err.status || 500).json({ error: err.message, body: err.body, detail: JSON.stringify(err.body) });
  }
};
