/* ============================================================
 * Teleio Tourism — Aria Voice AI Chatbot
 * ─ Web Speech API  (mic input + TTS voice output)
 * ─ OpenAI / Groq API  (AI replies, configured in config.js)
 * ─ Keyword fallback  (works offline / without API key)
 * Self-contained: injects own CSS + HTML, no dependencies.
 * ============================================================ */
(function () {
  'use strict';

  /* ── System prompt sent to AI ── */
  var SYSTEM_PROMPT =
    'You are Aria, a friendly AI travel and visa assistant for Teleio Tourism, ' +
    'based in Dubai, UAE. You help with: visa requirements for 70+ countries, ' +
    'UAE tourism activities (Desert Safari, Burj Khalifa, Dubai Mall, Global Village, ' +
    'Hot Air Balloon), flight and hotel bookings, visa applications and tracking, ' +
    'passport power, and general travel tips. ' +
    'Keep every response to 2-3 short sentences — responses are read aloud. ' +
    'Be warm, concise, and helpful. Mention relevant Teleio Tourism features when useful.';

  /* ── Keyword fallback responses ── */
  var FAQ = [
    { k: ['hello','hi','hey','salaam','salam','howdy'],
      r: "Hello! I'm Aria, Teleio's AI travel assistant. Ask me anything about visas, UAE activities, flights, or hotels — or just tap the mic and speak!" },
    { k: ['visa','visas','apply','application','applying'],
      r: "We process visas for 70+ countries with guaranteed on-time delivery. Check eligibility instantly, apply online, and track your application in real time on our Instant Visa page." },
    { k: ['uk','united kingdom','britain','british'],
      r: "UK Standard Visitor visa takes about 15 working days. You'll need your passport, 3 months bank statements, and an employment letter. Our fee is AED 735 — want to start?" },
    { k: ['usa','united states','america','american','us visa'],
      r: "US B1/B2 visa requires an embassy interview and DS-160 form. Processing takes 4–8 weeks. We charge AED 550 service fee on top of the embassy fee." },
    { k: ['schengen','europe','european','france','germany','italy','spain'],
      r: "Schengen visa covers 27 European countries! Required: travel insurance (€30k+), bank statements, hotel bookings, and itinerary. Processing is 10–15 days, AED 550." },
    { k: ['turkey','turkish'],
      r: "Turkey e-Visa is available online in minutes! Pakistani and many other nationals qualify. It's 30 days, single entry, and costs just AED 165 through our platform." },
    { k: ['dubai','uae','emirates','abu dhabi','sharjah'],
      r: "UAE is incredible! Top experiences: Desert Safari from AED 150, Burj Khalifa At The Top from AED 140, Hot Air Balloon from AED 800, and Global Village. Check our UAE Tourism page." },
    { k: ['desert','safari','dune'],
      r: "Desert Safari is our most popular UAE activity — dune bashing, camel rides, henna, and a traditional Bedouin dinner under the stars. Prices start from AED 150 per person." },
    { k: ['burj','khalifa','top','observation'],
      r: "Burj Khalifa At The Top offers 360° views from the 148th floor of the world's tallest building. Standard tickets start at AED 140. It's unforgettable at sunset!" },
    { k: ['balloon','hot air','sky'],
      r: "Hot Air Balloon over the Dubai desert is magical at sunrise — floating at 1,000 meters with panoramic views. Prices start at AED 800 per person. Book on our UAE Tourism page." },
    { k: ['global village','village'],
      r: "Global Village hosts 90+ country pavilions with food, shopping, and entertainment from around the world. It runs October–April. Entry is AED 25, with activities inside." },
    { k: ['flight','flights','fly','airplane','airline','ticket'],
      r: "We compare 500+ airlines to find the best deals. Search on our Travel page by route, dates, and budget. Want me to help you find a specific route?" },
    { k: ['hotel','hotels','stay','accommodation','resort'],
      r: "We book hotels worldwide — from budget to 5-star luxury. Our Travel page lets you search by destination, dates, and rating. What destination are you looking for?" },
    { k: ['car','rent','rental','vehicle','drive'],
      r: "Car rentals are available worldwide through our Travel page. Compare prices from top providers like Hertz, Avis, and local agencies — pick-up at airport or city locations." },
    { k: ['pakistan','pakistani'],
      r: "Pakistani passport gives access to 33 visa-free and 42 visa-on-arrival destinations. We can help with visas for UK, USA, Canada, Schengen, Australia, and 60+ more countries." },
    { k: ['india','indian'],
      r: "Indian passport covers 62 visa-free and 32 visa-on-arrival destinations. We process UK, Schengen, Canada, and many more visas for Indian nationals based in UAE." },
    { k: ['cost','fee','price','charge','how much','aed'],
      r: "Visa fees vary: Turkey AED 165, Thailand visa-free, Schengen AED 550, UK AED 735, USA AED 700. Check our Instant Visa page for all 70 countries with exact fees." },
    { k: ['track','status','progress','where is','update'],
      r: "Track your visa application in real time on our Track Status page. Just enter your application ID — you'll also get live email and SMS updates." },
    { k: ['document','documents','checklist','papers','required'],
      r: "Required documents vary by country. Typically: valid passport, 3 months bank statements, employment letter, and passport photo. Our Document Checklist tool gives country-specific lists." },
    { k: ['photo','passport photo','picture'],
      r: "Our AI Visa Photo Tool checks your photo for embassy compliance — background, face ratio, resolution, and lighting. It's free to use. Upload on our Visa Tools page." },
    { k: ['passport','power','index'],
      r: "Our Passport Power Index ranks all 199 passports by visa-free access. Singapore leads with 195 destinations. Check your passport rank on the Passport Index page." },
    { k: ['malaysia','maldives','thailand','sri lanka'],
      r: "Great news — Malaysian, Maldivian, Thai, and Sri Lankan destinations are visa-free or visa-on-arrival for most nationalities. Check our Instant Visa page for your specific passport." },
    { k: ['thank','thanks','thank you','appreciate','great','perfect'],
      r: "You're very welcome! It's my pleasure. Is there anything else I can help you with — visas, UAE activities, or travel bookings?" },
    { k: ['bye','goodbye','see you','farewell','ciao'],
      r: "Safe travels! Come back anytime — I'm here 24/7. Have a wonderful journey! ✈️" }
  ];

  function localResponse(msg) {
    var lower = msg.toLowerCase();
    for (var i = 0; i < FAQ.length; i++) {
      var item = FAQ[i];
      for (var j = 0; j < item.k.length; j++) {
        if (lower.indexOf(item.k[j]) !== -1) return item.r;
      }
    }
    return "I can help with visa requirements, UAE tourism activities, flights, hotels, and travel tips! What would you like to know?";
  }

  /* ══════════════════════════════════════════════════════════
   * CSS
   * ══════════════════════════════════════════════════════════ */
  var style = document.createElement('style');
  style.textContent = [
    /* floating button */
    '#vb-wrap{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:12px;pointer-events:none}',
    '#vb-wa{width:58px;height:58px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(37,211,102,.55);transition:transform .2s,box-shadow .2s;text-decoration:none;flex-shrink:0;pointer-events:auto}',
    '#vb-wa:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(37,211,102,.7)}',
    '#vb-wa svg{width:28px;height:28px;pointer-events:none}',
    '#vb-btn{width:58px;height:58px;border-radius:50%;background:#002AD1;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 22px rgba(0,42,209,.5);transition:transform .2s,box-shadow .2s;position:relative;flex-shrink:0;pointer-events:auto}',
    '#vb-btn:hover{transform:scale(1.1);box-shadow:0 6px 30px rgba(0,42,209,.65)}',
    '#vb-btn svg{width:26px;height:26px;pointer-events:none}',
    '#vb-pulse{position:absolute;inset:0;border-radius:50%;background:rgba(0,42,209,.35);animation:vbPulse 2s infinite;pointer-events:none}',
    '@keyframes vbPulse{0%,100%{transform:scale(1);opacity:.7}60%{transform:scale(1.55);opacity:0}}',
    '#vb-online{position:absolute;top:0;right:0;width:14px;height:14px;border-radius:50%;background:#10B981;border:2.5px solid white}',

    /* panel */
    '#vb-panel{width:360px;height:530px;border-radius:20px;background:#fff;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.06);overflow:hidden;transform-origin:bottom right;transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .2s;pointer-events:auto}',
    '#vb-panel.vb-closed{transform:scale(.8) translateY(10px);opacity:0;pointer-events:none}',

    /* header */
    '#vb-hdr{background:#002AD1;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}',
    '#vb-ava{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;position:relative}',
    '#vb-ava-dot{position:absolute;bottom:1px;right:1px;width:9px;height:9px;border-radius:50%;background:#10B981;border:2px solid #002AD1}',
    '#vb-hdr-info{flex:1;min-width:0}',
    '#vb-hdr-name{color:#fff;font-size:14.5px;font-weight:700;font-family:Inter,sans-serif}',
    '#vb-hdr-status{color:rgba(255,255,255,.75);font-size:11.5px;font-family:Inter,sans-serif;margin-top:1px;min-height:16px}',
    '#vb-close-btn{background:rgba(255,255,255,.15);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;color:#fff;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;line-height:1}',
    '#vb-close-btn:hover{background:rgba(255,255,255,.3)}',

    /* messages */
    '#vb-msgs{flex:1;overflow-y:auto;padding:14px 14px 4px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}',
    '#vb-msgs::-webkit-scrollbar{width:4px}',
    '#vb-msgs::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}',
    '.vb-m{display:flex;gap:8px;align-items:flex-end;animation:vbFadeIn .2s ease}',
    '@keyframes vbFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
    '.vb-m-bot{align-self:flex-start}',
    '.vb-m-user{align-self:flex-end;flex-direction:row-reverse}',
    '.vb-ico{width:26px;height:26px;border-radius:50%;background:#002AD1;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}',
    '.vb-bub{max-width:240px;padding:9px 13px;border-radius:16px;font-size:13px;line-height:1.6;font-family:Inter,sans-serif}',
    '.vb-m-bot .vb-bub{background:#F3F4F6;color:#111827;border-bottom-left-radius:3px}',
    '.vb-m-user .vb-bub{background:#002AD1;color:#fff;border-bottom-right-radius:3px}',

    /* typing dots */
    '#vb-typing{display:none;align-self:flex-start}',
    '#vb-typing.on{display:flex}',
    '.vb-dots{display:flex;gap:4px;padding:10px 14px;align-items:center}',
    '.vb-dots span{width:7px;height:7px;border-radius:50%;background:#9CA3AF;animation:vbBounce 1.1s infinite}',
    '.vb-dots span:nth-child(2){animation-delay:.18s}',
    '.vb-dots span:nth-child(3){animation-delay:.36s}',
    '@keyframes vbBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}',

    /* suggestions */
    '#vb-sugg{padding:6px 12px 8px;display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0}',
    '.vb-chip{background:#e8edff;color:#002AD1;border:1px solid #a0b4ff;border-radius:50px;padding:5px 11px;font-size:12px;font-weight:500;cursor:pointer;font-family:Inter,sans-serif;white-space:nowrap;transition:background .15s;line-height:1.3}',
    '.vb-chip:hover{background:#c7d4ff}',

    /* input bar */
    '#vb-bar{padding:10px 12px;border-top:1px solid #F3F4F6;display:flex;gap:8px;align-items:center;flex-shrink:0;background:#fff}',
    '#vb-mic{width:38px;height:38px;border-radius:50%;border:none;background:#F3F4F6;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;position:relative}',
    '#vb-mic:hover{background:#E5E7EB}',
    '#vb-mic.on{background:#002AD1;animation:vbMicPulse 1.1s infinite}',
    '#vb-mic.on svg{stroke:#fff!important}',
    '@keyframes vbMicPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,42,209,.55)}50%{box-shadow:0 0 0 10px rgba(0,42,209,0)}}',
    '#vb-inp{flex:1;border:1.5px solid #E5E7EB;border-radius:50px;padding:9px 16px;font-size:13px;font-family:Inter,sans-serif;outline:none;transition:border-color .15s;background:#fff}',
    '#vb-inp:focus{border-color:#002AD1}',
    '#vb-send{width:36px;height:36px;border-radius:50%;border:none;background:#002AD1;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s}',
    '#vb-send:hover{opacity:.85}',

    /* wave animation (listening status) */
    '.vb-wave{display:inline-flex;gap:2px;align-items:center;vertical-align:middle;margin-right:4px}',
    '.vb-wave span{display:inline-block;width:3px;border-radius:2px;background:rgba(255,255,255,.85);animation:vbWave 1s infinite}',
    '.vb-wave span:nth-child(1){height:5px;animation-delay:0s}',
    '.vb-wave span:nth-child(2){height:10px;animation-delay:.15s}',
    '.vb-wave span:nth-child(3){height:7px;animation-delay:.3s}',
    '.vb-wave span:nth-child(4){height:12px;animation-delay:.45s}',
    '.vb-wave span:nth-child(5){height:5px;animation-delay:.6s}',
    '@keyframes vbWave{0%,100%{transform:scaleY(.5)}50%{transform:scaleY(1)}}',

    /* mobile */
    '@media(max-width:420px){#vb-panel{width:calc(100vw - 32px)}#vb-wrap{right:16px;bottom:18px}}'
  ].join('');
  document.head.appendChild(style);

  /* ══════════════════════════════════════════════════════════
   * HTML
   * ══════════════════════════════════════════════════════════ */
  var html = [
    '<div id="vb-wrap">',

      /* panel */
      '<div id="vb-panel" class="vb-closed">',
        '<div id="vb-hdr">',
          '<div id="vb-ava">🤖<div id="vb-ava-dot"></div></div>',
          '<div id="vb-hdr-info">',
            '<div id="vb-hdr-name">Aria &mdash; AI Travel Assistant</div>',
            '<div id="vb-hdr-status">Online &middot; Ready to help</div>',
          '</div>',
          '<button id="vb-close-btn" aria-label="Close">&times;</button>',
        '</div>',

        '<div id="vb-msgs">',
          '<div id="vb-typing" class="vb-m vb-m-bot">',
            '<div class="vb-ico">🤖</div>',
            '<div class="vb-bub"><div class="vb-dots"><span></span><span></span><span></span></div></div>',
          '</div>',
        '</div>',

        '<div id="vb-sugg">',
          '<button class="vb-chip">&#x1F1EC;&#x1F1E7; UK Visa</button>',
          '<button class="vb-chip">&#x1F3DC;&#xFE0F; Desert Safari</button>',
          '<button class="vb-chip">&#x2708;&#xFE0F; Cheap Flights</button>',
          '<button class="vb-chip">&#x1F6C2; Passport Power</button>',
        '</div>',

        '<div id="vb-bar">',
          '<button id="vb-mic" aria-label="Voice input">',
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2">',
              '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>',
              '<path d="M19 10v2a7 7 0 0 1-14 0v-2"/>',
              '<line x1="12" y1="19" x2="12" y2="23"/>',
              '<line x1="8" y1="23" x2="16" y2="23"/>',
            '</svg>',
          '</button>',
          '<input id="vb-inp" type="text" placeholder="Type or tap mic to speak..." autocomplete="off">',
          '<button id="vb-send" aria-label="Send">',
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">',
              '<line x1="22" y1="2" x2="11" y2="13"/>',
              '<polygon points="22 2 15 22 11 13 2 9 22 2"/>',
            '</svg>',
          '</button>',
        '</div>',
      '</div>',

      /* WhatsApp button */
      '<a id="vb-wa" href="https://wa.me/971554642958" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">',
        '<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">',
          '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>',
        '</svg>',
      '</a>',

      /* floating button */
      '<button id="vb-btn" aria-label="Open AI Travel Assistant">',
        '<div id="vb-pulse"></div>',
        '<div id="vb-online"></div>',
        '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">',
          '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>',
          '<path d="M19 10v2a7 7 0 0 1-14 0v-2"/>',
          '<line x1="12" y1="19" x2="12" y2="23"/>',
          '<line x1="8" y1="23" x2="16" y2="23"/>',
        '</svg>',
      '</button>',

    '</div>'
  ].join('');

  document.body.insertAdjacentHTML('beforeend', html);

  /* ══════════════════════════════════════════════════════════
   * Logic
   * ══════════════════════════════════════════════════════════ */
  var Bot = {
    open:      false,
    listening: false,
    greeted:   false,
    rec:       null,
    history:   [],   /* {role:'user'|'assistant', content:str} */

    /* ── UI references (filled after DOM insert) ── */
    el: {
      panel:  null, msgs: null, mic: null, inp: null,
      sugg:   null, typing: null, status: null
    },

    init: function () {
      var e = this.el;
      e.panel   = document.getElementById('vb-panel');
      e.msgs    = document.getElementById('vb-msgs');
      e.mic     = document.getElementById('vb-mic');
      e.inp     = document.getElementById('vb-inp');
      e.sugg    = document.getElementById('vb-sugg');
      e.typing  = document.getElementById('vb-typing');
      e.status  = document.getElementById('vb-hdr-status');

      /* button events */
      document.getElementById('vb-btn').addEventListener('click', this.toggle.bind(this));
      document.getElementById('vb-close-btn').addEventListener('click', this.toggle.bind(this));
      document.getElementById('vb-send').addEventListener('click', this.sendText.bind(this));
      e.inp.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') Bot.sendText();
      });
      e.mic.addEventListener('click', this.toggleMic.bind(this));

      /* suggestion chips */
      var chips = document.querySelectorAll('.vb-chip');
      var labels = ['UK Visa requirements', 'Desert Safari booking', 'Cheap flights from UAE', 'Passport power index'];
      chips.forEach(function (chip, i) {
        chip.addEventListener('click', function () {
          Bot.quick(labels[i] || chip.textContent.trim());
        });
      });

      this.setupRecognition();
    },

    /* ── Open / close ── */
    toggle: function () {
      this.open = !this.open;
      this.el.panel.classList.toggle('vb-closed', !this.open);
      if (this.open && !this.greeted) {
        this.greeted = true;
        var self = this;
        setTimeout(function () {
          self.addMsg('bot',
            "Hello! I'm Aria, your AI travel assistant at Teleio Tourism. " +
            "Ask me about visas, UAE activities, flights, hotels — or just tap the " +
            "<strong>mic</strong> and speak! 🌍");
        }, 350);
      }
      if (!this.open) {
        if (this.rec && this.listening) this.rec.stop();
        if (window.speechSynthesis) speechSynthesis.cancel();
      }
    },

    quick: function (text) {
      this.el.inp.value = text;
      this.el.sugg.style.display = 'none';
      this.sendText();
    },

    /* ── Speech Recognition ── */
    setupRecognition: function () {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        this.el.mic.title = 'Voice input not supported in this browser. Use Chrome or Edge.';
        this.el.mic.style.opacity = '0.45';
        return;
      }
      var r = new SR();
      r.continuous      = false;
      r.interimResults  = true;
      r.lang            = 'en-US';
      var self = this;

      r.onresult = function (ev) {
        var transcript = '';
        for (var i = 0; i < ev.results.length; i++) {
          transcript += ev.results[i][0].transcript;
        }
        self.el.inp.value = transcript;
        if (ev.results[ev.results.length - 1].isFinal) {
          r.stop();
          self.sendText();
        }
      };

      r.onerror = function (ev) {
        self.listening = false;
        self.el.mic.classList.remove('on');
        var msg = ev.error === 'not-allowed'
          ? 'Microphone access denied — please allow in browser settings'
          : 'Mic error: ' + ev.error;
        self.setStatus(msg);
        setTimeout(function () { self.setStatus('Online · Ready to help'); }, 3500);
      };

      r.onend = function () {
        self.listening = false;
        self.el.mic.classList.remove('on');
        if (!self.el.inp.value) self.setStatus('Online · Ready to help');
      };

      this.rec = r;
    },

    toggleMic: function () {
      if (!this.rec) {
        this.setStatus('Use Chrome or Edge for voice input');
        setTimeout(function () { Bot.setStatus('Online · Ready to help'); }, 3000);
        return;
      }
      if (this.listening) {
        this.rec.stop();
        return;
      }
      if (window.speechSynthesis) speechSynthesis.cancel();
      this.el.inp.value = '';
      try {
        this.rec.start();
        this.listening = true;
        this.el.mic.classList.add('on');
        this.setStatus(
          '<span class="vb-wave"><span></span><span></span><span></span><span></span><span></span></span>' +
          'Listening…'
        );
      } catch (e) {
        this.setStatus('Tap mic again to start');
      }
    },

    /* ── Send ── */
    sendText: function () {
      var text = this.el.inp.value.trim();
      if (!text) return;
      this.el.inp.value = '';
      this.el.sugg.style.display = 'none';
      this.process(text);
    },

    process: function (text) {
      this.addMsg('user', text);
      this.showTyping(true);
      this.setStatus('Thinking…');
      var self = this;
      this.getReply(text).then(function (reply) {
        self.showTyping(false);
        self.addMsg('bot', reply);
        self.setStatus('Speaking…');
        self.speak(reply, function () {
          self.setStatus('Online · Ready to help');
        });
      });
    },

    /* ── AI API ── */
    getReply: function (text) {
      var cfg = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.chatbot) ? APP_CONFIG.chatbot : null;
      if (!cfg || !cfg.apiKey) return Promise.resolve(localResponse(text));

      var endpoint = cfg.provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';

      /* keep last 8 turns for context */
      var msgs = [{ role: 'system', content: SYSTEM_PROMPT }]
        .concat(this.history.slice(-8))
        .concat([{ role: 'user', content: text }]);

      var key = cfg.apiKey;
      var model = cfg.model || 'gpt-3.5-turbo';
      var hist = this.history;

      return fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({ model: model, messages: msgs, max_tokens: 200, temperature: 0.75 })
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (reply) {
          hist.push({ role: 'user', content: text });
          hist.push({ role: 'assistant', content: reply.trim() });
          return reply.trim();
        }
        return localResponse(text);
      })
      .catch(function (err) {
        console.warn('[Aria] API error:', err.message);
        return localResponse(text);
      });
    },

    /* ── TTS ── */
    speak: function (text, onEnd) {
      if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }
      speechSynthesis.cancel();

      /* strip HTML tags before speaking */
      var plain = text.replace(/<[^>]+>/g, '');
      var utt = new SpeechSynthesisUtterance(plain);
      utt.rate   = 0.92;
      utt.pitch  = 1.05;
      utt.volume = 1;

      /* pick best English voice */
      var pick = function () {
        var voices = speechSynthesis.getVoices();
        return voices.find(function (v) { return /google.*en/i.test(v.name); })
            || voices.find(function (v) { return /samantha|karen|victoria|zira|aria|emma/i.test(v.name); })
            || voices.find(function (v) { return v.lang.indexOf('en') === 0 && !v.localService; })
            || voices.find(function (v) { return v.lang.indexOf('en') === 0; })
            || null;
      };

      var voice = pick();
      /* voices may not be ready yet */
      if (!voice && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = function () {
          var v = pick();
          if (v) utt.voice = v;
          speechSynthesis.speak(utt);
        };
      } else {
        if (voice) utt.voice = voice;
        speechSynthesis.speak(utt);
      }

      utt.onend   = function () { if (onEnd) onEnd(); };
      utt.onerror = function () { if (onEnd) onEnd(); };
    },

    /* ── Helpers ── */
    addMsg: function (role, html) {
      var el = document.createElement('div');
      el.className = 'vb-m vb-m-' + role;
      el.innerHTML = role === 'bot'
        ? '<div class="vb-ico">🤖</div><div class="vb-bub">' + html + '</div>'
        : '<div class="vb-bub">' + html + '</div>';
      /* insert before typing indicator */
      var typing = this.el.typing;
      this.el.msgs.insertBefore(el, typing);
      this.el.msgs.scrollTop = this.el.msgs.scrollHeight;
    },

    showTyping: function (show) {
      this.el.typing.classList.toggle('on', show);
      this.el.msgs.scrollTop = this.el.msgs.scrollHeight;
    },

    setStatus: function (html) {
      this.el.status.innerHTML = html;
    }
  };

  /* Run after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { Bot.init(); });
  } else {
    Bot.init();
  }

  window.VoiceBot = Bot;
})();
