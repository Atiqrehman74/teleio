const { xeniReq, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { reference_number } = req.body;
    if (!reference_number) return res.status(400).json({ error: 'reference_number is required' });

    const correlationId = crypto.randomUUID();
    const result = await xeniReq(
      'PUT',
      `/resorts/api/v2/itineraries?reference_number=${encodeURIComponent(reference_number)}&status=RELEASE`,
      {},
      { 'x-correlation-id': correlationId }
    );
    res.json(result);
  } catch (err) {
    console.error('Resort cancel:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
