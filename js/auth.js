/* Teleio Tourism — Auth Module
 * localStorage "database" — users + session
 * Passwords: SHA-256 via Web Crypto API (salt + email)
 */
const AUTH = (() => {
  const USERS_KEY    = 'teleio_users';
  const SESSION_KEY  = 'teleio_session';
  const SALT         = 'teleio_2026_uae_salt';

  /* ── helpers ── */
  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function _createSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      userId:      user.id,
      email:       user.email,
      firstName:   user.firstName,
      lastName:    user.lastName,
      nationality: user.nationality,
      loginAt:     new Date().toISOString()
    }));
  }

  /* ── public API ── */
  async function register(firstName, lastName, email, password, nationality) {
    if (!firstName || !email || !password) throw new Error('All required fields must be filled in.');
    if (password.length < 8)               throw new Error('Password must be at least 8 characters.');

    const users = loadUsers();
    const key   = email.toLowerCase().trim();
    if (users.some(u => u.email === key))  throw new Error('An account with this email already exists.');

    const hash = await sha256(password + SALT + key);
    const user = {
      id:          uid(),
      firstName:   firstName.trim(),
      lastName:    lastName.trim(),
      email:       key,
      passwordHash: hash,
      nationality: nationality || '',
      createdAt:   new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    _createSession(user);
    return user;
  }

  async function signIn(email, password) {
    if (!email || !password) throw new Error('Email and password are required.');
    const key   = email.toLowerCase().trim();
    const users = loadUsers();
    const user  = users.find(u => u.email === key);
    if (!user) throw new Error('No account found with this email address.');

    const hash = await sha256(password + SALT + key);
    if (hash !== user.passwordHash) throw new Error('Incorrect password. Please try again.');
    _createSession(user);
    return user;
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  }

  function isAuthenticated() { return !!getCurrentUser(); }

  /* Social sign-in — creates account on first login, reuses on subsequent */
  function socialSignIn(profile) {
    const users = loadUsers();
    const emailKey = (profile.email || '').toLowerCase().trim();

    /* find existing user by social ID or by email */
    let user = users.find(u =>
      (u.socialProvider === profile.provider && u.socialId === profile.id) ||
      (emailKey && u.email === emailKey)
    );

    if (!user) {
      user = {
        id:             uid(),
        firstName:      profile.firstName || '',
        lastName:       profile.lastName  || '',
        email:          emailKey,
        passwordHash:   null,
        socialProvider: profile.provider,
        socialId:       profile.id,
        nationality:    '',
        createdAt:      new Date().toISOString()
      };
      users.push(user);
      saveUsers(users);
    } else if (!user.socialProvider) {
      /* existing email user — link social account */
      user.socialProvider = profile.provider;
      user.socialId       = profile.id;
      saveUsers(users);
    }

    _createSession(user);
    return user;
  }

  function getAllUsers() { return loadUsers(); }

  return { register, signIn, signOut, getCurrentUser, isAuthenticated, getAllUsers, socialSignIn };
})();
