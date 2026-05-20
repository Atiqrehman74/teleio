const { xeniReq, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { booking_id } = req.query;
    if (!booking_id) return res.status(400).json({ error: 'booking_id is required' });

    const correlationId = crypto.randomUUID();
    const result = await xeniReq(
      'GET',
      `/flights/api/v2/bookings?booking_id=${encodeURIComponent(booking_id)}`,
      null,
      { 'x-correlation-id': correlationId }
    );
    res.json(result);
  } catch (err) {
    console.error('Flight booking get:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
