require('dotenv').config();
const express = require('express');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path    = require('path');
const https   = require('https');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Currency rates proxy ──────────────────────────────────────────────
// Cache: refreshed every 10 minutes
const rateCache = {};

function fetchFromXE(base) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.xe.com',
      path: `/api/protected/midmarket-converter/?from=${base}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.xe.com/currencyconverter/',
        'Origin': 'https://www.xe.com',
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('XE parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('XE timeout')); });
    req.end();
  });
}

function fetchFallback(base) {
  return new Promise((resolve, reject) => {
    const req = https.get(`https://api.frankfurter.app/latest?from=${base}`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ rates: json.rates, base: json.base, timestamp: new Date().toISOString(), source: 'frankfurter' });
        } catch { reject(new Error('Fallback parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Fallback timeout')); });
  });
}

app.get('/api/rates', async (req, res) => {
  const base = (req.query.base || 'AED').toUpperCase();
  const now  = Date.now();

  // Serve from cache if fresh (10 min)
  if (rateCache[base] && (now - rateCache[base].ts) < 10 * 60 * 1000) {
    return res.json(rateCache[base].data);
  }

  try {
    // Try XE.com first
    let result;
    try {
      const xe = await fetchFromXE(base);
      // XE returns { to: [ { quotecurrency, mid } ] }
      if (xe && xe.to && Array.isArray(xe.to)) {
        const rates = {};
        xe.to.forEach(r => { rates[r.quotecurrency] = r.mid; });
        rates[base] = 1;
        result = { base, rates, source: 'xe.com', timestamp: new Date().toISOString() };
      } else {
        throw new Error('Unexpected XE format');
      }
    } catch (xeErr) {
      // Fallback to Frankfurter (ECB mid-market — same data XE uses)
      console.log(`XE fetch failed (${xeErr.message}), using fallback`);
      result = await fetchFallback(base);
      result.rates[base] = 1;
    }

    rateCache[base] = { ts: now, data: result };
    res.json(result);
  } catch (err) {
    console.error('Rates error:', err.message);
    res.status(500).json({ error: 'Could not fetch rates', message: err.message });
  }
});

// ── Xeni Travel API proxy ─────────────────────────────────────────────
const XENI_BASE   = (process.env.XENI_API_URL || 'https://uat.travelapi.ai').replace(/\/$/, '');
const XENI_KEY    = process.env.XENI_API_KEY    || '';
const XENI_SECRET = process.env.XENI_SECRET_KEY || '';

let _xeniTokenCache = null;

function getXeniToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_xeniTokenCache && _xeniTokenCache.expiresAt > now + 60) return Promise.resolve(_xeniTokenCache.token);
  const payload = JSON.stringify({ api_key: XENI_KEY, secret: XENI_SECRET, timestamp: now });
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: new URL(XENI_BASE).hostname, port: 443,
      path: '/identity/v2/auth/generate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200)
          return reject(Object.assign(new Error(`Xeni auth ${res.statusCode}: ${data.slice(0,150)}`), { status: 401 }));
        try {
          const json = JSON.parse(data);
          const token = json.signature || json.token || json.access_token || data.trim();
          const expiresAt = (typeof json.expiry === 'number' ? json.expiry : null)
                         || (typeof json.expires_at === 'number' ? json.expires_at : null)
                         || (now + 3600);
          _xeniTokenCache = { token, expiresAt };
          resolve(token);
        } catch {
          _xeniTokenCache = { token: data.trim(), expiresAt: now + 3600 };
          resolve(_xeniTokenCache.token);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Xeni auth timeout')); });
    req.write(payload); req.end();
  });
}

async function xeniReq(method, endpoint, body) {
  const token = await getXeniToken();
  return new Promise((resolve, reject) => {
    const urlObj  = new URL(endpoint, XENI_BASE);
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': token },
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
          else reject(Object.assign(new Error(`Xeni ${res.statusCode}`), { status: res.statusCode, body: json }));
        } catch { reject(new Error(`Xeni parse error (${res.statusCode}): ${data.slice(0, 300)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Xeni request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// Hotel property detail
app.get('/api/travel/hotel-detail', require('./api/travel/hotel-detail'));

// Hotel room availability
app.post('/api/travel/hotel-availability', require('./api/travel/hotel-availability'));

// Hotels search (autocomplete → lat/long → properties with rates)
app.post('/api/travel/hotels', async (req, res) => {
  try {
    const { destination, checkIn, checkOut, adults = 2, children = 0 } = req.body;
    if (!destination || !checkIn || !checkOut) return res.status(400).json({ error: 'destination, checkIn and checkOut are required' });
    const auto = await xeniReq('GET', `/hotels/api/v2/autocomplete?key=${encodeURIComponent(destination)}&currency=USD`);
    const places = auto.data || (Array.isArray(auto) ? auto : []);
    if (!places.length) return res.json({ hotels: [], total: 0 });
    const { lat, long } = places[0].location;
    const result = await xeniReq('POST', '/hotels/api/v2/properties?currency=USD&page=1&limit=20', {
      lat, long, checkin_date: checkIn, checkout_date: checkOut,
      occupancy: [{ adults: Number(adults), childs: Number(children), childages: [] }],
      country_of_residence: 'US',
    });
    res.json(result);
  } catch (err) {
    console.error('Hotels error:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Flights search
app.post('/api/travel/flights', async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate, adults = 1, children = 0 } = req.body;
    if (!origin || !destination || !departureDate) return res.status(400).json({ error: 'origin, destination and departureDate are required' });
    const flightInfo = [{ departure_date: departureDate, origin, destination }];
    if (returnDate) flightInfo.push({ departure_date: returnDate, origin: destination, destination: origin });
    const result = await xeniReq('POST', '/flights/api/v2/search', {
      flight_info: flightInfo,
      route_type: returnDate ? 'return' : 'oneway',
      cabin_type: 'economy',
      adults: Number(adults), children: Number(children), infants: 0,
      pagination: { page: 1, limit: 20 },
    });
    res.json(result);
  } catch (err) {
    console.error('Flights error:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Cars search
app.post('/api/travel/cars', async (req, res) => {
  function toDateTime(d) { return d && !d.includes('T') ? d + 'T10:00:00' : d; }
  function getLocParams(loc, prefix, fallback) {
    if (loc.coordinates && (loc.coordinates.lat || loc.coordinates.lng))
      return `${prefix}_type=geo&${prefix}_geo=${encodeURIComponent(loc.coordinates.lat + ',' + loc.coordinates.lng)}`;
    const iata = loc.iata_code || (loc.type === 'airport' && loc.code) || '';
    if (iata) return `${prefix}_type=airport&${prefix}_iata=${encodeURIComponent(iata)}`;
    return `${prefix}_type=geo&${prefix}_geo=${encodeURIComponent(fallback || '')}`;
  }
  try {
    const { pickupLocation, pickupDate, returnDate, dropoffLocation } = req.body;
    if (!pickupLocation || !pickupDate || !returnDate) return res.status(400).json({ error: 'pickupLocation, pickupDate and returnDate are required' });
    const auto = await xeniReq('GET', `/cars/api/v2/autocomplete?key=${encodeURIComponent(pickupLocation)}`);
    const locs = Array.isArray(auto) ? auto : (auto.data || auto.locations || []);
    const loc = locs[0];
    if (!loc) return res.json({ rentals: [], message: 'Location not found. Try a city or airport code.' });
    const dropLoc = loc;
    const country = loc.country_code || 'AE';
    const pickupParams = getLocParams(loc, 'pickup', pickupLocation);
    const returnParams = getLocParams(dropLoc, 'return', pickupLocation);
    const pd = encodeURIComponent(toDateTime(pickupDate));
    const rd = encodeURIComponent(toDateTime(returnDate));
    const result = await xeniReq('GET',
      `/cars/api/v2/rentals?country=${country}&${pickupParams}&${returnParams}` +
      `&currency=USD&pickup_date=${pd}&return_date=${rd}&driver_age=25&page=1&limit=20`
    );
    res.json(result);
  } catch (err) {
    console.error('Cars error:', err.message, err.body && JSON.stringify(err.body));
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Activities search
app.post('/api/travel/activities', async (req, res) => {
  try {
    const { destination, category } = req.body;
    if (!destination) return res.status(400).json({ error: 'destination is required' });
    const auto = await xeniReq('GET', `/activities/api/v2/autocomplete?query=${encodeURIComponent(destination)}&limit=1`);
    const places = Array.isArray(auto) ? auto : (auto.data || auto.results || []);
    const destinationId = places[0] ? (places[0].destination_id || places[0].id || '') : '';
    const body = { currency: 'USD', pagination: { page: 1, limit: 20 } };
    if (destinationId) body.destination_id = destinationId;
    if (category) body.category = category;
    const result = await xeniReq('POST', '/activities/api/v2/search', body);
    res.json(result);
  } catch (err) {
    console.error('Activities error:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Resorts (vacation packages) search
app.post('/api/travel/resorts', async (req, res) => {
  try {
    const { destination } = req.body;
    if (!destination) return res.status(400).json({ error: 'destination is required' });
    const result = await xeniReq('GET', `/resorts/api/v2/search?key=${encodeURIComponent(destination)}&currency=USD`);
    res.json(result);
  } catch (err) {
    console.error('Resorts error:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Keep old packages route for backward compat
app.post('/api/travel/packages', async (req, res) => {
  try {
    const { destination } = req.body;
    if (!destination) return res.status(400).json({ error: 'destination is required' });
    const result = await xeniReq('GET', `/resorts/api/v2/search?key=${encodeURIComponent(destination)}&currency=USD`);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Vacation Rentals search
app.post('/api/travel/vacation-rentals', async (req, res) => {
  try {
    const { destination, checkIn, checkOut, adults = 2, children = 0 } = req.body;
    if (!destination || !checkIn || !checkOut) return res.status(400).json({ error: 'destination, checkIn and checkOut are required' });
    const auto = await xeniReq('GET', `/vacation-rentals/api/v2/autocomplete?key=${encodeURIComponent(destination)}&currency=USD`);
    const places = auto.data || (Array.isArray(auto) ? auto : []);
    if (!places.length) return res.json({ properties: [], total: 0 });
    const loc = places[0];
    const locationId = loc.id || loc.location_id || loc.destination_id || '';
    const coords = loc.location || loc.coordinates || {};
    const body = {
      checkin_date: checkIn, checkout_date: checkOut,
      occupancy: [{ adults: Number(adults), children: Number(children) }],
      currency: 'USD', pagination: { page: 1, limit: 20 },
    };
    if (locationId) body.location_id = locationId;
    if (coords.lat) { body.lat = coords.lat; body.long = coords.long; }
    const result = await xeniReq('POST', '/vacation-rentals/api/v2/search', body);
    res.json(result);
  } catch (err) {
    console.error('Vacation Rentals error:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Deals search
app.get('/api/travel/deals', async (req, res) => {
  try {
    const location = req.query.location || 'Dubai';
    const result = await xeniReq('GET', `/deals/api/v2/search?location=${encodeURIComponent(location)}&currency=USD`);
    res.json(result);
  } catch (err) {
    console.error('Deals error:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Return publishable key to frontend (safe — it's public)
app.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Create a PaymentIntent — secret key never leaves the server
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'aed', description } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100), // AED → fils (smallest unit)
      currency,
      description: description || 'Teleio Tourism Visa Application',
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Stripe webhook (optional — verify payment server-side)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    console.log(`Payment succeeded: ${pi.id} — AED ${pi.amount / 100}`);
  }

  res.json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Teleio Tourism running → http://localhost:${PORT}`);
  console.log(`   Stripe mode: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? '🔴 LIVE' : '🟡 TEST'}\n`);
});
