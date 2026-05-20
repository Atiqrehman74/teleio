const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const {
      availability_details_token,
      customer,
      equipments,
      currency = 'USD',
    } = req.body || {};

    if (!availability_details_token)
      return res.status(400).json({ error: 'availability_details_token is required' });
    if (!customer || !customer.first_name || !customer.last_name)
      return res.status(400).json({ error: 'customer.first_name and last_name are required' });
    if (!customer.email)
      return res.status(400).json({ error: 'customer.email is required' });

    const correlationId = crypto.randomUUID();
    const body = { availability_details_token, customer };
    if (equipments && equipments.length) body.equipments = equipments;

    const result = await xeniReq(
      'POST',
      `/cars/api/v2/bookings?currency=${encodeURIComponent(currency)}`,
      body,
      { 'x-correlation-id': correlationId }
    );

    res.json(result);
  } catch (err) {
    console.error('Cars book:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
