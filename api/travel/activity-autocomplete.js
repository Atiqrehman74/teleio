const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'query is required' });

    const correlationId = crypto.randomUUID();
    const result = await xeniReq(
      'GET',
      `/activities/api/v2/autocomplete?query=${encodeURIComponent(query)}&limit=8`,
      null,
      { 'x-correlation-id': correlationId }
    );
    res.json(result);
  } catch (err) {
    console.error('Activity autocomplete:', err.message, JSON.stringify(err.body));
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
