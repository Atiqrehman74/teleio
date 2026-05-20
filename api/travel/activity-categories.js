const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = await xeniReq('GET', '/activities/api/v2/categories', null, {
      'x-correlation-id': crypto.randomUUID(),
    });
    res.json(result);
  } catch (err) {
    console.error('Activity categories:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
