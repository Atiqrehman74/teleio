const { xeniReq, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const token = req.query && req.query.availability_token;
    const currency = (req.query && req.query.currency) || 'USD';
    if (!token) return res.status(400).json({ error: 'availability_token is required' });

    const correlationId = crypto.randomUUID();
    const result = await xeniReq(
      'GET',
      `/hotels/api/v2/properties/price?currency=${encodeURIComponent(currency)}&availability_token=${encodeURIComponent(token)}`,
      null,
      { 'x-correlation-id': correlationId }
    );
    res.json(result);
  } catch (err) {
    console.error('Hotel price:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
