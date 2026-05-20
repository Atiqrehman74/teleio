const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { booking_id } = req.body || {};
    if (!booking_id) return res.status(400).json({ error: 'booking_id is required' });

    const correlationId = crypto.randomUUID();
    const result = await xeniReq(
      'DELETE',
      `/cars/api/v2/bookings/${encodeURIComponent(booking_id)}`,
      { booking_status: 'CANCELLED' },
      { 'x-correlation-id': correlationId }
    );

    res.json(result);
  } catch (err) {
    console.error('Cars cancel:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
