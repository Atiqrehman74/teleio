const { xeniReq, cors } = require('../_xeni');
const crypto = require('crypto');

function extractCode(val) {
  if (!val) return '';
  var m = /\(([A-Z]{3})\)\s*$/.exec(val.trim());
  if (m) return m[1];
  if (/^[A-Z]{3}$/.test(val.trim())) return val.trim();
  return val.trim().toUpperCase().slice(0, 3);
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { origin, destination, departureDate, returnDate, adults, children, infants, cabinType } = req.body || {};
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ error: 'origin, destination and departureDate are required' });
    }

    const originCode = extractCode(origin);
    const destCode   = extractCode(destination);
    const isRoundTrip = !!returnDate;

    const flightInfo = [{ departure_date: departureDate, origin: originCode, destination: destCode }];
    if (isRoundTrip) {
      flightInfo.push({ departure_date: returnDate, origin: destCode, destination: originCode });
    }

    const body = {
      flight_info: flightInfo,
      route_type: isRoundTrip ? 'RoundTrip' : 'OneWay',
      cabin_type: cabinType || 'Economy',
      adults:   parseInt(adults)   || 1,
      children: parseInt(children) || 0,
      infants:  parseInt(infants)  || 0,
      pagination: { page: 1, limit: 10 },
    };

    const correlationId = crypto.randomUUID();
    const result = await xeniReq('POST', '/flights/api/v2/search', body, {
      'x-correlation-id': correlationId,
    });
    res.json(result);
  } catch (err) {
    console.error('Flight search:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
