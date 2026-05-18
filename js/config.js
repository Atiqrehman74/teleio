/* ============================================================
 * Teleio Tourism — Social Auth Configuration
 * Replace the empty strings below with your real credentials.
 *
 * GOOGLE:
 *   1. Go to https://console.cloud.google.com/
 *   2. Create a project → APIs & Services → Credentials
 *   3. Create OAuth 2.0 Client ID (Web application)
 *   4. Add your site URL to "Authorized JavaScript origins"
 *      e.g. https://yourdomain.com  (file:// does NOT work)
 *   5. Copy the Client ID here
 *
 * FACEBOOK:
 *   1. Go to https://developers.facebook.com/
 *   2. Create App → Consumer → set up Facebook Login
 *   3. Add your site domain to "Valid OAuth Redirect URIs"
 *   4. Copy the App ID here
 * ============================================================ */

const APP_CONFIG = {
  google: {
    clientId: ''          // e.g. '123456789-abc.apps.googleusercontent.com'
  },
  facebook: {
    appId:   '',          // e.g. '1234567890123456'
    version: 'v19.0'
  },

  /* ── AI Chatbot ──────────────────────────────────────────
   * provider: 'openai'  → https://platform.openai.com/api-keys
   *           'groq'    → https://console.groq.com/keys  (FREE, fast)
   *
   * OpenAI models : 'gpt-4o-mini'  'gpt-3.5-turbo'  'gpt-4o'
   * Groq models   : 'llama3-8b-8192'  'mixtral-8x7b-32768'  'gemma-7b-it'
   *
   * Leave apiKey empty '' to use the built-in keyword-based fallback.
   * ─────────────────────────────────────────────────────── */
  chatbot: {
    provider: 'groq',
    apiKey:   '',
    model:    'llama3-8b-8192'
  }
};
