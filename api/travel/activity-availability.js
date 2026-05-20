const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { product_code, date, pax_mix, currency = 'USD' } = req.body || {};
    if (!product_code) return res.status(400).json({ error: 'product_code is required' });
    if (!date)         return res.status(400).json({ error: 'date is required' });

    const body = {
      product_code,
      date,
      pax_mix: pax_mix && pax_mix.length ? pax_mix : [{ age_band: 'ADULT', count: 1 }],
      currency,
    };

    const result = await xeniReq('POST', '/activities/api/v2/availability', body, {
      'x-correlation-id': crypto.randomUUID(),
    });
    res.json(result);
  } catch (err) {
    console.error('Activity availability:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
