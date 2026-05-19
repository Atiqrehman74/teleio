const { xeniReq, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const {
      booking_token,   // booking_token from price verification
      title,
      first_name,
      last_name,
      email,
      phone,           // { country_code, number } or raw string
      special_request,
    } = req.body;

    if (!booking_token) return res.status(400).json({ error: 'booking_token is required' });
    if (!first_name || !last_name || !email)
      return res.status(400).json({ error: 'first_name, last_name and email are required' });

    // Normalise phone: accept object or "country_code number" string
    let phoneObj = { country_code: '1', number: '' };
    if (phone && typeof phone === 'object') {
      phoneObj = phone;
    } else if (phone && typeof phone === 'string') {
      const stripped = phone.replace(/^\+/, '');
      const parts    = stripped.split(/[\s\-.]/, 2);
      if (parts.length === 2 && parts[0].length <= 3) {
        phoneObj = { country_code: parts[0], number: parts[1] };
      } else {
        phoneObj = { country_code: '1', number: stripped };
      }
    }

    const correlationId = crypto.randomUUID();
    const result = await xeniReq(
      'POST',
      `/hotels/api/v2/bookings?pricing_token=${encodeURIComponent(booking_token)}`,
      {
        booking_id: '',
        rooms: [{
          title:      title || 'Mr',
          first_name,
          last_name,
          ...(special_request ? { special_request } : {}),
        }],
        email,
        phone: phoneObj,
      },
      { 'x-correlation-id': correlationId }
    );

    res.json(result);
  } catch (err) {
    console.error('Hotel book:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
