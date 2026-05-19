const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { property_id, checkin_date, checkout_date, adults = 2, children = 0, country_of_residence = 'US' } = req.body;
    if (!property_id || !checkin_date || !checkout_date)
      return res.status(400).json({ error: 'property_id, checkin_date and checkout_date are required' });

    const result = await xeniReq('POST', '/hotels/api/v2/properties/availability', {
      property_id,
      checkin_date,
      checkout_date,
      occupancy: [{ adults: Number(adults), childs: Number(children), childages: [] }],
      country_of_residence,
    });
    res.json(result);
  } catch (err) {
    console.error('Hotel availability:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
