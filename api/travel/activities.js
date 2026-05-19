const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, date, category } = req.body;
    if (!destination)
      return res.status(400).json({ error: 'destination is required' });

    // Step 1: autocomplete
    let destinationId = '';
    let destinationName = destination;
    try {
      const auto = await xeniReq('GET',
        `/activities/api/v2/autocomplete?query=${encodeURIComponent(destination)}&limit=5`
      );
      const places = Array.isArray(auto) ? auto
        : (auto.data || auto.results || auto.suggestions || auto.items || []);

      if (places.length) {
        const p = places[0];
        destinationId = p.destination_id || p.destinationId || p.id || p.code || '';
        destinationName = p.name || p.destination_name || destination;
        console.log('Activities autocomplete hit:', JSON.stringify(p).slice(0, 200));
      }
    } catch (autoErr) {
      console.log('Activities autocomplete failed:', autoErr.message);
    }

    // Step 2: search
    const body = {
      currency: 'USD',
      pagination: { page: 1, limit: 20 },
    };
    if (destinationId)    body.destination_id = destinationId;
    if (destinationName)  body.destination    = destinationName;
    if (category)         body.category       = category;
    if (date)             body.start_date     = date;

    const result = await xeniReq('POST', '/activities/api/v2/search', body);

    // Pass raw result with debug info so frontend can extract correctly
    res.json({ ...result, _debug: { destinationId, destinationName } });
  } catch (err) {
    console.error('Activities:', err.message, err.body && JSON.stringify(err.body).slice(0, 300));
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
