const { xeniV1Req, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { booking_id } = req.body || {};
    if (!booking_id) return res.status(400).json({ error: 'booking_id is required' });

    const correlationId = crypto.randomUUID();
    const result = await xeniV1Req(
      'PATCH',
      `/flights/api/v2/bookings/${encodeURIComponent(booking_id)}`,
      { booking_status: 'Confirm' },
      { 'x-correlation-id': correlationId }
    );
    res.json(result);
  } catch (err) {
    console.error('Flight confirm:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
