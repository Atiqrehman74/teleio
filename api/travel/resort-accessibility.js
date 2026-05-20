const { xeniReq, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const id = req.query && req.query.id;
    if (!id) return res.status(400).json({ error: 'id is required' });

    const correlationId = crypto.randomUUID();
    const result = await xeniReq(
      'GET',
      `/resorts/api/v2/property/${encodeURIComponent(id)}/accessibility`,
      null,
      { 'x-correlation-id': correlationId }
    );
    res.json(result);
  } catch (err) {
    console.error('Resort accessibility:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
