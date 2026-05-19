const { cors } = require('../_xeni');

// Vacation Rentals requires AWS SigV4 authentication — not available with current API keys.
// Returns a structured response so the frontend can show a meaningful message.
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.status(503).json({
    error: 'Vacation Rentals require upgraded API access. Please contact support.',
    _unavailable: true,
  });
};
