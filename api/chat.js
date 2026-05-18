'use strict';
/* Vercel serverless function — proxies to Groq, keeps API key server-side */
var https = require('https');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  var apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) { res.status(503).json({ error: 'GROQ_API_KEY not configured' }); return; }

  var messages = req.body && req.body.messages;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array required' });
    return;
  }

  var payload = JSON.stringify({
    model: 'llama3-8b-8192',
    messages: messages,
    max_tokens: 200,
    temperature: 0.75
  });

  var options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  var request = https.request(options, function (response) {
    var data = '';
    response.on('data', function (chunk) { data += chunk; });
    response.on('end', function () {
      try {
        res.status(200).json(JSON.parse(data));
      } catch (e) {
        res.status(500).json({ error: 'Parse error', raw: data.slice(0, 300) });
      }
    });
  });

  request.on('error', function (err) {
    res.status(500).json({ error: err.message });
  });

  request.write(payload);
  request.end();
};
