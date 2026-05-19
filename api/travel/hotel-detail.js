const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const id = req.query && req.query.id;
    if (!id) return res.status(400).json({ error: 'id is required' });

    const result = await xeniReq('GET', `/hotels/v2/property/${id}`);
    res.json(result);
  } catch (err) {
    console.error('Hotel detail:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
