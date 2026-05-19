const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { destination, date, category } = req.body;
    if (!destination) return res.status(400).json({ error: 'destination is required' });

    // Try autocomplete with ?key= first (same pattern as hotels/cars), then ?query=
    let destinationId = '';
    let autoDebug = {};
    for (const param of ['key', 'query']) {
      try {
        const auto = await xeniReq('GET',
          `/activities/api/v2/autocomplete?${param}=${encodeURIComponent(destination)}&limit=5`
        );
        // Xeni autocomplete returns: { data: { suggestions: [...] } }
        const places = Array.isArray(auto) ? auto
          : (auto.data && auto.data.suggestions ? auto.data.suggestions
            : (Array.isArray(auto.data) ? auto.data
              : (auto.results || auto.suggestions || auto.items || [])));
        if (places && places.length) {
          const p = places[0];
          // ID field is "id" (e.g. "XN828")
          destinationId = p.destination_id || p.destinationId || p.id || p.code || '';
          autoDebug = { param, name: p.text || p.name, id: destinationId, keys: Object.keys(p) };
          console.log('Activities autocomplete OK:', JSON.stringify(autoDebug));
          break;
        }
        autoDebug = { param, result: 'empty array', raw: JSON.stringify(auto).slice(0, 150) };
      } catch (e) {
        autoDebug = { param, error: e.message, body: e.body };
        console.log(`Activities autocomplete ?${param} failed:`, e.message);
      }
    }

    // Build search body — try both destination_id and city string
    const body = { currency: 'USD', pagination: { page: 1, limit: 20 } };
    if (destinationId) body.destination_id = destinationId;
    else               body.destination    = destination;
    if (category)      body.category       = category;
    if (date)          body.start_date     = date;

    let result;
    try {
      result = await xeniReq('POST', '/activities/api/v2/search', body);
    } catch (searchErr) {
      // Return structured error so frontend can show it
      return res.status(searchErr.status || 500).json({
        error: searchErr.message,
        body: searchErr.body,
        _debug: { autoDebug, searchBody: body }
      });
    }

    // Extract first activity for key inspection
    const sampleKeys = (() => {
      const lists = ['activities','results','items','tours','experiences'];
      for (const k of lists) {
        const arr = result[k] || (result.data && result.data[k]);
        if (Array.isArray(arr) && arr[0]) return { key: k, fields: Object.keys(arr[0]), sample: arr[0] };
      }
      if (Array.isArray(result.data) && result.data[0]) return { key:'data', fields: Object.keys(result.data[0]), sample: result.data[0] };
      return { topKeys: Object.keys(result) };
    })();
    res.json({ ...result, _debug: { destinationId, destination, autoDebug, sampleKeys } });
  } catch (err) {
    console.error('Activities outer:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
