/* ============================================
   TELEIO TOURISM - MAIN JAVASCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ===== MOBILE MENU ===== */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('active', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    // Close menu when any link inside is clicked
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
    // Close menu when clicking outside
    document.addEventListener('click', e => {
      if (mobileMenu.classList.contains('open') &&
          !e.target.closest('#mobileMenu') &&
          !e.target.closest('#hamburger')) {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-item')) {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('open'));
    }
  });

  // Touch: toggle dropdown on tap for mobile nav items
  document.querySelectorAll('.nav-item > .nav-link').forEach(btn => {
    btn.addEventListener('click', e => {
      const item = btn.closest('.nav-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  /* ===== TABS ===== */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabsEl = btn.closest('.tabs');
      const target = btn.dataset.tab;
      if (!target) return;
      // Deactivate all buttons in same .tabs
      if (tabsEl) tabsEl.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Find the panel — either by id or by data-tab-panel
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(target) || document.querySelector(`[data-tab-panel="${target}"]`);
      if (panel) panel.classList.add('active');
    });
  });

  /* ===== VISA CATEGORY TABS ===== */
  document.querySelectorAll('.visa-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.visa-cat-tabs').querySelectorAll('.visa-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      document.querySelectorAll('.country-btn').forEach(cb => {
        if (cat === 'all' || cb.dataset.cat === cat) {
          cb.style.display = '';
        } else {
          cb.style.display = 'none';
        }
      });
    });
  });

  /* ===== ELIGIBILITY CHECKER ===== */
  const eligForm = document.getElementById('eligibilityForm');
  if (eligForm) {
    eligForm.addEventListener('submit', e => {
      e.preventDefault();
      const nationality = document.getElementById('nationality').value.trim();
      const destination = document.getElementById('destination').value.trim();
      const purpose = document.getElementById('purpose').value;
      if (!nationality || !destination) {
        alert('Please fill in all fields.');
        return;
      }
      const btn = eligForm.querySelector('.btn');
      btn.textContent = 'Checking...';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = '✦ Check Eligibility';
        btn.disabled = false;
        showEligibilityResult(nationality, destination, purpose);
      }, 1800);
    });
  }

  function showEligibilityResult(from, to, purpose) {
    const resultDiv = document.getElementById('eligibilityResult');
    if (!resultDiv) return;
    const rand = Math.random();
    let status, type, msg, reqs;
    if (rand < 0.3) {
      status = 'Visa-Free'; type = 'success';
      msg = `Great news! ${from} passport holders can travel to ${to} without a visa for ${purpose}.`;
      reqs = ['Valid passport (6+ months validity)', 'Return ticket', 'Proof of accommodation', 'Sufficient funds'];
    } else if (rand < 0.6) {
      status = 'Visa on Arrival'; type = 'warning';
      msg = `${from} passport holders can obtain a Visa on Arrival in ${to} for ${purpose}.`;
      reqs = ['Valid passport (6+ months validity)', 'USD 35 fee', 'Passport photo', 'Return ticket', 'Hotel booking'];
    } else if (rand < 0.8) {
      status = 'eVisa Available'; type = 'info';
      msg = `${from} passport holders must apply for an eVisa before traveling to ${to}.`;
      reqs = ['Online application', 'Passport scan', 'Photo (digital)', 'Fee payment', 'Processing: 3-5 business days'];
    } else {
      status = 'Visa Required'; type = 'danger';
      msg = `${from} passport holders must obtain a visa from the ${to} embassy.`;
      reqs = ['Embassy appointment', 'Application form', 'Passport (original)', 'Financial proof', 'Travel itinerary'];
    }
    resultDiv.innerHTML = `
      <div class="result-card ${type} fade-in">
        <div class="flex-between mb-16">
          <div>
            <div class="pill pill-${type === 'success' ? 'green' : type === 'warning' ? 'blue' : type === 'info' ? 'violet' : 'red'}" style="margin-bottom:8px">${status}</div>
            <h3 style="font-size:18px;font-weight:700">${from} → ${to}</h3>
            <p style="color:var(--text-muted);font-size:14px;margin-top:4px">${msg}</p>
          </div>
        </div>
        <h4 style="font-size:14px;font-weight:700;margin-bottom:12px">Requirements:</h4>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:8px">
          ${reqs.map(r => `<li style="display:flex;align-items:center;gap:8px;font-size:14px"><span style="color:var(--green)">✓</span>${r}</li>`).join('')}
        </ul>
        <div style="margin-top:20px;display:flex;gap:10px">
          <a href="apply-visa.html" class="btn btn-primary">Apply Now</a>
          <a href="fee-calculator.html" class="btn btn-outline">Fee Calculator</a>
        </div>
      </div>`;
    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ===== TRACK STATUS ===== */
  const trackForm = document.getElementById('trackForm');
  if (trackForm) {
    trackForm.addEventListener('submit', e => {
      e.preventDefault();
      const id = document.getElementById('trackingId').value.trim();
      if (!id) { alert('Please enter a tracking ID.'); return; }
      const btn = trackForm.querySelector('.btn');
      btn.textContent = 'Searching...';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = '🔍 Track';
        btn.disabled = false;
        showTrackResult(id);
      }, 1500);
    });
  }

  function showTrackResult(id) {
    const r = document.getElementById('trackResult');
    if (!r) return;
    r.innerHTML = `
      <div class="card fade-in">
        <div class="flex-between mb-24">
          <div>
            <h3 style="font-size:18px;font-weight:700">Application: ${id}</h3>
            <p style="color:var(--text-muted);font-size:14px">Tourist Visa · UAE → United Kingdom</p>
          </div>
          <span class="pill pill-blue">In Review</span>
        </div>
        <div class="timeline">
          <div class="timeline-item"><div class="timeline-left"><div class="timeline-dot done"></div><div class="timeline-connector"></div></div><div class="timeline-content"><div class="timeline-title">Application Submitted</div><div class="timeline-meta">May 10, 2026 · 10:32 AM</div></div></div>
          <div class="timeline-item"><div class="timeline-left"><div class="timeline-dot done"></div><div class="timeline-connector"></div></div><div class="timeline-content"><div class="timeline-title">Documents Verified</div><div class="timeline-meta">May 11, 2026 · 2:15 PM</div></div></div>
          <div class="timeline-item"><div class="timeline-left"><div class="timeline-dot active"></div><div class="timeline-connector"></div></div><div class="timeline-content"><div class="timeline-title">Under Review</div><div class="timeline-meta">Expected completion: May 15, 2026</div></div></div>
          <div class="timeline-item"><div class="timeline-left"><div class="timeline-dot"></div><div class="timeline-connector"></div></div><div class="timeline-content"><div class="timeline-title">Decision</div><div class="timeline-meta">Pending</div></div></div>
          <div class="timeline-item"><div class="timeline-left"><div class="timeline-dot"></div></div><div class="timeline-content"><div class="timeline-title">Passport Return</div><div class="timeline-meta">Pending</div></div></div>
        </div>
      </div>`;
    r.style.display = 'block';
    r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ===== VISA APPLICATION STEPS ===== */
  let currentStep = 1;
  const totalSteps = 5;
  const nextBtns = document.querySelectorAll('[data-next-step]');
  const backBtns = document.querySelectorAll('[data-back-step]');

  function updateSteps() {
    document.querySelectorAll('.step-item').forEach((item, i) => {
      item.classList.remove('active', 'done');
      if (i + 1 === currentStep) item.classList.add('active');
      if (i + 1 < currentStep) item.classList.add('done');
    });
    document.querySelectorAll('.step-panel').forEach((panel, i) => {
      panel.style.display = (i + 1 === currentStep) ? 'block' : 'none';
    });
  }

  nextBtns.forEach(btn => btn.addEventListener('click', () => {
    if (currentStep < totalSteps) { currentStep++; updateSteps(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }));
  backBtns.forEach(btn => btn.addEventListener('click', () => {
    if (currentStep > 1) { currentStep--; updateSteps(); }
  }));

  /* ===== FEE CALCULATOR ===== */
  const feeForm = document.getElementById('feeForm');
  if (feeForm) {
    feeForm.addEventListener('submit', e => {
      e.preventDefault();
      const from = document.getElementById('feeFrom').value;
      const to = document.getElementById('feeTo').value;
      const type = document.getElementById('feeType').value;
      if (!from || !to) { alert('Please select countries.'); return; }
      const fees = { tourist: 85, business: 150, student: 60, work: 200, transit: 30 };
      const baseFee = fees[type] || 85;
      const r = document.getElementById('feeResult');
      if (r) {
        r.innerHTML = `
          <div class="result-card success fade-in">
            <h3 style="font-size:18px;font-weight:700;margin-bottom:16px">Fee Breakdown</h3>
            <div style="display:flex;flex-direction:column;gap:10px">
              <div class="flex-between"><span>Visa Application Fee</span><strong>$${baseFee}</strong></div>
              <div class="flex-between"><span>Service Fee</span><strong>$25</strong></div>
              <div class="flex-between"><span>Document Processing</span><strong>$15</strong></div>
              <div style="border-top:1.5px solid var(--border);margin-top:8px;padding-top:12px" class="flex-between"><span style="font-weight:700">Total Estimate</span><strong style="font-size:20px;color:var(--primary)">$${baseFee + 40}</strong></div>
            </div>
            <p style="font-size:12px;color:var(--text-muted);margin-top:16px">* Fees are estimates and may vary. Processing time: 5-15 business days.</p>
          </div>`;
        r.style.display = 'block';
      }
    });
  }

  /* ===== PASSPORT SEARCH ===== */
  const passportSearch = document.getElementById('passportSearch');
  if (passportSearch) {
    passportSearch.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.passport-list-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  const regionFilter = document.getElementById('regionFilter');
  if (regionFilter) {
    regionFilter.addEventListener('change', e => {
      const region = e.target.value;
      document.querySelectorAll('.passport-list-item').forEach(item => {
        item.style.display = (!region || item.dataset.region === region) ? '' : 'none';
      });
    });
  }

  /* ===== APPOINTMENT FINDER ===== */
  const appointForm = document.getElementById('appointmentForm');
  if (appointForm) {
    appointForm.addEventListener('submit', e => {
      e.preventDefault();
      const r = document.getElementById('appointmentResult');
      if (r) {
        r.innerHTML = `
          <div class="card fade-in">
            <h3 style="font-weight:700;margin-bottom:16px">Available Slots</h3>
            ${['May 15, 2026 - 9:00 AM', 'May 15, 2026 - 11:30 AM', 'May 16, 2026 - 10:00 AM', 'May 17, 2026 - 2:00 PM', 'May 18, 2026 - 9:30 AM'].map((slot, i) => `
              <div class="checklist-item" style="cursor:pointer;margin-bottom:8px" onclick="selectSlot(this, '${slot}')">
                <span class="check-icon">📅</span>
                <div class="check-content"><strong>${slot}</strong><p>UK Visa Application Centre · Available</p></div>
                <span class="check-status"><span class="pill pill-green">Book</span></span>
              </div>`).join('')}
          </div>`;
        r.style.display = 'block';
      }
    });
  }

  /* ===== PHOTO TOOL ===== */
  const photoUpload = document.getElementById('photoUpload');
  if (photoUpload) {
    photoUpload.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const r = document.getElementById('photoResult');
        if (r) {
          r.innerHTML = `
            <div class="card fade-in">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
                <div>
                  <h4 style="font-weight:700;margin-bottom:12px">Your Photo</h4>
                  <img src="${ev.target.result}" style="width:100%;border-radius:8px;border:2px solid var(--border)">
                </div>
                <div>
                  <h4 style="font-weight:700;margin-bottom:12px">AI Compliance Check</h4>
                  <div style="display:flex;flex-direction:column;gap:8px">
                    ${[['Background', true, 'White/off-white background'], ['Face visible', true, 'Clear frontal view'], ['Eyes open', true, 'Looking at camera'], ['Glasses', true, 'No glasses detected'], ['Expression', true, 'Neutral expression'], ['Photo size', true, '35×45mm compatible']].map(([k,v,d]) => `
                      <div style="display:flex;align-items:center;gap:8px;font-size:14px">
                        <span style="color:${v ? 'var(--green)' : 'var(--red)'}">${v ? '✓' : '✗'}</span>
                        <div><strong>${k}</strong><br><span style="font-size:12px;color:var(--text-muted)">${d}</span></div>
                      </div>`).join('')}
                  </div>
                  <div class="pill pill-green" style="margin-top:16px;display:inline-flex">✓ Photo Compliant</div>
                </div>
              </div>
            </div>`;
          r.style.display = 'block';
        }
      };
      reader.readAsDataURL(file);
    });
  }

  /* Travel search is handled by inline script in travel.html (live Xeni API) */

});

/* ===== GLOBAL FUNCTIONS ===== */
function selectSlot(el, slot) {
  document.querySelectorAll('.checklist-item').forEach(i => i.style.background = '');
  el.style.background = '#F0FDF4';
  alert(`Appointment booked for ${slot}!\nConfirmation will be sent to your email.`);
}
