const { xeniReq, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { product_id } = req.query;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });

    const correlationId = crypto.randomUUID();
    const result = await xeniReq(
      'GET',
      `/activities/api/v2/products/${encodeURIComponent(product_id)}/details`,
      null,
      { 'x-correlation-id': correlationId }
    );
    res.json(result);
  } catch (err) {
    console.error('Activity detail:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
