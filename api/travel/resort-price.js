const { xeniV1Req, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { property_id, checkin, checkout, currency = 'USD', recommendation_id, token } = req.query;
    if (!property_id) return res.status(400).json({ error: 'property_id is required' });
    if (!checkin || !checkout) return res.status(400).json({ error: 'checkin and checkout are required' });
    if (!token) return res.status(400).json({ error: 'token is required' });

    let path = `/resorts/api/v2/properties/price?property_id=${encodeURIComponent(property_id)}&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&currency=${encodeURIComponent(currency)}&token=${encodeURIComponent(token)}`;
    if (recommendation_id) path += `&recommendation_id=${encodeURIComponent(recommendation_id)}`;

    const correlationId = crypto.randomUUID();
    const result = await xeniV1Req('GET', path, null, { 'x-correlation-id': correlationId });
    res.json(result);
  } catch (err) {
    console.error('Resort price:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
