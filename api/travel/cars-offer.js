const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { token, country = 'US', currency = 'USD' } = req.query;
    if (!token) return res.status(400).json({ error: 'token is required' });

    const correlationId = crypto.randomUUID();
    const qs = new URLSearchParams({ country, currency, token });
    const result = await xeniReq(
      'GET',
      `/cars/api/v2/rentals/?${qs.toString()}`,
      null,
      { 'x-correlation-id': correlationId }
    );

    res.json(result);
  } catch (err) {
    console.error('Cars offer:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
