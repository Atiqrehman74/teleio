const https = require('https');
const { cors } = require('./_xeni');

module.exports = (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  // Only proxy from trusted Xeni CDN
  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).json({ error: 'invalid url' }); }
  if (!parsed.hostname.endsWith('travelapi.ai')) {
    return res.status(403).json({ error: 'forbidden host' });
  }

  const opts = {
    hostname: parsed.hostname,
    port: 443,
    path: parsed.pathname + parsed.search,
    method: 'GET',
    headers: { 'Accept': 'image/*', 'User-Agent': 'Teleio/1.0' },
  };

  const upstream = https.request(opts, upstreamRes => {
    if (upstreamRes.statusCode !== 200) {
      return res.status(upstreamRes.statusCode).end();
    }
    res.setHeader('Content-Type', upstreamRes.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    upstreamRes.pipe(res);
  });
  upstream.on('error', () => res.status(502).end());
  upstream.setTimeout(10000, () => { upstream.destroy(); res.status(504).end(); });
  upstream.end();
};
