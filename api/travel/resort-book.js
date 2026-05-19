const { xeniV1Req, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const {
      token, recommendation_id,
      property_id, checkin, checkout, total_rate, currency = 'USD',
      email, phone,
      first_name, middle_name, last_name,
      address, city, state, zip_code, country,
      traveler_email, traveler_phone,
    } = req.body;

    if (!token)       return res.status(400).json({ error: 'token is required' });
    if (!property_id) return res.status(400).json({ error: 'property_id is required' });
    if (!first_name || !last_name) return res.status(400).json({ error: 'first_name and last_name are required' });
    if (!email)       return res.status(400).json({ error: 'email is required' });

    let path = `/resorts/api/v2/itineraries?token=${encodeURIComponent(token)}`;
    if (recommendation_id) path += `&recommendation_id=${encodeURIComponent(recommendation_id)}`;

    const body = {
      property_id,
      checkin,
      checkout,
      total_rate: Number(total_rate),
      currency,
      action: 'HOLD',
      communication_details: {
        email,
        phone: phone || '',
      },
      traveler: {
        first_name,
        last_name,
        email: traveler_email || email,
        phone: traveler_phone || phone || '',
        ...(middle_name ? { middle_name } : {}),
        ...(address  ? { address }  : {}),
        ...(city     ? { city }     : {}),
        ...(state    ? { state }    : {}),
        ...(zip_code ? { zip_code } : {}),
        ...(country  ? { country }  : {}),
      },
    };

    const correlationId = crypto.randomUUID();
    const result = await xeniV1Req('POST', path, body, { 'x-correlation-id': correlationId });
    res.json(result);
  } catch (err) {
    console.error('Resort book:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
