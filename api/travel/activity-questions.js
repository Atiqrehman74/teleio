const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { product_id, availability_token } = req.query;
    if (!product_id)         return res.status(400).json({ error: 'product_id is required' });
    if (!availability_token) return res.status(400).json({ error: 'availability_token is required' });

    const result = await xeniReq(
      'GET',
      `/activities/api/v2/products/${encodeURIComponent(product_id)}/questions?availability_token=${encodeURIComponent(availability_token)}`,
      null,
      { 'x-correlation-id': crypto.randomUUID() }
    );
    res.json(result);
  } catch (err) {
    console.error('Activity questions:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
