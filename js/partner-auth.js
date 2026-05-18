/* ============================================================
 * Teleio Tourism — Partner Authentication & Commission Module
 *
 * Tiers (by total approved referrals):
 *   Platinum (50+)  — 15% commission, daily payouts
 *   Gold     (20+)  — 12% commission, weekly payouts
 *   Silver   (10+)  — 10% commission, bi-weekly payouts
 *   Bronze   (0+)   —  8% commission, monthly payouts
 * ============================================================ */
const PARTNER_AUTH = (() => {
  const PARTNERS_KEY = 'teleio_partners';
  const SESSION_KEY  = 'teleio_partner_session';
  const SALT         = 'teleio_partner_2026';

  const TIERS = {
    platinum: { min:50, label:'Platinum', commission:15, color:'#7C3AED', bg:'#F3EDFF', payout:'Daily',      next:null      },
    gold:     { min:20, label:'Gold',     commission:12, color:'#D97706', bg:'#FFFBEB', payout:'Weekly',     next:'platinum' },
    silver:   { min:10, label:'Silver',   commission:10, color:'#6B7280', bg:'#F1F5F9', payout:'Bi-weekly',  next:'gold'     },
    bronze:   { min:0,  label:'Bronze',   commission:8,  color:'#C2933A', bg:'#FFF8E7', payout:'Monthly',    next:'silver'   }
  };

  const TYPES = {
    'travel-agency': 'Travel Agency',
    'tour-operator':  'Tour Operator',
    'hotel':          'Hotel / Resort',
    'freelance':      'Freelance Agent',
    'corporate':      'Corporate'
  };

  /* ── Crypto helpers ── */
  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  function uid()     { return 'prt_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function refCode() { return 'TL' + Math.random().toString(36).slice(2,8).toUpperCase(); }

  /* ── Storage ── */
  function loadPartners() {
    try { return JSON.parse(localStorage.getItem(PARTNERS_KEY)) || []; }
    catch { return []; }
  }
  function savePartners(list) { localStorage.setItem(PARTNERS_KEY, JSON.stringify(list)); }

  /* ── Tier calculation ── */
  function getTierKey(referrals) {
    if (referrals >= 50) return 'platinum';
    if (referrals >= 20) return 'gold';
    if (referrals >= 10) return 'silver';
    return 'bronze';
  }

  /* ── Mock referral generator ── */
  function _mockReferrals(count, commRate, startDaysAgo) {
    const countries = ['UK','USA','UAE','Turkey','Thailand','Schengen','Canada','Australia','Malaysia','France'];
    const statuses  = ['approved','approved','approved','pending','processing','approved','approved','pending'];
    const names     = ['Ahmed Ali','Sara Khan','John Smith','Maria Rossi','Wei Chen','Fatima Sayed','Omar Hassan','Priya Nair','James Wilson','Layla Malik','Tariq Ahmad','Ana Silva'];
    const amounts   = [299,450,199,380,250,620,310,175,490,340];
    return Array.from({length: count}, (_, i) => {
      const amt    = amounts[i % amounts.length];
      const status = statuses[i % statuses.length];
      const comm   = status === 'approved' ? Math.round(amt * commRate / 100) : 0;
      return {
        id:         'ref_' + uid(),
        client:     names[i % names.length],
        country:    countries[i % countries.length],
        visaType:   ['Tourist','Business','Student','Work'][i % 4],
        amount:     amt,
        commission: comm,
        status:     status,
        date:       new Date(Date.now() - (i * 4 + (startDaysAgo||0)) * 86400000).toISOString()
      };
    });
  }

  /* ── Aggregate earned / pending from referral list ── */
  function _calcTotals(refs, commRate) {
    let earned = 0, pending = 0;
    refs.forEach(r => {
      if (r.status === 'approved')   earned  += r.commission;
      if (r.status === 'pending' || r.status === 'processing') pending += Math.round(r.amount * commRate / 100);
    });
    return { earned, pending };
  }

  /* ── Seed 6 demo partners on first run ── */
  async function _seed() {
    if (loadPartners().length > 0) return;
    const defPass = 'Partner@2026!';

    const specs = [
      {
        firstName:'Khalid', lastName:'Al-Mansoori', company:'Atlas Tourism Group',
        type:'tour-operator', email:'khalid.partner@teleio.com',
        phone:'+971 50 111 2233', country:'UAE', city:'Dubai', department:'Operations',
        tier:'platinum', referrals:67, bookings:52, joinedAt:'2024-08-15T08:00:00Z',
        status:'active', referralCount:67
      },
      {
        firstName:'Ahmed', lastName:'Al-Rashid', company:'Sky Travel Agency',
        type:'travel-agency', email:'demo@teleio.com',
        phone:'+971 55 234 5678', country:'UAE', city:'Dubai', department:'Sales',
        tier:'gold', referrals:24, bookings:18, joinedAt:'2025-01-10T08:00:00Z',
        status:'active', referralCount:24
      },
      {
        firstName:'Sara', lastName:'Malik', company:'Independent',
        type:'freelance', email:'sara.partner@teleio.com',
        phone:'+971 52 345 6789', country:'UAE', city:'Abu Dhabi', department:'',
        tier:'silver', referrals:14, bookings:11, joinedAt:'2025-03-20T08:00:00Z',
        status:'active', referralCount:14
      },
      {
        firstName:'Fatima', lastName:'Al-Sayed', company:'Global Corp Solutions',
        type:'corporate', email:'fatima.partner@teleio.com',
        phone:'+971 56 456 7890', country:'UAE', city:'Dubai', department:'HR',
        tier:'silver', referrals:11, bookings:9, joinedAt:'2025-04-05T08:00:00Z',
        status:'active', referralCount:11
      },
      {
        firstName:'Priya', lastName:'Sharma', company:'Palm Beach Hotel',
        type:'hotel', email:'priya.partner@teleio.com',
        phone:'+971 58 567 8901', country:'UAE', city:'Sharjah', department:'Concierge',
        tier:'bronze', referrals:5, bookings:3, joinedAt:'2025-06-01T08:00:00Z',
        status:'active', referralCount:5
      },
      {
        firstName:'James', lastName:'Wilson', company:'Horizon Travel Ltd',
        type:'travel-agency', email:'james.partner@teleio.com',
        phone:'+44 7700 900 123', country:'UK', city:'London', department:'Visas',
        tier:'bronze', referrals:2, bookings:1, joinedAt:'2026-02-14T08:00:00Z',
        status:'pending', referralCount:2
      }
    ];

    const hashed = await Promise.all(specs.map(async sp => {
      const commRate  = TIERS[sp.tier].commission;
      const refs      = _mockReferrals(sp.referralCount, commRate, 0);
      const totals    = _calcTotals(refs, commRate);
      const hash      = await sha256(defPass + SALT + sp.email.toLowerCase());
      return {
        id:           uid(),
        firstName:    sp.firstName,
        lastName:     sp.lastName,
        company:      sp.company,
        type:         sp.type,
        email:        sp.email.toLowerCase(),
        phone:        sp.phone,
        country:      sp.country,
        city:         sp.city || '',
        department:   sp.department || '',
        passwordHash: hash,
        referralCode: 'TL' + sp.firstName.toUpperCase().slice(0,4) + Math.floor(Math.random()*100),
        tier:         sp.tier,
        referrals:    sp.referrals,
        bookings:     sp.bookings,
        earned:       totals.earned,
        pending:      totals.pending,
        status:       sp.status,
        joinedAt:     sp.joinedAt,
        lastLogin:    null,
        notes:        '',
        bankDetails:  '',
        referralList: refs
      };
    }));

    savePartners(hashed);
  }

  /* ── Auth ── */
  async function signIn(email, password) {
    await _seed();
    const list    = loadPartners();
    const partner = list.find(p => p.email === email.toLowerCase().trim());
    if (!partner)                        throw new Error('No partner account found with this email.');
    if (partner.status === 'suspended')  throw new Error('Account suspended. Contact support@teleio.com.');
    if (partner.status === 'pending')    throw new Error('Account pending approval. You will be notified by email.');
    const hash = await sha256(password + SALT + email.toLowerCase().trim());
    if (hash !== partner.passwordHash)   throw new Error('Incorrect password.');
    partner.tier      = getTierKey(partner.referrals);
    partner.lastLogin = new Date().toISOString();
    savePartners(list);
    const session = { ...partner }; delete session.passwordHash;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async function register({ firstName, lastName, email, password, company, type, phone, country }) {
    await _seed();
    const list = loadPartners();
    if (list.some(p => p.email === email.toLowerCase())) throw new Error('Email already registered as a partner.');
    const hash = await sha256(password + SALT + email.toLowerCase());
    const partner = {
      id: uid(), firstName, lastName, company, type,
      phone: phone||'', country: country||'', city:'', department:'', bankDetails:'', notes:'',
      email: email.toLowerCase(), passwordHash: hash,
      referralCode: refCode(),
      tier:'bronze', referrals:0, bookings:0, earned:0, pending:0,
      status:'active', joinedAt: new Date().toISOString(), lastLogin: null,
      referralList: []
    };
    list.push(partner);
    savePartners(list);
    const session = { ...partner }; delete session.passwordHash;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function signOut() { localStorage.removeItem(SESSION_KEY); }

  function getCurrentPartner() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  }

  function isAuthenticated() { return !!getCurrentPartner(); }

  function updateSession(changes) {
    const list    = loadPartners();
    const partner = getCurrentPartner();
    if (!partner) return;
    const idx = list.findIndex(p => p.id === partner.id);
    if (idx === -1) return;
    Object.assign(list[idx], changes);
    savePartners(list);
    const session = { ...list[idx] }; delete session.passwordHash;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  /* ── Admin management functions ── */
  function getPartners() {
    return loadPartners().map(p => {
      const s = { ...p }; delete s.passwordHash; return s;
    });
  }

  function getAggregateStats() {
    const list = loadPartners();
    return {
      total:     list.length,
      active:    list.filter(p => p.status === 'active').length,
      pending:   list.filter(p => p.status === 'pending').length,
      suspended: list.filter(p => p.status === 'suspended').length,
      platinum:  list.filter(p => p.tier === 'platinum').length,
      gold:      list.filter(p => p.tier === 'gold').length,
      silver:    list.filter(p => p.tier === 'silver').length,
      bronze:    list.filter(p => p.tier === 'bronze').length,
      totalReferrals: list.reduce((s,p) => s + (p.referrals||0), 0),
      totalBookings:  list.reduce((s,p) => s + (p.bookings||0), 0),
      totalEarned:    list.reduce((s,p) => s + (p.earned||0), 0),
      totalPending:   list.reduce((s,p) => s + (p.pending||0), 0)
    };
  }

  function updatePartnerStatus(id, status) {
    const list = loadPartners();
    const idx  = list.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Partner not found.');
    list[idx].status = status;
    savePartners(list);
    return list[idx];
  }

  function updatePartnerAdmin(id, changes) {
    const list = loadPartners();
    const idx  = list.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Partner not found.');
    Object.assign(list[idx], changes);
    if (changes.referrals !== undefined) list[idx].tier = getTierKey(list[idx].referrals);
    savePartners(list);
    return list[idx];
  }

  function deletePartner(id) {
    const list = loadPartners();
    const partner = list.find(p => p.id === id);
    if (!partner) throw new Error('Partner not found.');
    savePartners(list.filter(p => p.id !== id));
  }

  function addReferral(partnerId, refData) {
    const list = loadPartners();
    const idx  = list.findIndex(p => p.id === partnerId);
    if (idx === -1) return;
    const p       = list[idx];
    const comm    = Math.round((refData.amount || 0) * TIERS[p.tier].commission / 100);
    const ref     = { id: uid(), commission: comm, status:'pending', date: new Date().toISOString(), ...refData };
    p.referralList = p.referralList || [];
    p.referralList.unshift(ref);
    p.referrals = (p.referrals||0) + 1;
    p.tier      = getTierKey(p.referrals);
    p.pending   = (p.pending||0) + comm;
    savePartners(list);
  }

  function resetPartners() {
    localStorage.removeItem(PARTNERS_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  return {
    signIn, signOut, register, getCurrentPartner, isAuthenticated,
    updateSession, getTierKey, TIERS, TYPES,
    getPartners, getAggregateStats,
    updatePartnerStatus, updatePartnerAdmin, deletePartner, addReferral,
    resetPartners, seed: _seed
  };
})();
