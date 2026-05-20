const { xeniReq, cors } = require('../_xeni');
const crypto = require('crypto');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const {
      cabin_availability_token,
      title, first_name, last_name, gender,
      date_of_birth,
      passport_number, passport_expiry, passport_country,
      passenger_nationality,
      email, phone,
      post_code,
      currency,
    } = req.body || {};

    if (!cabin_availability_token) return res.status(400).json({ error: 'cabin_availability_token is required' });
    if (!first_name || !last_name || !email) return res.status(400).json({ error: 'first_name, last_name and email are required' });

    // Split phone into parts — send full number as phone_number; country/area are best-effort
    var rawPhone = (phone || '').replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
    var countryCode = '1';
    var areaCode    = '';
    var phoneNum    = rawPhone;
    if (rawPhone.length > 10) {
      countryCode = rawPhone.slice(0, rawPhone.length - 10);
      areaCode    = rawPhone.slice(rawPhone.length - 10, rawPhone.length - 7);
      phoneNum    = rawPhone.slice(rawPhone.length - 7);
    } else if (rawPhone.length === 10) {
      areaCode = rawPhone.slice(0, 3);
      phoneNum = rawPhone.slice(3);
    }

    const body = {
      cabin_availability_token,
      traveler_info: [
        {
          type: 'ADULT',
          gender: gender || 'Male',
          title: title || 'Mr',
          first_name,
          last_name,
          date_of_birth: date_of_birth || '',
          passport: {
            passport_number: passport_number || '',
            expiry_date:     passport_expiry || '',
            country:         passport_country || '',
          },
          passenger_nationality: passenger_nationality || '',
        },
      ],
      country_code:  countryCode,
      area_code:     areaCode,
      phone_number:  phoneNum,
      email,
      post_code:     post_code || '',
      currency:      currency  || 'USD',
    };

    const correlationId = crypto.randomUUID();
    const result = await xeniReq('POST', '/flights/api/v2/bookings', body, {
      'x-correlation-id': correlationId,
    });
    res.json(result);
  } catch (err) {
    console.error('Flight book:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
