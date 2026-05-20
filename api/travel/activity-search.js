const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination_id, destination, category, date, currency = 'USD' } = req.body || {};

    let destId = destination_id || '';

    if (!destId && destination) {
      try {
        const auto = await xeniReq(
          'GET',
          `/activities/api/v2/autocomplete?query=${encodeURIComponent(destination)}&limit=1`,
          null,
          { 'x-correlation-id': crypto.randomUUID() }
        );
        const suggestions = (auto.data && auto.data.suggestions) || auto.suggestions || [];
        destId = suggestions[0] ? (suggestions[0].id || '') : '';
      } catch (e) {
        console.warn('Activity autocomplete fallback failed:', e.message);
      }
    }

    if (!destId) return res.status(400).json({ error: 'Could not resolve destination. Please select from the autocomplete suggestions.' });

    const body = {
      destination_id: destId,
      currency,
      page: 1,
      limit: 20,
    };
    if (category) body.category = category;
    if (date) body.date = date;

    const result = await xeniReq('POST', '/activities/api/v2/search', body, {
      'x-correlation-id': crypto.randomUUID(),
    });
    res.json(result);
  } catch (err) {
    console.error('Activity search:', err.message, JSON.stringify(err.body));
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
