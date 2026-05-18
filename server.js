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
