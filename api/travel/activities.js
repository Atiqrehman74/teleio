const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, date, category } = req.body;
    if (!destination)
      return res.status(400).json({ error: 'destination is required' });

    // Autocomplete to get destination_id
    const auto = await xeniReq('GET',
      `/activities/api/v2/autocomplete?query=${encodeURIComponent(destination)}&limit=1`
    );
    const places = Array.isArray(auto) ? auto : (auto.data || auto.results || []);
    const destinationId = places[0] ? (places[0].destination_id || places[0].id || '') : '';

    const body = {
      currency: 'USD',
      pagination: { page: 1, limit: 20 },
    };
    if (destinationId) body.destination_id = destinationId;
    if (category) body.category = category;

    const result = await xeniReq('POST', '/activities/api/v2/search', body);
    res.json(result);
  } catch (err) {
    console.error('Activities:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
