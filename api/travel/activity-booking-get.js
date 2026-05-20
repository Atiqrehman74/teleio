const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { reference_number } = req.query;
    if (!reference_number) return res.status(400).json({ error: 'reference_number is required' });

    const result = await xeniReq(
      'GET',
      `/activities/api/v2/bookings/${encodeURIComponent(reference_number)}`,
      null,
      { 'x-correlation-id': crypto.randomUUID() }
    );
    res.json(result);
  } catch (err) {
    console.error('Activity booking get:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
