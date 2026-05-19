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

function xeniReq(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const urlObj  = new URL(endpoint, XENI_BASE);
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${XENI_KEY}`,
        'x-api-key': XENI_KEY,
        'x-api-secret': XENI_SECRET,
        'x-teleio-agent': 'teleio-tourism/1.0',
      },
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
        } catch { reject(new Error(`Xeni parse error (status ${res.statusCode}): ${data.slice(0, 300)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Xeni request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// Hotels search
app.post('/api/travel/hotels', async (req, res) => {
  try {
    const { destination, checkIn, checkOut, rooms = 1, adults = 2, children = 0 } = req.body;
    if (!destination || !checkIn || !checkOut) return res.status(400).json({ error: 'destination, checkIn and checkOut are required' });
    const result = await xeniReq('POST', '/api/v2/hotels/search', {
      destination, checkIn, checkOut,
      occupancies: [{ rooms: Number(rooms), adults: Number(adults), children: Number(children) }],
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
    const result = await xeniReq('POST', '/api/v2/flights/search', {
      origin, destination, departureDate,
      ...(returnDate ? { returnDate } : {}),
      passengers: { adults: Number(adults), children: Number(children) },
    });
    res.json(result);
  } catch (err) {
    console.error('Flights error:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Cars search
app.post('/api/travel/cars', async (req, res) => {
  try {
    const { pickupLocation, pickupDate, returnDate, dropoffLocation } = req.body;
    if (!pickupLocation || !pickupDate || !returnDate) return res.status(400).json({ error: 'pickupLocation, pickupDate and returnDate are required' });
    const result = await xeniReq('POST', '/api/v2/cars/search', {
      pickupLocation, dropoffLocation: dropoffLocation || pickupLocation,
      pickupDate, returnDate,
    });
    res.json(result);
  } catch (err) {
    console.error('Cars error:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Activities / tours search (UAE tourism + packages)
app.post('/api/travel/activities', async (req, res) => {
  try {
    const { destination, date, category } = req.body;
    if (!destination) return res.status(400).json({ error: 'destination is required' });
    const result = await xeniReq('POST', '/api/v2/activities/search', {
      destination, ...(date ? { date } : {}), ...(category ? { category } : {}),
    });
    res.json(result);
  } catch (err) {
    console.error('Activities error:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Packages search
app.post('/api/travel/packages', async (req, res) => {
  try {
    const { origin, destination, departureDate, adults = 2 } = req.body;
    if (!destination || !departureDate) return res.status(400).json({ error: 'destination and departureDate are required' });
    const result = await xeniReq('POST', '/api/v2/packages/search', {
      origin, destination, departureDate, passengers: { adults: Number(adults) },
    });
    res.json(result);
  } catch (err) {
    console.error('Packages error:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
});

// Hotel detail / rooms
app.get('/api/travel/hotels/:hotelId', async (req, res) => {
  try {
    const { checkIn, checkOut, adults = 2 } = req.query;
    const result = await xeniReq('GET',
      `/api/v2/hotels/${req.params.hotelId}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`
    );
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
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
