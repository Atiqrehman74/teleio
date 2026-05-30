/* Shared navigation injector for sub-pages */
(function() {
  /* Apply dark mode immediately to prevent flash */
  try { if (localStorage.getItem('teleio_theme') === 'dark') document.body.classList.add('dark-mode'); } catch(e) {}

  const base = '../';

  /* read auth session from localStorage (sync) */
  let _session = null;
  try { _session = JSON.parse(localStorage.getItem('teleio_session')); } catch(e) {}
  const _user = _session;

  /* inject favicon */
  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.type = 'image/png';
  favicon.href = `${base}images/favicon.png`;
  document.head.appendChild(favicon);

  /* Inject full nav CSS so nav works on pages that don't load css/style.css */
  const style = document.createElement('style');
  style.textContent = `
    :root{--primary:#4F46E5;--primary-dark:#4338CA;--secondary:#3B82F6;--accent:#84CC16;--accent-dark:#65A30D;--bg-light:#F0F0FF;--text-dark:#111827;--text-medium:#374151;--text-muted:#6B7280;--border:#E5E7EB;--white:#FFFFFF;--shadow-lg:0 10px 40px rgba(0,0,0,0.14);--radius:12px;--radius-sm:8px;--radius-lg:16px;}
    .top-accent{height:4px;background:linear-gradient(90deg,#84CC16,#A3E635,#65A30D);position:fixed;top:0;left:0;right:0;z-index:1100;}
    nav{position:fixed;top:4px;left:0;right:0;background:#fff;z-index:1000;border-bottom:1px solid var(--border);box-shadow:0 2px 10px rgba(0,0,0,.05);}
    .nav-container{max-width:1280px;margin:0 auto;padding:0 24px;display:flex;align-items:center;height:72px;gap:8px;}
    .nav-logo{display:flex;align-items:center;text-decoration:none;flex-shrink:0;margin-right:16px;}
    .nav-logo-img{height:58px;width:auto;display:block;object-fit:contain;transition:opacity .2s;}
    .nav-logo:hover .nav-logo-img{opacity:.85;}
    @media(max-width:768px){.nav-logo-img{height:42px;}}
    body.dark-mode .nav-logo-img{filter:brightness(0) invert(1);}
    .nav-links{display:flex;align-items:center;gap:2px;flex:1;}
    .nav-item{position:relative;}
    .nav-link{display:flex;align-items:center;gap:5px;padding:8px 13px;color:var(--text-medium);text-decoration:none;font-size:14.5px;font-weight:500;border-radius:var(--radius-sm);transition:all .18s;cursor:pointer;border:none;background:none;white-space:nowrap;font-family:inherit;}
    .nav-link:hover,.nav-link.active{color:var(--primary);background:#F5F3FF;}
    .nav-link .chevron{width:14px;height:14px;transition:transform .2s;fill:none;stroke:currentColor;stroke-width:2;}
    .nav-item.open .nav-link .chevron,.nav-item:hover .nav-link .chevron{transform:rotate(180deg);}
    .dropdown{position:absolute;top:calc(100% + 8px);background:#fff;border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);border:1px solid var(--border);padding:16px;opacity:0;visibility:hidden;transition:opacity .18s,transform .18s;pointer-events:none;transform:translateY(-4px);}
    .nav-item:hover .dropdown,.nav-item.open .dropdown{opacity:1;visibility:visible;pointer-events:all;transform:translateY(0);}
    .dropdown-travel{left:0;min-width:240px;}
    .dropdown-visa{left:50%;transform:translateX(-50%) translateY(-4px);min-width:560px;display:grid;grid-template-columns:1fr 1fr;gap:0 20px;}
    .nav-item:hover .dropdown-visa,.nav-item.open .dropdown-visa{transform:translateX(-50%) translateY(0);}
    .dropdown-tools{left:0;min-width:240px;}
    .dropdown-uae{left:0;min-width:580px;display:grid;grid-template-columns:1fr 1fr;gap:0 20px;}
    .nav-item:hover .dropdown-uae,.nav-item.open .dropdown-uae{opacity:1;visibility:visible;pointer-events:all;transform:translateY(0);}
    .dropdown-col-title{font-size:10.5px;font-weight:700;letter-spacing:.1em;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;padding:0 10px;}
    .dropdown-item{display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:var(--radius-sm);text-decoration:none;color:var(--text-dark);transition:background .15s;}
    .dropdown-item:hover{background:var(--bg-light);}
    .di-icon{width:36px;height:36px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;flex-shrink:0;}
    .di-text strong{display:block;font-size:13.5px;font-weight:600;}
    .di-text span{font-size:11.5px;color:var(--text-muted);}
    .nav-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
    .btn-signin{display:flex;align-items:center;gap:6px;padding:8px 14px;color:var(--text-medium);text-decoration:none;font-size:14px;font-weight:500;border-radius:var(--radius-sm);transition:all .18s;border:none;cursor:pointer;background:none;font-family:inherit;white-space:nowrap;}
    .btn-signin:hover{color:var(--primary);background:#F5F3FF;}
    .btn-instant{padding:8px 18px;background:var(--accent);color:#1a2e05;text-decoration:none;font-size:13.5px;font-weight:700;border-radius:var(--radius-sm);transition:all .18s;white-space:nowrap;}
    .btn-instant:hover{background:var(--accent-dark);}
    .nav-mobile-btns{display:none;align-items:center;gap:6px;margin-left:auto;margin-right:6px;}
    @media(max-width:768px){.nav-mobile-btns{display:flex;}}
    .nmb-partner{display:flex;align-items:center;gap:4px;padding:5px 10px;background:#F0FDF4;border:1.5px solid #A7F3D0;border-radius:20px;color:#059669;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;}
    .nmb-signin{display:flex;align-items:center;gap:4px;padding:5px 10px;color:var(--text-medium);font-size:12px;font-weight:500;text-decoration:none;white-space:nowrap;border:1.5px solid var(--border);border-radius:20px;}
    .nmb-signin:hover,.nmb-partner:hover{opacity:.85;}
    .hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:8px;border:none;background:none;position:relative;z-index:1100;}
    .hamburger span{display:block;width:22px;height:2px;background:var(--text-dark);border-radius:2px;transition:all .2s;}
    .hamburger.active span:nth-child(1){transform:translateY(7px) rotate(45deg);}
    .hamburger.active span:nth-child(2){opacity:0;}
    .hamburger.active span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}
    .mobile-menu{display:none;position:fixed;top:66px;left:0;right:0;bottom:0;background:white;z-index:1050;overflow-y:auto;padding:20px 24px;border-top:1px solid var(--border);box-shadow:0 8px 30px rgba(0,0,0,.12);}
    .mobile-menu.open{display:block;}
    .mobile-nav-section{margin-bottom:20px;}
    .mobile-nav-title{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border);}
    .mobile-nav-link{display:block;padding:10px 0;font-size:15px;color:var(--text-dark);text-decoration:none;border-bottom:1px solid #F3F4F6;transition:color .15s;}
    .mobile-nav-link:hover{color:var(--primary);}
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 24px;border-radius:var(--radius-sm);font-size:14.5px;font-weight:600;cursor:pointer;border:none;text-decoration:none;transition:all .18s;font-family:inherit;}
    .btn-primary{background:linear-gradient(135deg,var(--primary),var(--secondary));color:white;box-shadow:0 4px 14px rgba(124,58,237,.35);}
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(124,58,237,.45);}
    .btn-full{width:100%;}
    @media(max-width:768px){
      .nav-links,.nav-right{display:none !important;}
      .hamburger{display:flex;}
    }
    /* ── Dark mode ── */
    body{transition:background .25s,color .25s;}
    body.dark-mode{--bg-page:#0f172a;--bg-light:#1e293b;--white:#1e293b;--text-dark:#f1f5f9;--text-medium:#cbd5e1;--text-muted:#94a3b8;--border:#334155;background:#0f172a;color:#f1f5f9;}
    body.dark-mode nav{background:#1e293b;border-color:#334155;}
    body.dark-mode .dropdown{background:#1e293b;border-color:#334155;}
    body.dark-mode .dropdown-item:hover{background:#0f172a;}
    body.dark-mode .dropdown-col-title{color:#94a3b8;}
    body.dark-mode .mobile-menu{background:#1e293b;border-color:#334155;}
    body.dark-mode .mobile-nav-link{border-color:#334155;color:#cbd5e1;}
    body.dark-mode .mobile-nav-title{color:#94a3b8;border-color:#334155;}
    body.dark-mode .nav-logo{color:#f1f5f9;}
    body.dark-mode .nav-link{color:#cbd5e1;}
    body.dark-mode .nav-link:hover,body.dark-mode .nav-link.active{color:#a78bfa;background:#1e1b4b;}
    body.dark-mode .btn-signin{color:#cbd5e1;}
    body.dark-mode .btn-signin:hover{color:#a78bfa;background:#1e1b4b;}
    body.dark-mode .lang-btn{border-color:#334155;color:#cbd5e1;}
    body.dark-mode .lang-btn:hover{background:#0f172a;}
    body.dark-mode .lang-dropdown{background:#1e293b;border-color:#334155;}
    body.dark-mode .lang-item{color:#f1f5f9;}
    body.dark-mode .lang-item:hover,body.dark-mode .lang-item.active{background:#0f172a;}
    body.dark-mode .theme-toggle{border-color:#334155;color:#cbd5e1;}
    body.dark-mode .theme-toggle:hover{background:#0f172a;color:#f1f5f9;}
    body.dark-mode .hamburger span{background:#f1f5f9;}
    /* ── Theme toggle button ── */
    .theme-toggle{width:36px;height:36px;border-radius:50%;border:1.5px solid var(--border);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-medium);transition:all .2s;flex-shrink:0;}
    .theme-toggle:hover{background:var(--bg-light);color:var(--text-dark);}
    /* ── Language switcher ── */
    .lang-item-wrap{position:relative;}
    .lang-code{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:17px;background:linear-gradient(135deg,var(--primary),var(--secondary));color:white;font-size:9px;font-weight:800;border-radius:3px;letter-spacing:.05em;padding:0 3px;flex-shrink:0;}
    .lang-btn{display:flex;align-items:center;gap:6px;padding:6px 10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);background:none;cursor:pointer;font-size:13px;color:var(--text-medium);font-family:inherit;transition:all .2s;white-space:nowrap;}
    .lang-btn:hover{background:var(--bg-light);}
    .lang-dropdown{position:absolute;top:calc(100% + 8px);right:0;background:var(--white);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);border:1px solid var(--border);padding:8px;opacity:0;visibility:hidden;transition:opacity .18s,transform .18s;transform:translateY(-4px);min-width:160px;z-index:1010;}
    .lang-item-wrap.open .lang-dropdown{opacity:1;visibility:visible;transform:translateY(0);}
    .lang-item{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:var(--radius-sm);cursor:pointer;font-size:13.5px;color:var(--text-dark);transition:background .15s;border:none;background:none;width:100%;text-align:left;font-family:inherit;}
    .lang-item:hover,.lang-item.active{background:var(--bg-light);font-weight:600;}
    .lang-item.active .lang-code{box-shadow:0 0 0 2px var(--primary);}
  `;
  document.head.appendChild(style);

  const nav = `
<div class="top-accent"></div>
<nav>
  <div class="nav-container">
    <a href="${base}index.html" class="nav-logo">
      <img src="${base}images/teleio-logo.png" class="nav-logo-img" alt="Teleio Tourism">
    </a>

    <div class="nav-links">

      <!-- Travel -->
      <div class="nav-item">
        <button class="nav-link">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.63 2 2 0 012-2.18h3a2 2 0 012 1.72"/></svg>
          <span data-i18n="t">Travel</span>
          <svg class="chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="dropdown dropdown-travel">
          <div class="dropdown-col-title">Book Travel</div>
          <a href="${base}pages/travel.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#1a6ec7,#48cae4)">✈️</div><div class="di-text"><strong>Flights</strong><span>Search &amp; compare flights</span></div></a>
          <a href="${base}pages/travel.html#hotels" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#6d28d9,#8b5cf6)">🏨</div><div class="di-text"><strong>Hotels</strong><span>Find perfect stays</span></div></a>
          <a href="${base}pages/travel.html#activities" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#d97706,#f59e0b)">🎯</div><div class="di-text"><strong>Activities</strong><span>Tours, adventures &amp; more</span></div></a>
          <a href="${base}pages/travel.html#cars" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#065f46,#10b981)">🚗</div><div class="di-text"><strong>Cars</strong><span>Rent vehicles worldwide</span></div></a>
          <a href="${base}pages/travel.html#resorts" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#0369a1,#0ea5e9)">🏝️</div><div class="di-text"><strong>Resorts</strong><span>Resorts &amp; villa search</span></div></a>
          <a href="${base}pages/travel.html#vacation-rentals" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#7c3aed,#a78bfa)">🏠</div><div class="di-text"><strong>Vacation Rentals</strong><span>Homes &amp; apartments</span></div></a>
          <a href="${base}pages/travel.html#deals" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#b91c1c,#ef4444)">🏷️</div><div class="di-text"><strong>Deals</strong><span>Curated travel deals</span></div></a>
        </div>
      </div>

      <!-- Visa Services -->
      <div class="nav-item">
        <button class="nav-link">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
          <span data-i18n="v">Visa Services</span>
          <svg class="chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="dropdown dropdown-visa">
          <div class="dropdown-col">
            <div class="dropdown-col-title">Visa Application</div>
            <a href="${base}pages/eligibility-checker.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#4c1d95,#7c3aed)">🛡️</div><div class="di-text"><strong>Check Eligibility</strong><span>Instant visa checker</span></div></a>
            <a href="${base}pages/apply-visa.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#1e40af,#3b82f6)">📋</div><div class="di-text"><strong>Apply for Visa</strong><span>AI-guided application</span></div></a>
            <a href="${base}pages/track-status.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#065f46,#10b981)">🕐</div><div class="di-text"><strong>Track Status</strong><span>Real-time tracking</span></div></a>
            <a href="${base}pages/resources.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#92400e,#d97706)">🌐</div><div class="di-text"><strong>Resources &amp; Guides</strong><span>Country guides &amp; FAQs</span></div></a>
          </div>
          <div class="dropdown-col">
            <div class="dropdown-col-title">Visa Tools</div>
            <a href="${base}pages/photo-tool.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#9f1239,#e11d48)">📷</div><div class="di-text"><strong>Visa Photo Tool</strong><span>AI photo compliance</span></div></a>
            <a href="${base}pages/fee-calculator.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#c2410c,#ea580c)">🧮</div><div class="di-text"><strong>Fee Calculator</strong><span>Estimate costs</span></div></a>
            <a href="${base}pages/document-checklist.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#166534,#16a34a)">✅</div><div class="di-text"><strong>Document Checklist</strong><span>Required documents</span></div></a>
            <a href="${base}pages/appointment-finder.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8)">📅</div><div class="di-text"><strong>Appointment Finder</strong><span>Embassy slots</span></div></a>
          </div>
        </div>
      </div>

      <!-- Tools -->
      <div class="nav-item">
        <button class="nav-link">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
          <span data-i18n="o">Tools</span>
          <svg class="chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="dropdown dropdown-tools">
          <div class="dropdown-col-title">Travel Tools</div>
          <a href="${base}pages/passport-index.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#0f766e,#14b8a6)">🌍</div><div class="di-text"><strong>Passport Power Index</strong><span>Compare passports</span></div></a>
          <a href="${base}pages/currency-exchange.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#7c3aed,#a78bfa)">💱</div><div class="di-text"><strong>Currency Converter</strong><span>Live exchange rates</span></div></a>
          <a href="${base}pages/document-checklist.html" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#0369a1,#0284c7)">📋</div><div class="di-text"><strong>Trip Planner</strong><span>Plan your journey</span></div></a>
        </div>
      </div>

      <!-- UAE Tourism -->
      <div class="nav-item">
        <button class="nav-link">
          <span data-i18n="u">UAE Tourism</span>
          <svg class="chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="dropdown dropdown-uae">
          <div class="dropdown-col">
            <div class="dropdown-col-title">Adventures &amp; Outdoors</div>
            <a href="${base}pages/uae-tourism.html#desert" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#C2933A,#E5B84A)">🏜️</div><div class="di-text"><strong>Desert Safari</strong><span>Dune bashing &amp; overnight camp</span></div></a>
            <a href="${base}pages/uae-tourism.html#water" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#0077B6,#48CAE4)">🏄</div><div class="di-text"><strong>Water Sports</strong><span>Jet ski, parasailing &amp; more</span></div></a>
            <a href="${base}pages/uae-tourism.html#balloon" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#E63946,#F4A261)">🎈</div><div class="di-text"><strong>Hot Air Balloon</strong><span>Sunrise desert flights</span></div></a>
            <a href="${base}pages/uae-tourism.html#diving" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#023E8A,#0096C7)">🤿</div><div class="di-text"><strong>Scuba Diving</strong><span>Coral reefs &amp; marine life</span></div></a>
            <a href="${base}pages/uae-tourism.html#camel" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#9C6B2E,#C2933A)">🐪</div><div class="di-text"><strong>Camel Riding</strong><span>Traditional desert experience</span></div></a>
            <a href="${base}pages/uae-tourism.html#hatta" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#2D6A4F,#52B788)">🏔️</div><div class="di-text"><strong>Hatta Mountains</strong><span>Hiking &amp; kayaking</span></div></a>
          </div>
          <div class="dropdown-col">
            <div class="dropdown-col-title">Culture &amp; Entertainment</div>
            <a href="${base}pages/uae-tourism.html#burj" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#1A1A2E,#16213E)">🗼</div><div class="di-text"><strong>Burj Khalifa</strong><span>At The Top experience</span></div></a>
            <a href="${base}pages/uae-tourism.html#global" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#7B2D8B,#C062E2)">🎡</div><div class="di-text"><strong>Global Village</strong><span>80+ country pavilions</span></div></a>
            <a href="${base}pages/uae-tourism.html#mall" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#0F3460,#1A6EC7)">🛍️</div><div class="di-text"><strong>Dubai Mall</strong><span>World's largest mall</span></div></a>
            <a href="${base}pages/uae-tourism.html#parks" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#D62828,#F77F00)">🎢</div><div class="di-text"><strong>Theme Parks</strong><span>IMG Worlds, Motiongate</span></div></a>
            <a href="${base}pages/uae-tourism.html#food" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#6A040F,#DC2F02)">🍴</div><div class="di-text"><strong>Food Tours</strong><span>Emirati &amp; world cuisine</span></div></a>
            <a href="${base}pages/uae-tourism.html#beach" class="dropdown-item"><div class="di-icon" style="background:linear-gradient(135deg,#0096C7,#00B4D8)">🏖️</div><div class="di-text"><strong>Beach &amp; Marina</strong><span>Jumeirah, Palm Beach</span></div></a>
          </div>
          <div style="grid-column:1/-1;border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
            <a href="${base}pages/uae-tourism.html" class="btn btn-primary btn-full" style="justify-content:center">🇦🇪 Explore All UAE Activities →</a>
          </div>
        </div>
      </div>

    </div>

    <div class="nav-right">
      <div class="lang-item-wrap" id="langWrap">
        <button class="lang-btn" id="langBtn" aria-label="Select language">
          <span class="lang-code" id="langCode">EN</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="lang-dropdown" id="langDropdown">
          <button class="lang-item active" data-lang="en"><span class="lang-code">EN</span>English</button>
          <button class="lang-item" data-lang="ar"><span class="lang-code">AR</span>&#x627;&#x644;&#x639;&#x631;&#x628;&#x64A;&#x629;</button>
          <button class="lang-item" data-lang="ur"><span class="lang-code">UR</span>&#x627;&#x631;&#x62F;&#x648;</button>
          <button class="lang-item" data-lang="hi"><span class="lang-code">HI</span>&#x939;&#x93F;&#x928;&#x94D;&#x926;&#x940;</button>
          <button class="lang-item" data-lang="fr"><span class="lang-code">FR</span>Fran&ccedil;ais</button>
          <button class="lang-item" data-lang="de"><span class="lang-code">DE</span>Deutsch</button>
          <button class="lang-item" data-lang="zh"><span class="lang-code">ZH</span>&#x4E2D;&#x6587;</button>
          <button class="lang-item" data-lang="ru"><span class="lang-code">RU</span>&#x420;&#x443;&#x441;&#x441;&#x43A;&#x438;&#x439;</button>
        </div>
      </div>
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">
        <svg id="themeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
      <a href="${base}pages/partner-program.html" class="btn-signin" style="color:#059669;border:1.5px solid #A7F3D0;background:#F0FDF4">
        &#x1F91D; <span data-i18n="p">Become Partner</span>
      </a>
      ${_user
        ? `<a href="${base}pages/dashboard.html" class="btn-signin" style="gap:8px">
             <div style="width:26px;height:26px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${(_user.firstName[0]+(_user.lastName?_user.lastName[0]:'')).toUpperCase()}</div>
             ${_user.firstName}
           </a>
           <button onclick="localStorage.removeItem('teleio_session');window.location.href='${base}pages/signin.html'" class="btn-signin" style="cursor:pointer;border:1px solid var(--border);background:none;font-family:inherit">
             Sign Out
           </button>`
        : `<a href="${base}pages/signin.html" class="btn-signin">
             <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
             Sign In
           </a>`
      }
      <a href="${base}pages/instant-visa.html" class="btn-instant">&#x26A1; <span data-i18n="i">Instant Visa</span></a>
    </div>

    <!-- Mobile-only quick actions (between logo and hamburger) -->
    <div class="nav-mobile-btns">
      <a href="${base}pages/partner-program.html" class="nmb-partner">&#x1F91D; Partner</a>
      ${_user
        ? `<a href="${base}pages/dashboard.html" class="nmb-signin"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${_user.firstName}</a>`
        : `<a href="${base}pages/signin.html" class="nmb-signin"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Sign In</a>`
      }
    </div>

    <button class="hamburger" id="hamburger" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<div class="mobile-menu" id="mobileMenu">
  <div class="mobile-nav-section">
    <div class="mobile-nav-title">Book Travel</div>
    <a href="${base}pages/travel.html" class="mobile-nav-link">✈️ Flights</a>
    <a href="${base}pages/travel.html#hotels" class="mobile-nav-link">🏨 Hotels</a>
    <a href="${base}pages/travel.html#activities" class="mobile-nav-link">🎯 Activities</a>
    <a href="${base}pages/travel.html#cars" class="mobile-nav-link">🚗 Cars</a>
    <a href="${base}pages/travel.html#resorts" class="mobile-nav-link">🏝️ Resorts</a>
    <a href="${base}pages/travel.html#vacation-rentals" class="mobile-nav-link">🏠 Vacation Rentals</a>
    <a href="${base}pages/travel.html#deals" class="mobile-nav-link">🏷️ Deals</a>
  </div>
  <div class="mobile-nav-section">
    <div class="mobile-nav-title">Visa Services</div>
    <a href="${base}pages/eligibility-checker.html" class="mobile-nav-link">🛡️ Check Eligibility</a>
    <a href="${base}pages/apply-visa.html" class="mobile-nav-link">📋 Apply for Visa</a>
    <a href="${base}pages/track-status.html" class="mobile-nav-link">🕐 Track Status</a>
    <a href="${base}pages/resources.html" class="mobile-nav-link">🌐 Resources &amp; Guides</a>
    <a href="${base}pages/photo-tool.html" class="mobile-nav-link">📷 Visa Photo Tool</a>
    <a href="${base}pages/fee-calculator.html" class="mobile-nav-link">🧮 Fee Calculator</a>
    <a href="${base}pages/document-checklist.html" class="mobile-nav-link">✅ Document Checklist</a>
    <a href="${base}pages/appointment-finder.html" class="mobile-nav-link">📅 Appointment Finder</a>
  </div>
  <div class="mobile-nav-section">
    <div class="mobile-nav-title">🇦🇪 UAE Tourism</div>
    <a href="${base}pages/uae-tourism.html#desert" class="mobile-nav-link">🏜️ Desert Safari</a>
    <a href="${base}pages/uae-tourism.html#water" class="mobile-nav-link">🏄 Water Sports</a>
    <a href="${base}pages/uae-tourism.html#balloon" class="mobile-nav-link">🎈 Hot Air Balloon</a>
    <a href="${base}pages/uae-tourism.html#burj" class="mobile-nav-link">🗼 Burj Khalifa</a>
    <a href="${base}pages/uae-tourism.html#global" class="mobile-nav-link">🎡 Global Village</a>
    <a href="${base}pages/uae-tourism.html#mall" class="mobile-nav-link">🛍️ Dubai Mall</a>
    <a href="${base}pages/uae-tourism.html" class="mobile-nav-link" style="color:var(--primary);font-weight:600">→ View All UAE Activities</a>
  </div>
  <div class="mobile-nav-section">
    <div class="mobile-nav-title">Tools &amp; More</div>
    <a href="${base}pages/passport-index.html" class="mobile-nav-link">&#x1F30D; Passport Power Index</a>
    <a href="${base}pages/contact.html" class="mobile-nav-link">&#x1F4CD; Contact Us</a>
    <a href="${base}pages/partner-program.html" class="mobile-nav-link">&#x1F91D; Partner Program</a>
    <a href="${base}pages/partner-login.html" class="mobile-nav-link">&#x1F511; Partner Login</a>
    ${_user
      ? `<a href="${base}pages/dashboard.html" class="mobile-nav-link">&#x1F4CA; My Dashboard (${_user.firstName})</a>
         <button onclick="localStorage.removeItem('teleio_session');window.location.href='${base}index.html'" class="mobile-nav-link" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;font-family:inherit;font-size:inherit;color:inherit;padding:10px 0">&#x1F6AA; Sign Out</button>`
      : `<a href="${base}pages/signin.html" class="mobile-nav-link">&#x1F464; Sign In</a>`
    }
  </div>
  <div class="mobile-nav-section">
    <div class="mobile-nav-title">Preferences</div>
    <button id="mobileThemeBtn" class="mobile-nav-link" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;font-family:inherit;font-size:inherit;color:inherit;padding:10px 0">
      &#x1F319; Toggle Dark Mode
    </button>
    <div style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 0 10px">
      <button class="lang-item-mobile" data-lang="en" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:12px;font-family:inherit;color:var(--text-dark)">EN English</button>
      <button class="lang-item-mobile" data-lang="ar" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:12px;font-family:inherit;color:var(--text-dark)">AR &#x639;&#x631;&#x628;&#x64A;</button>
      <button class="lang-item-mobile" data-lang="ur" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:12px;font-family:inherit;color:var(--text-dark)">UR &#x627;&#x631;&#x62F;&#x648;</button>
      <button class="lang-item-mobile" data-lang="hi" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:12px;font-family:inherit;color:var(--text-dark)">HI &#x939;&#x93F;&#x928;&#x94D;&#x926;&#x940;</button>
      <button class="lang-item-mobile" data-lang="fr" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:12px;font-family:inherit;color:var(--text-dark)">FR Français</button>
      <button class="lang-item-mobile" data-lang="de" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:12px;font-family:inherit;color:var(--text-dark)">DE Deutsch</button>
      <button class="lang-item-mobile" data-lang="zh" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:12px;font-family:inherit;color:var(--text-dark)">ZH &#x4E2D;&#x6587;</button>
      <button class="lang-item-mobile" data-lang="ru" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:12px;font-family:inherit;color:var(--text-dark)">RU &#x420;&#x443;&#x441;</button>
    </div>
  </div>
</div>`;

  document.body.insertAdjacentHTML('afterbegin', nav);

  /* hamburger toggle handled by main.js */

  /* ── Dark mode ── */
  (function() {
    updateThemeIcon(document.body.classList.contains('dark-mode'));

    function toggleDark() {
      var isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('teleio_theme', isDark ? 'dark' : 'light');
      updateThemeIcon(isDark);
    }

    document.getElementById('themeToggle') && document.getElementById('themeToggle').addEventListener('click', toggleDark);
    document.getElementById('mobileThemeBtn') && document.getElementById('mobileThemeBtn').addEventListener('click', toggleDark);

    function updateThemeIcon(isDark) {
      var icon = document.getElementById('themeIcon');
      if (!icon) return;
      icon.innerHTML = isDark
        ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
  })();

  /* ── Language switcher + translations ── */
  (function() {
    var langMeta = {
      en:{code:'EN',rtl:false}, ar:{code:'AR',rtl:true}, ur:{code:'UR',rtl:true},
      hi:{code:'HI',rtl:false}, fr:{code:'FR',rtl:false}, de:{code:'DE',rtl:false},
      zh:{code:'ZH',rtl:false}, ru:{code:'RU',rtl:false}
    };

    /* Translation dictionary — keys match data-i18n attributes */
    var TRANS = {
      en:{t:'Travel',v:'Visa Services',o:'Tools',u:'UAE Tourism',p:'Become Partner',s:'Sign In',i:'Instant Visa',
          b:'✦ AI-Powered Travel & Visa Platform',
          h:'Travel Smarter with<br><span class="highlight">Teleio Tourism</span>',
          sub:'From instant visa checks to seamless bookings — everything you need for your perfect journey.',
          tc:'✦ Check Visa',ti:'⚡ Instant Visa',n:'Nationality',d:'Destination',pu:'Purpose',fb:'✦ Check Visa'},
      ar:{t:'السفر',v:'خدمات التأشيرة',o:'الأدوات',u:'سياحة الإمارات',p:'كن شريكاً',s:'تسجيل الدخول',i:'تأشيرة فورية',
          b:'✦ منصة السفر والتأشيرة الذكية',
          h:'سافر بذكاء مع<br><span class="highlight">تيليو توريزم</span>',
          sub:'من فحص التأشيرة الفوري إلى الحجز السلس — كل ما تحتاجه لرحلتك المثالية.',
          tc:'✦ فحص التأشيرة',ti:'⚡ تأشيرة فورية',n:'الجنسية',d:'الوجهة',pu:'الغرض',fb:'✦ فحص التأشيرة'},
      ur:{t:'سفر',v:'ویزا سروسز',o:'ٹولز',u:'امارات سیاحت',p:'پارٹنر بنیں',s:'سائن ان',i:'فوری ویزا',
          b:'✦ اے آئی ٹریول اور ویزا پلیٹ فارم',
          h:'سمارٹ سفر کریں<br><span class="highlight">Teleio Tourism</span>',
          sub:'فوری ویزا چیک سے آسان بکنگ تک — آپ کے بہترین سفر کے لیے سب کچھ۔',
          tc:'✦ ویزا چیک',ti:'⚡ فوری ویزا',n:'قومیت',d:'منزل',pu:'مقصد',fb:'✦ ویزا چیک'},
      hi:{t:'यात्रा',v:'वीज़ा सेवाएं',o:'उपकरण',u:'UAE पर्यटन',p:'पार्टनर बनें',s:'साइन इन',i:'तत्काल वीज़ा',
          b:'✦ AI-संचालित यात्रा और वीज़ा प्लेटफ़ॉर्म',
          h:'स्मार्ट यात्रा करें<br><span class="highlight">Teleio Tourism</span>',
          sub:'तत्काल वीज़ा जांच से आसान बुकिंग तक — आपकी परफेक्ट यात्रा के लिए सब कुछ।',
          tc:'✦ वीज़ा जांचें',ti:'⚡ तत्काल वीज़ा',n:'राष्ट्रीयता',d:'गंतव्य',pu:'उद्देश्य',fb:'✦ वीज़ा जांचें'},
      fr:{t:'Voyage',v:'Services Visa',o:'Outils',u:'Tourisme UAE',p:'Devenir Partenaire',s:'Se Connecter',i:'Visa Instantané',
          b:'✦ Plateforme Voyage & Visa IA',
          h:'Voyagez Plus Intelligemment avec<br><span class="highlight">Teleio Tourism</span>',
          sub:'Des vérifications instantanées aux réservations fluides — tout pour votre voyage parfait.',
          tc:'✦ Vérifier Visa',ti:'⚡ Visa Instantané',n:'Nationalité',d:'Destination',pu:'Motif',fb:'✦ Vérifier Visa'},
      de:{t:'Reisen',v:'Visa-Services',o:'Tools',u:'VAE-Tourismus',p:'Partner werden',s:'Anmelden',i:'Sofortvisum',
          b:'✦ KI-gestützte Reise- und Visaplattform',
          h:'Intelligenter reisen mit<br><span class="highlight">Teleio Tourism</span>',
          sub:'Von sofortigen Visaprüfungen bis nahtlosen Buchungen — alles für Ihre perfekte Reise.',
          tc:'✦ Visum prüfen',ti:'⚡ Sofortvisum',n:'Staatsangehörigkeit',d:'Reiseziel',pu:'Zweck',fb:'✦ Visum prüfen'},
      zh:{t:'旅行',v:'签证服务',o:'工具',u:'阿联酋旅游',p:'成为合作伙伴',s:'登录',i:'即时签证',
          b:'✦ AI驱动的旅行和签证平台',
          h:'智慧旅行<br><span class="highlight">Teleio Tourism</span>',
          sub:'从即时签证检查到无缝预订——您完美旅程所需的一切。',
          tc:'✦ 查询签证',ti:'⚡ 即时签证',n:'国籍',d:'目的地',pu:'目的',fb:'✦ 查询签证'},
      ru:{t:'Путешествия',v:'Визовые услуги',o:'Инструменты',u:'Туризм ОАЭ',p:'Стать партнером',s:'Войти',i:'Мгновенная виза',
          b:'✦ ИИ-платформа для путешествий и виз',
          h:'Путешествуйте умнее с<br><span class="highlight">Teleio Tourism</span>',
          sub:'От мгновенной проверки визы до бронирования — всё для вашего идеального путешествия.',
          tc:'✦ Проверить визу',ti:'⚡ Мгновенная виза',n:'Гражданство',d:'Направление',pu:'Цель',fb:'✦ Проверить визу'},
    };

    var currentLang = localStorage.getItem('teleio_lang') || 'en';
    applyLang(currentLang, false); /* false = page load restore, don't trigger GT reload */

    var wrap = document.getElementById('langWrap');
    var btn  = document.getElementById('langBtn');

    btn && btn.addEventListener('click', function(e) {
      e.stopPropagation();
      wrap && wrap.classList.toggle('open');
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('#langWrap')) {
        wrap && wrap.classList.remove('open');
      }
    });

    document.querySelectorAll('.lang-item, .lang-item-mobile').forEach(function(el) {
      el.addEventListener('click', function() {
        var lang = this.getAttribute('data-lang');
        localStorage.setItem('teleio_lang', lang);
        applyLang(lang, true); /* true = user clicked, trigger Google Translate */
        wrap && wrap.classList.remove('open');
      });
    });

    function applyLang(lang, userTriggered) {
      var l = langMeta[lang] || langMeta.en;
      var t = TRANS[lang] || TRANS.en;

      /* Update lang code badge */
      var codeEl = document.getElementById('langCode');
      if (codeEl) codeEl.textContent = l.code;

      /* Page direction + lang attribute */
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.dir = l.rtl ? 'rtl' : 'ltr';

      /* Mark active dropdown item */
      document.querySelectorAll('.lang-item').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-lang') === lang);
      });

      /* Apply our instant key-string translations */
      document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var k = el.getAttribute('data-i18n');
        if (t[k] !== undefined) el.textContent = t[k];
      });
      document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
        var k = el.getAttribute('data-i18n-html');
        if (t[k] !== undefined) el.innerHTML = t[k];
      });

      /* Only trigger Google Translate when user actively selects a language.
         On page load the googtrans cookie already handles auto-translation. */
      if (userTriggered && window._doGoogleTranslate) window._doGoogleTranslate(lang);
    }

    /* Expose so index.html can call it after rebuilding nav-right */
    window._teleioApplyLang = applyLang;
  })();

  /* ── Google Translate auto-translation ── */
  (function() {
    var GT_CODES = { ar:'ar', ur:'ur', hi:'hi', fr:'fr', de:'de', zh:'zh-CN', ru:'ru' };
    var _savedCode = GT_CODES[localStorage.getItem('teleio_lang') || 'en'] || null;

    function _gtSetCookie(code) {
      var val = '/en/' + code;
      ['', '; domain=' + location.hostname, '; domain=.' + location.hostname].forEach(function(d) {
        document.cookie = 'googtrans=' + val + '; path=/' + d;
      });
    }

    /* English: no GT loaded, reload brings clean English page */
    window._doGoogleTranslate = function(lang) {
      var code = GT_CODES[lang] || null;
      if (!code) { location.reload(); return; }
      _gtSetCookie(code);
      var s = document.querySelector('.goog-te-combo');
      if (s) {
        s.value = code;
        try { s.dispatchEvent(new Event('change', {bubbles:true,cancelable:true})); } catch(e) {}
      } else {
        location.reload();
      }
    };

    /* Only load GT when a non-English language is active */
    if (!_savedCode) return;

    _gtSetCookie(_savedCode);

    if (!document.getElementById('google_translate_element')) {
      var gtDiv = document.createElement('div');
      gtDiv.id = 'google_translate_element';
      gtDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;height:0;overflow:hidden;';
      document.body.appendChild(gtDiv);
    }

    window.googleTranslateElementInit = function() {
      new google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'ar,ur,hi,fr,de,zh-CN,ru',
        autoDisplay: false
      }, 'google_translate_element');
      var _c = _savedCode, _end = Date.now() + 6000, _done = false;
      (function poll() {
        if (_done) return;
        var s = document.querySelector('.goog-te-combo');
        if (s) {
          _done = true; s.value = _c;
          try { s.dispatchEvent(new Event('change', {bubbles:true,cancelable:true})); } catch(e) {}
          return;
        }
        if (Date.now() < _end) { setTimeout(poll, 300); }
      })();
    };

    if (!document.getElementById('gt-script')) {
      var s = document.createElement('script');
      s.id = 'gt-script';
      s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.head.appendChild(s);
    }
  })();

  /* ── Load voice chatbot ── */
  function loadScript(src) {
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    document.head.appendChild(s);
  }
  loadScript(base + 'js/config.js');
  loadScript(base + 'js/bot.js');
})();
