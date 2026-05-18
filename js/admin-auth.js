/* ============================================================
 * Teleio Tourism — Admin Authentication & RBAC Module
 *
 * Roles (highest → lowest):
 *   super-admin (5) — full access, system settings, manage all admins
 *   admin       (4) — manage users/applications/content, no system settings
 *   manager     (3) — approve visas, manage agents, view reports
 *   agent       (2) — process assigned visa applications
 *   viewer      (1) — read-only dashboard & reports
 *
 * Default login (seeded on first run):
 *   superadmin@teleio.com  /  Admin@2026!
 *   (all demo admins share the same default password above)
 * ============================================================ */
const ADMIN_AUTH = (() => {
  const ADMINS_KEY  = 'teleio_admins';
  const SESSION_KEY = 'teleio_admin_session';
  const SALT        = 'teleio_admin_rbac_2026';

  const ROLES = {
    'super-admin': { level: 5, label: 'Super Admin', color: '#7C3AED', bg: '#F3EDFF' },
    'admin':       { level: 4, label: 'Admin',       color: '#2563EB', bg: '#EFF6FF' },
    'manager':     { level: 3, label: 'Manager',     color: '#059669', bg: '#ECFDF5' },
    'agent':       { level: 2, label: 'Agent',       color: '#D97706', bg: '#FFFBEB' },
    'viewer':      { level: 1, label: 'Viewer',      color: '#6B7280', bg: '#F9FAFB' }
  };

  /* Permissions: feature key → minimum level required */
  const PERMS = {
    dashboard:        1,
    reports:          1,
    applications:     2,
    users:            3,
    content:          4,
    activityLog:      4,
    adminTeam:        5,
    systemSettings:   5
  };

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function uid() { return 'adm_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  function loadAdmins() {
    try { return JSON.parse(localStorage.getItem(ADMINS_KEY)) || []; }
    catch { return []; }
  }
  function saveAdmins(list) { localStorage.setItem(ADMINS_KEY, JSON.stringify(list)); }

  /* Seed default team on first run */
  async function _seed() {
    if (loadAdmins().length > 0) return;
    const defPass = 'Admin@2026!';
    const admins = [
      { role:'super-admin', name:'Super Admin',     email:'superadmin@teleio.com', department:'Management',       avatar:'👑' },
      { role:'admin',       name:'Ahmed Al-Rashid', email:'ahmed@teleio.com',       department:'Operations',       avatar:'👤' },
      { role:'manager',     name:'Sara Malik',      email:'sara@teleio.com',        department:'Visa Processing',  avatar:'👤' },
      { role:'agent',       name:'Khalid Hassan',   email:'khalid@teleio.com',      department:'Customer Support', avatar:'👤' },
      { role:'viewer',      name:'Priya Sharma',    email:'priya@teleio.com',       department:'Finance',          avatar:'👤' }
    ];
    const hashed = await Promise.all(admins.map(async a => ({
      id: uid(),
      ...a,
      level: ROLES[a.role].level,
      passwordHash: await sha256(defPass + SALT + a.email.toLowerCase()),
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: null
    })));
    saveAdmins(hashed);
  }

  /* ── Auth ── */
  async function signIn(email, password) {
    await _seed();
    const list  = loadAdmins();
    const admin = list.find(a => a.email === email.toLowerCase().trim());
    if (!admin)                         throw new Error('No admin account found with this email.');
    if (admin.status === 'suspended')   throw new Error('Account suspended. Contact Super Admin.');
    if (admin.status === 'inactive')    throw new Error('Account is inactive.');
    const hash = await sha256(password + SALT + email.toLowerCase().trim());
    if (hash !== admin.passwordHash)    throw new Error('Incorrect password.');
    admin.lastLogin = new Date().toISOString();
    saveAdmins(list);
    const session = { ...admin }; delete session.passwordHash;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    _logActivity(session, 'login', 'Signed in to admin panel');
    return session;
  }

  function signOut() {
    const admin = getCurrentAdmin();
    if (admin) _logActivity(admin, 'logout', 'Signed out');
    localStorage.removeItem(SESSION_KEY);
  }

  function getCurrentAdmin() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  }

  function isAuthenticated() { return !!getCurrentAdmin(); }

  function can(permission) {
    const admin = getCurrentAdmin();
    if (!admin) return false;
    return admin.level >= (PERMS[permission] || 99);
  }

  /* ── Admin CRUD ── */
  function getAdmins() { return loadAdmins(); }

  async function createAdmin({ name, email, password, role, department }) {
    if (!can('adminTeam')) throw new Error('Only Super Admin can create admin accounts.');
    const list = loadAdmins();
    if (list.some(a => a.email === email.toLowerCase())) throw new Error('Admin with this email already exists.');
    const r = ROLES[role] || ROLES['viewer'];
    const hash = await sha256((password || 'Admin@2026!') + SALT + email.toLowerCase());
    const admin = { id: uid(), name, email: email.toLowerCase(), passwordHash: hash,
      role, level: r.level, department: department || '', avatar: '👤',
      status: 'active', createdAt: new Date().toISOString(), lastLogin: null };
    list.push(admin);
    saveAdmins(list);
    _logActivity(getCurrentAdmin(), 'create_admin', `Created admin: ${email} (${role})`);
    return admin;
  }

  function updateAdmin(id, changes) {
    if (!can('admin')) throw new Error('Insufficient access.');
    const list = loadAdmins();
    const idx  = list.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Admin not found.');
    const target = list[idx];
    if (target.role === 'super-admin' && !can('adminTeam')) throw new Error('Cannot modify Super Admin.');
    if (changes.role) changes.level = (ROLES[changes.role] || {}).level || target.level;
    Object.assign(target, changes);
    saveAdmins(list);
    _logActivity(getCurrentAdmin(), 'update_admin', `Updated admin ${target.email}: ${JSON.stringify(changes)}`);
    return target;
  }

  function deleteAdmin(id) {
    if (!can('adminTeam')) throw new Error('Only Super Admin can delete admins.');
    const list = loadAdmins();
    const admin = list.find(a => a.id === id);
    if (!admin) throw new Error('Admin not found.');
    if (admin.role === 'super-admin') throw new Error('Cannot delete Super Admin account.');
    saveAdmins(list.filter(a => a.id !== id));
    _logActivity(getCurrentAdmin(), 'delete_admin', `Deleted admin: ${admin.email}`);
  }

  /* ── Activity Log ── */
  const LOG_KEY = 'teleio_admin_log';

  function _logActivity(admin, action, detail) {
    if (!admin) return;
    try {
      const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      log.unshift({ id: uid(), adminId: admin.id, adminName: admin.name,
        adminRole: admin.role, action, detail, ts: new Date().toISOString() });
      localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 200))); // keep last 200
    } catch(e) {}
  }

  function logActivity(action, detail) { _logActivity(getCurrentAdmin(), action, detail); }
  function getActivityLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
  }

  return { signIn, signOut, getCurrentAdmin, isAuthenticated, can, getAdmins,
           createAdmin, updateAdmin, deleteAdmin, logActivity, getActivityLog,
           getRoles: () => ROLES, getPerms: () => PERMS, seed: _seed };
})();
