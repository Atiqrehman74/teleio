const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { property_ids, filters = { ratings: [], name: '' }, sort = [] } = req.body;
    if (!property_ids || !property_ids.length)
      return res.status(400).json({ error: 'property_ids array is required' });

    const result = await xeniReq('POST', '/hotels/v2/hotel/content-ids', {
      property_ids,
      filters,
      sort,
    });

    res.json(result);
  } catch (err) {
    console.error('Hotel content-ids:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
