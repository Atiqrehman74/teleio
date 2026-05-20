const crypto = require('crypto');
const { xeniReq, cors } = require('../_xeni');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { availability_token, contact, participants, questions, language_guide } = req.body || {};
    if (!availability_token)      return res.status(400).json({ error: 'availability_token is required' });
    if (!contact || !contact.email) return res.status(400).json({ error: 'contact.email is required' });

    const body = { contact, participants: participants || [], questions: questions || [] };
    if (language_guide) body.language_guide = language_guide;

    const result = await xeniReq(
      'POST',
      `/activities/api/v2/bookings?availability_token=${encodeURIComponent(availability_token)}`,
      body,
      { 'x-correlation-id': crypto.randomUUID() }
    );
    res.json(result);
  } catch (err) {
    console.error('Activity book:', err.message);
    res.status(err.status || 500).json({ error: err.message, body: err.body });
  }
};
