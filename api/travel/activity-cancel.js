const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { reference_number, reason } = req.body || {};
    if (!reference_number) return res.status(400).json({ error: 'reference_number is required' });

    const body = {
      booking_status: 'CANCELLED',
      reason: reason || 'Customer requested cancellation',
    };

    const result = await xeniReq(
      'PATCH',
      `/activities/api/v2/bookings/${encodeURIComponent(reference_number)}`,
      body,
      { 'x-correlation-id': crypto.randomUUID() }
    );
    res.json(result);
  } catch (err) {
    console.error('Activity cancel:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
