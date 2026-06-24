// ═══════════════════════════════════════════════════════════════
// WINDY HILL METAL SALES — CONFIGURATOR  (Sessions 1 + 2)
// ═══════════════════════════════════════════════════════════════

var SUPABASE_URL      = 'https://gnjpxtxufklhakobgzqv.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduanB4dHh1ZmtsaGFrb2JnenF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NTk2MTgsImV4cCI6MjA5NzEzNTYxOH0.Z_kveDZp4Zi7SV4pl_6UJ3yx1vpsbDv75KP0HkW3cDU';
var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── State ──────────────────────────────────────────────────────
var state = {
  system: null, systemData: null, catalog: null, settings: null,
  checklist: {}, cart: [], order_total: 0, specFiles: [], customer: {},
  allColors: [],
  mode: null,      // 'complete' | 'alacarte'
  stage: 1,        // current construction stage (1–4) in complete mode
  alcFilter: 'all' // active filter key in alacarte mode
};

// ── Constants ──────────────────────────────────────────────────
var PLACEHOLDER_HERO = 'wh-hero.jpg';
var PLACEHOLDER_AG   = 'wh-ag-panel.jpg';
var PLACEHOLDER_SS   = 'wh-standing-seam.jpg';
var SYSTEM_PLACEHOLDERS = { 'ag-panel': PLACEHOLDER_AG, 'standing-seam': PLACEHOLDER_SS };

var BADGE_CLS = {
  'REQUIRED':    'bg-red-50 text-red-700',
  'RECOMMENDED': 'bg-amber-50 text-amber-700',
  'OPTIONAL':    'bg-gray-100 text-gray-500'
};

var STAGES = [
  { num: 1, label: 'Decking & Underlayment', types: ['underlayment', 'purlins'] },
  { num: 2, label: 'Panels',                 types: ['panels'] },
  { num: 3, label: 'Trim & Closures',        types: ['trim', 'closures', 'custom'] },
  { num: 4, label: 'Fasteners & Accessories', types: ['fasteners', 'clips', 'sealant'] }
];

// ── Helpers ────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function fmt(n) { return (n === null || n === undefined) ? '—' : '$' + parseFloat(n).toFixed(2); }
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
// Returns base_price from DB, falling back to $1.00 placeholder until admin enters real pricing
function getPrice(product) {
  return (product && product.base_price !== null && product.base_price !== undefined)
    ? parseFloat(product.base_price) : 1.00;
}
function fmtUnit(u) {
  return { linear_foot: 'lf', square: 'sq', bag: 'bag', roll: 'roll', each: 'ea' }[u] || u;
}

// ═══════════════════════════════════════════════════════════════
// SESSION 1 — STARTUP + ENTRY SCREEN
// ═══════════════════════════════════════════════════════════════

function showScreen(name) {
  ['loading-screen','error-screen','entry-screen','mode-select-screen','configurator-view'].forEach(function(id) {
    $(id).classList.add('hidden');
  });
  if (name === 'loading') {
    $('loading-screen').classList.remove('hidden');
  } else if (name === 'error') {
    $('error-screen').classList.remove('hidden');
  } else if (name === 'entry') {
    $('entry-screen').classList.remove('hidden');
    $('view-cart-btn').classList.add('hidden');
  } else if (name === 'mode-select') {
    $('mode-select-screen').classList.remove('hidden');
    $('view-cart-btn').classList.add('hidden');
  } else if (name === 'configurator') {
    $('configurator-view').classList.remove('hidden');
    $('view-cart-btn').classList.remove('hidden');
  }
}

// ── Header scroll behavior ─────────────────────────────────────
function setHeaderSolid(solid) {
  var hdr  = document.getElementById('site-header');
  var name = document.getElementById('header-name');
  var sub  = document.getElementById('header-sub');
  var nav  = document.getElementById('site-nav');
  if (!hdr) return;
  if (solid) {
    hdr.style.background = '#fff';
    hdr.style.boxShadow  = '0 1px 3px rgba(0,0,0,0.1)';
    hdr.style.position   = 'sticky';
    if (name) name.style.color = '#1a2d4f';
    if (sub)  sub.style.color  = '#7a3020';
    if (nav)  nav.style.color  = '#4b5563';
  } else {
    hdr.style.background = 'transparent';
    hdr.style.boxShadow  = 'none';
    hdr.style.position   = 'absolute';
    if (name) name.style.color = '#fff';
    if (sub)  sub.style.color  = 'rgba(255,255,255,0.8)';
    if (nav)  nav.style.color  = 'rgba(255,255,255,0.9)';
  }
}

// Start transparent; go solid once user scrolls past hero or enters configurator
window.addEventListener('scroll', function() {
  var onEntry = document.getElementById('entry-screen') &&
    !document.getElementById('entry-screen').classList.contains('hidden');
  setHeaderSolid(!onEntry || window.scrollY > 160);
}, { passive: true });

// ── Account nav ────────────────────────────────────────────────
(function initAccountNav() {
  db.auth.getSession().then(function(r) {
    var user = r.data && r.data.session && r.data.session.user;
    updateAccountNav(user);
  });
  db.auth.onAuthStateChange(function(event, session) {
    updateAccountNav(session && session.user);
  });
})();

function updateAccountNav(user) {
  var linkEl = document.getElementById('account-nav-link');
  var dropEl = document.getElementById('account-nav-dropdown');
  if (!linkEl) return;
  if (user) {
    linkEl.textContent = 'My Account';
    linkEl.href = '#';
    linkEl.onclick = function(e) { e.preventDefault(); dropEl.classList.toggle('hidden'); };
  } else {
    linkEl.textContent = 'Sign In';
    linkEl.href = 'windy-hill-account.html';
    linkEl.onclick = null;
    if (dropEl) dropEl.classList.add('hidden');
  }
}

function configSignOut() {
  db.auth.signOut();
  document.getElementById('account-nav-dropdown').classList.add('hidden');
}

// Close dropdown on outside click
document.addEventListener('click', function(e) {
  var nav = document.getElementById('account-nav');
  var drop = document.getElementById('account-nav-dropdown');
  if (nav && drop && !nav.contains(e.target)) drop.classList.add('hidden');
});

async function loadSettings() {
  var r = await db.from('app_settings').select('*');
  if (r.error) throw r.error;
  return Object.fromEntries(r.data.map(function(x) { return [x.key, x.value]; }));
}

async function loadAllColors() {
  var r = await db.from('colors').select('id,name,hex_code').order('name');
  return r.error ? [] : r.data;
}

async function loadCatalog() {
  var r = await db.from('systems')
    .select('*, categories(*, products(*, product_colors(colors(*)), product_lengths(length_options(*))))')
    .eq('active', true)
    .order('display_order');
  if (r.error) throw r.error;
  r.data.forEach(function(sys) {
    sys.categories = (sys.categories || [])
      .filter(function(c) { return c.active; })
      .sort(function(a,b) { return a.display_order - b.display_order; });
    sys.categories.forEach(function(cat) {
      cat.products = (cat.products || [])
        .filter(function(p) { return p.active; })
        .sort(function(a,b) { return a.display_order - b.display_order; });
    });
  });
  return r.data;
}

function buildEntryScreen(systems) {
  var container = $('system-cards');
  container.innerHTML = '';
  systems.forEach(function(sys) {
    var img = sys.hero_image_url || SYSTEM_PLACEHOLDERS[sys.slug] || PLACEHOLDER_AG;
    var card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-md overflow-hidden flex flex-col';
    card.innerHTML =
      '<div style="height:260px;overflow:hidden"><img src="' + esc(img) + '" alt="' + esc(sys.name) + '" class="w-full h-full object-cover" loading="lazy"></div>' +
      '<div class="p-6 flex flex-col flex-1">' +
        '<h3 class="text-lg font-bold text-gray-800 mb-2">' + esc(sys.name) + '</h3>' +
        '<p class="text-sm text-gray-500 mb-1 font-medium">' + esc(sys.tagline || '') + '</p>' +
        '<p class="text-sm text-gray-500 mb-5 flex-1">' + esc(sys.description || '') + '</p>' +
        '<div class="flex flex-wrap gap-2">' +
          '<button class="btn-rust px-5 py-2.5 rounded font-semibold text-sm transition-colors" onclick="selectSystem(\'' + esc(sys.slug) + '\')">Shop Materials</button>' +
          '<button class="px-4 py-2.5 rounded font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors" onclick="openAboutModal(\'' + esc(sys.slug) + '\')">About</button>' +
          '<button class="px-4 py-2.5 rounded font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors" onclick="openGalleryModal(\'' + esc(sys.slug) + '\')">Gallery</button>' +
        '</div>' +
      '</div>';
    container.appendChild(card);
  });
}

function selectSystem(slug) {
  var sys = state.catalog.find(function(s) { return s.slug === slug; });
  if (!sys) return;
  state.system = slug; state.systemData = sys;
  state.checklist = {}; state.cart = []; state.order_total = 0;
  state.mode = null; state.stage = 1; state.alcFilter = 'all';
  sys.categories.forEach(function(cat) {
    state.checklist[cat.id] = { status: 'pending', items: [] };
  });
  $('system-title').textContent = sys.name + ' Roofing System';
  var titleEl = $('mode-select-title');
  if (titleEl) titleEl.textContent = sys.name + ' Roofing System';
  showScreen('mode-select');
  setHeaderSolid(true);
}

function selectMode(mode) {
  state.mode = mode;
  state.stage = 1;
  state.alcFilter = 'all';
  renderChecklist();
  renderCart();
  showScreen('configurator');
}

function goHome(e) {
  if (e) e.preventDefault();
  state.system = null; state.systemData = null;
  state.checklist = {}; state.cart = []; state.order_total = 0;
  state.mode = null; state.stage = 1; state.alcFilter = 'all';
  hideMobileCart();
  showScreen('entry');
  window.scrollTo(0, 0);
  setHeaderSolid(false);
}

function scrollToCart() {
  var el = $('cart-panel');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function init() {
  $('footer-year').textContent = new Date().getFullYear();
  showScreen('loading');
  try {
    var results = await Promise.all([loadCatalog(), loadSettings(), loadAllColors()]);
    state.catalog    = results[0];
    state.settings   = results[1];
    state.allColors  = results[2];
    if (state.settings.maintenance_mode === 'true') {
      $('maintenance-screen').classList.remove('hidden');
      $('loading-screen').classList.add('hidden');
      return;
    }
    buildEntryScreen(state.catalog);
    showScreen('entry');
  } catch(err) {
    console.error('Catalog load failed:', err);
    showScreen('error');
  }
}

init();

// ═══════════════════════════════════════════════════════════════
// SESSION 2 — CHECKLIST CARDS
// ═══════════════════════════════════════════════════════════════

function getCardType(slug) {
  if (['ag-panels','ss-panels'].indexOf(slug) !== -1)       return 'panels';
  if (['ag-closures','ss-closures'].indexOf(slug) !== -1)   return 'closures';
  if (slug === 'ss-clips')                                   return 'clips';
  if (['ag-fasteners','ss-fasteners'].indexOf(slug) !== -1) return 'fasteners';
  if (['ag-custom','ss-custom'].indexOf(slug) !== -1)        return 'custom';
  if (slug === 'ag-purlins')                                 return 'purlins';
  if (slug.includes('sealant'))                              return 'sealant';
  if (slug.includes('underlayment'))                         return 'underlayment';
  return 'trim';
}

function getStageForCat(cat) {
  var type = getCardType(cat.slug);
  for (var i = 0; i < STAGES.length; i++) {
    if (STAGES[i].types.indexOf(type) !== -1) return STAGES[i].num;
  }
  return 4;
}

function getCatsForStage(n) {
  return state.systemData.categories.filter(function(cat) {
    return getStageForCat(cat) === n;
  });
}

function renderStageProgress() {
  var html = '<div class="px-4 pt-4 pb-3 border-b border-gray-100"><div class="flex items-start">';
  STAGES.forEach(function(s, i) {
    var isDone   = s.num < state.stage;
    var isActive = s.num === state.stage;
    var bg  = isDone ? '#1a2d4f' : isActive ? '#7a3020' : '#fff';
    var bd  = isDone ? '#1a2d4f' : isActive ? '#7a3020' : '#d1d5db';
    var lbl = isActive ? '#1a2d4f' : isDone ? '#7a3020' : '#9ca3af';
    var fw  = (isActive || isDone) ? '600' : '400';
    if (i > 0) {
      var lbg = isDone ? '#1a2d4f' : '#e5e7eb';
      html += '<div style="flex:1;height:2px;background:' + lbg + ';margin-top:13px;min-width:6px"></div>';
    }
    html += '<div style="flex-shrink:0;width:54px;display:flex;flex-direction:column;align-items:center">';
    html += '<div ' + (isDone ? 'onclick="goToStage(' + s.num + ')" style="cursor:pointer;' : 'style="') +
      'width:26px;height:26px;border-radius:50%;border:2px solid ' + bd + ';background:' + bg +
      ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:' +
      (isDone || isActive ? '#fff' : '#9ca3af') + '">' +
      (isDone ? '✓' : s.num) + '</div>';
    html += '<span style="font-size:9px;color:' + lbl + ';font-weight:' + fw + ';text-align:center;margin-top:4px;line-height:1.2;max-width:52px;display:block">' + s.label + '</span>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function advanceStage() {
  if (state.stage < 4) {
    state.stage++;
    renderChecklist();
    var panel = $('checklist-panel');
    if (panel) panel.scrollTop = 0;
  }
}

function goToStage(n) {
  if (n >= 1 && n <= 4) {
    state.stage = n;
    renderChecklist();
    var panel = $('checklist-panel');
    if (panel) panel.scrollTop = 0;
  }
}

function setAlcFilter(filter) {
  state.alcFilter = filter;
  renderChecklist();
}

function renderChecklist() {
  var panel = $('checklist-panel');
  panel.innerHTML = '';

  var hdg = $('checklist-heading');
  if (hdg) hdg.textContent = state.mode === 'alacarte' ? 'Browse Catalog' : 'Build Your Roof';

  if (state.mode === 'complete') {
    // Stage progress bar
    var progressDiv = document.createElement('div');
    progressDiv.innerHTML = renderStageProgress();
    panel.appendChild(progressDiv.firstChild);

    // Stage header
    var currentStage = STAGES[state.stage - 1];
    var hdr = document.createElement('div');
    hdr.className = 'px-4 pt-4 pb-2';
    hdr.innerHTML = '<p class="text-xs text-gray-400 font-semibold uppercase tracking-widest">Step ' + state.stage + ' of 4</p>' +
      '<h3 class="text-base font-bold" style="color:#1a2d4f">' + currentStage.label + '</h3>';
    panel.appendChild(hdr);

    // Current stage categories
    var stageCats = getCatsForStage(state.stage);
    if (stageCats.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'px-4 py-6 text-center text-sm text-gray-400';
      empty.textContent = 'No items in this stage for this system.';
      panel.appendChild(empty);
    } else {
      stageCats.forEach(function(cat) {
        var wrapper = document.createElement('div');
        wrapper.id = 'card-' + cat.id;
        wrapper.className = 'product-card rounded-lg border border-gray-200 mb-2 overflow-hidden bg-white';
        wrapper.innerHTML = buildCardHeaderHTML(cat);
        panel.appendChild(wrapper);
      });
    }

    // Stage navigation buttons
    var navDiv = document.createElement('div');
    navDiv.className = 'px-4 pt-4 pb-6';
    var prevBtn = state.stage > 1
      ? '<button onclick="goToStage(' + (state.stage - 1) + ')" class="text-sm text-gray-500 hover:text-gray-800 font-medium">← ' + STAGES[state.stage - 2].label + '</button>'
      : '<div></div>';
    var nextStage = STAGES[state.stage]; // index = stage number (0-indexed offset by 1)
    var nextBtn = nextStage
      ? '<button onclick="advanceStage()" class="btn-rust px-4 py-2 rounded-lg text-sm font-semibold">Continue to ' + nextStage.label + ' →</button>'
      : '<button onclick="scrollToCart()" class="btn-rust px-4 py-2 rounded-lg text-sm font-semibold">Review Order →</button>';
    navDiv.innerHTML = '<div class="flex items-center justify-between">' + prevBtn + nextBtn + '</div>';
    panel.appendChild(navDiv);

  } else if (state.mode === 'alacarte') {
    // Filter chips
    var filterDiv = document.createElement('div');
    filterDiv.className = 'px-4 pt-3 pb-3 flex flex-wrap gap-2 border-b border-gray-100';
    var filters = [
      { key: 'all', label: 'All' },
      { key: '1', label: 'Decking & Underlayment' },
      { key: '2', label: 'Panels' },
      { key: '3', label: 'Trim & Closures' },
      { key: '4', label: 'Fasteners & Accessories' }
    ];
    filterDiv.innerHTML = filters.map(function(f) {
      var active = state.alcFilter === f.key;
      return '<button onclick="setAlcFilter(\'' + f.key + '\')" style="' +
        (active ? 'background:#7a3020;color:#fff;border-color:#7a3020' : 'background:#fff;color:#4b5563;border-color:#e5e7eb') +
        '" class="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors">' + f.label + '</button>';
    }).join('');
    panel.appendChild(filterDiv);

    var cats = state.systemData.categories.filter(function(cat) {
      if (state.alcFilter === 'all') return true;
      return getStageForCat(cat) === parseInt(state.alcFilter);
    });

    if (cats.length === 0) {
      var empty2 = document.createElement('div');
      empty2.className = 'px-4 py-6 text-center text-sm text-gray-400';
      empty2.textContent = 'No items in this category.';
      panel.appendChild(empty2);
    } else {
      cats.forEach(function(cat) {
        var wrapper = document.createElement('div');
        wrapper.id = 'card-' + cat.id;
        wrapper.className = 'product-card rounded-lg border border-gray-200 mb-2 overflow-hidden bg-white';
        wrapper.innerHTML = buildCardHeaderHTML(cat);
        panel.appendChild(wrapper);
      });
    }

  } else {
    // Fallback (no mode) — show all
    state.systemData.categories.forEach(function(cat) {
      var wrapper = document.createElement('div');
      wrapper.id = 'card-' + cat.id;
      wrapper.className = 'product-card rounded-lg border border-gray-200 mb-2 overflow-hidden bg-white';
      wrapper.innerHTML = buildCardHeaderHTML(cat);
      panel.appendChild(wrapper);
    });
  }
}

function buildCardHeaderHTML(cat) {
  var entry    = state.checklist[cat.id];
  var status   = entry ? entry.status : 'pending';
  var badgeCls = BADGE_CLS[cat.badge] || BADGE_CLS['OPTIONAL'];
  var photoSrc = cat.image_url || ('product-photos/' + cat.slug + '.jpg');

  // Status icon
  var statusIcon = status === 'complete'
    ? '<div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"><span class="text-white text-xs font-bold">✓</span></div>'
    : status === 'skipped'
    ? '<div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><span class="text-gray-400 text-xs font-bold">—</span></div>'
    : status === 'hover-populated'
    ? '<div class="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0"><span class="text-white text-xs font-bold">!</span></div>'
    : status === 'hover-skip-suggested'
    ? '<div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><span class="text-gray-400 text-xs font-bold">—</span></div>'
    : '<div class="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"></div>';

  // Subtitle / hint line
  var subtitle = '';
  if (status === 'complete') {
    subtitle = '<span class="text-xs text-green-600 font-medium">' + esc(buildSummary(cat.id)) + '</span>';
  } else if (status === 'skipped') {
    subtitle = '<span class="text-xs text-gray-400">Skipped — <button type="button" onclick="event.stopPropagation();undoSkip(\'' + cat.id + '\')" class="text-blue-500 hover:underline">Undo</button></span>';
  } else if (status === 'hover-populated') {
    var hd = entry && entry.hoverData;
    var hint = hd ? (
      hd.type === 'linear'        ? hd.lf + ' lf calculated' :
      hd.type === 'panel-area'    ? (hd.lf || Math.ceil(hd.areaFt / 1.333)) + ' lf coil calculated' :
      hd.type === 'panel-runs'    ? 'Panel runs loaded' :
      hd.type === 'fasteners'     ? (hd.roofingBags||0) + '+' + hd.trimBags + ' bags calculated' :
      hd.type === 'ss-fasteners'  ? hd.gimletPacks + ' gimlet + ' + hd.endLapPacks + ' end-lap bags' :
      hd.type === 'clips'         ? hd.fixedClips + ' clips calculated' :
      hd.type === 'sealant'       ? hd.butylRolls + ' rolls + ' + hd.caulkTubes + ' tubes' :
      hd.type === 'underlayment'  ? hd.synSquares + ' sq + ' + hd.iceWaterLf + ' lf calculated' :
      'Hover data loaded'
    ) : 'Hover data loaded';
    subtitle = '<span class="text-xs text-amber-600">📄 ' + esc(hint) + ' — tap to select options</span>';
  } else if (status === 'hover-skip-suggested') {
    subtitle = '<span class="text-xs text-gray-400">Not needed per Hover — tap to confirm or add</span>';
  } else {
    subtitle = '<span class="text-xs text-gray-400">Tap to configure</span>';
  }

  var nameCls = status === 'skipped'
    ? 'line-through text-gray-400 font-semibold text-base'
    : 'text-gray-900 font-semibold text-base leading-snug';

  // Chevron
  var chevron = status !== 'skipped'
    ? '<svg class="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>'
    : '';

  return '<div class="card-header flex items-center gap-4 p-3 select-none" ' +
    'role="button" tabindex="0" ' +
    'onclick="expandCard(\'' + cat.id + '\')" ' +
    'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();expandCard(\'' + cat.id + '\')}">' +
    '<img src="' + esc(photoSrc) + '" alt="" class="w-28 h-28 rounded-xl object-cover flex-shrink-0 bg-gray-100" onerror="this.src=\'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==\'">' +
    '<div class="flex-1 min-w-0 py-1">' +
      (state.mode !== 'alacarte' ? '<div class="mb-1"><span class="text-xs font-semibold px-2 py-0.5 rounded ' + badgeCls + '">' + esc(cat.badge) + '</span></div>' : '') +
      '<div class="' + nameCls + ' mb-1">' + esc(cat.name) + '</div>' +
      '<div>' + subtitle + '</div>' +
    '</div>' +
    '<div class="flex flex-col items-center gap-1 flex-shrink-0">' + statusIcon + chevron + '</div>' +
    '</div>';
}

function toggleCard(catId) {
  expandCard(catId);
}

function expandCard(catId) {
  var cat = state.systemData.categories.find(function(c) { return c.id === catId; });
  if (!cat) return;
  openConfigModal(cat);
}

function collapseCard(catId) {
  closeConfigModal();
}

function repopulateCardBody(cat) {
  var entry = state.checklist[cat.id];
  if (!entry || entry.status !== 'complete') return;
  var saved = entry.savedSelection;
  var type  = getCardType(cat.slug);

  if (type === 'panels') {
    if (saved && saved.productId) {
      var gaugeR = document.querySelector('input[name="gauge-' + cat.id + '"][value="' + saved.productId + '"]');
      if (gaugeR && !gaugeR.checked) {
        gaugeR.checked = true;
        updateRadioBtns('gauge-' + cat.id);
        onGaugeChange(cat.id, saved.productId);
      }
    }
    if (saved && saved.finish) {
      var finR = document.querySelector('input[name="ss-finish-' + cat.id + '"][value="' + saved.finish + '"]');
      if (finR) { finR.checked = true; updateRadioBtns('ss-finish-' + cat.id); }
    }
    if (saved && saved.texture) {
      var texR = document.querySelector('input[name="ss-texture-' + cat.id + '"][value="' + saved.texture + '"]');
      if (texR) { texR.checked = true; updateRadioBtns('ss-texture-' + cat.id); }
    }
    var panelRuns = entry.panelRuns;
    if (panelRuns && panelRuns.length) {
      var container = $('runs-' + cat.id);
      if (container) {
        container.innerHTML = '';
        panelRuns.forEach(function(run) {
          addRun(cat.id);
          var rows = container.querySelectorAll('.run-row');
          var row  = rows[rows.length - 1];
          if (!row) return;
          var lenInp = row.querySelector('.run-length-in');
          var qtyInp = row.querySelector('.run-qty');
          if (lenInp) lenInp.value = run.inches;
          if (qtyInp) qtyInp.value = run.qty;
          updateRunTotal(cat.id, rows.length - 1);
        });
      }
    }
    if (saved && saved.colorId) {
      var pid = saved.productId;
      setTimeout(function() {
        var colorBtn = document.querySelector('#colors-' + cat.id + '-' + pid + ' [data-color-id="' + saved.colorId + '"]');
        if (colorBtn) selectColor(cat.id, pid, colorBtn);
      }, 30);
    }
    return;
  }

  if (type === 'trim' && saved) {
    if (saved.productId) {
      var trimGaugeR = document.querySelector('input[name="gauge-' + cat.id + '"][value="' + saved.productId + '"]');
      if (trimGaugeR && !trimGaugeR.checked) {
        trimGaugeR.checked = true;
        updateRadioBtns('gauge-' + cat.id);
        onGaugeChange(cat.id, saved.productId);
      }
    }
    if (saved.finish) {
      var trimFinR = document.querySelector('input[name="trim-finish-' + cat.id + '"][value="' + saved.finish + '"]');
      if (trimFinR) { trimFinR.checked = true; updateRadioBtns('trim-finish-' + cat.id); }
    }
    if (saved.footage) {
      var ftInp = $('footage-' + cat.id);
      if (ftInp) { ftInp.value = saved.footage; updatePricePreview(cat.id); }
    }
    if (saved.colorId && saved.productId) {
      var tpid = saved.productId;
      setTimeout(function() {
        var colorBtn = document.querySelector('#colors-' + cat.id + '-' + tpid + ' [data-color-id="' + saved.colorId + '"]');
        if (colorBtn) selectColor(cat.id, tpid, colorBtn);
      }, 30);
    }
    return;
  }

  if (type === 'fasteners' && saved) {
    if (saved.screwProductId) {
      var sR = document.querySelector('input[name="screwsize-' + cat.id + '"][value="' + saved.screwProductId + '"]');
      if (sR) { sR.checked = true; updateRadioBtns('screwsize-' + cat.id); }
    }
    if (saved.roofingBags) { var rI = $('roofing-bags-' + cat.id); if (rI) rI.value = saved.roofingBags; }
    if (saved.trimScrewSize) {
      var tR = document.querySelector('input[name="trimscrewsize-' + cat.id + '"][value="' + saved.trimScrewSize + '"]');
      if (tR) { tR.checked = true; updateRadioBtns('trimscrewsize-' + cat.id); }
    }
    if (saved.trimBags) { var tI = $('trim-bags-' + cat.id); if (tI) tI.value = saved.trimBags; }
    if (saved.otherQty) {
      Object.keys(saved.otherQty).forEach(function(pid) {
        var inp = $('fastener-' + pid);
        if (inp && saved.otherQty[pid]) inp.value = saved.otherQty[pid];
      });
    }
    return;
  }

  if ((type === 'closures' || type === 'clips' || type === 'sealant' || type === 'underlayment') && saved && saved.perProduct) {
    var pfxMap = { closures: 'closure-', clips: 'clip-', sealant: 'qty-', underlayment: 'qty-' };
    var pfx = pfxMap[type] || 'qty-';
    Object.keys(saved.perProduct).forEach(function(pid) {
      var inp = $(pfx + pid);
      if (inp && saved.perProduct[pid]) inp.value = saved.perProduct[pid];
    });
    return;
  }
}

function openConfigModal(cat) {
  var badgeCls = BADGE_CLS[cat.badge] || BADGE_CLS['OPTIONAL'];
  var badgeEl  = $('pcm-badge');
  var titleEl  = $('pcm-title');
  var bodyEl   = $('pcm-body');
  if (!badgeEl || !titleEl || !bodyEl) return;
  badgeEl.textContent  = cat.badge;
  badgeEl.className    = 'text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ' + badgeCls;
  titleEl.textContent  = cat.name;
  bodyEl.innerHTML     = buildCardBodyHTML(cat);
  $('product-config-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  initCardBody(cat);
  repopulateCardBody(cat);
}

function closeConfigModal() {
  var modal = $('product-config-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

// ── About Modal ────────────────────────────────────────────────

var ABOUT_CONTENT = {
  'ag-panel': {
    title: 'Ag Panel (R-Panel)',
    sections: [
      { heading: 'What is Ag Panel?', body: 'Ag Panel, also called R-Panel or PBR Panel, is the most widely used metal roofing and siding product in agricultural and light commercial construction. Its ribbed profile gives it excellent strength, and it installs quickly with exposed fasteners.' },
      { heading: 'Best Uses', body: 'Barns, machine sheds, pole buildings, equipment storage, garages, and outbuildings. Also popular for residential re-roofing projects where cost-efficiency is the priority.' },
      { heading: 'Gauges Available', body: '29 gauge — standard economical choice for most applications.\n26 gauge — heavier duty, recommended for high-wind areas or longer panel runs.' },
      { heading: 'Why Metal?', body: 'Metal roofs last 40–70 years with minimal maintenance, reflect solar heat to reduce cooling costs, and are fully recyclable. Compared to shingles, a metal roof is a one-time investment.' }
    ]
  },
  'standing-seam': {
    title: 'Standing Seam',
    sections: [
      { heading: 'What is Standing Seam?', body: 'Standing seam is a premium metal roofing system where the seams between panels rise vertically above the flat panel surface. Fasteners are completely hidden, giving a clean architectural appearance and superior weather resistance.' },
      { heading: 'Best Uses', body: 'Residential homes, custom barns, commercial buildings, and any project where appearance matters. The hidden fastener system virtually eliminates leak points and allows for thermal movement.' },
      { heading: 'Gauges Available', body: '26 gauge — ideal for most residential and light commercial applications.\n24 gauge — heavier, preferred for steeper pitches, longer panel runs, and premium builds.' },
      { heading: 'Profile Options', body: 'Striated — subtle linear texture that adds rigidity and hides minor oil-canning for a refined look.\nFlat — clean, modern surface with a bold architectural statement.' },
      { heading: 'Finish Options', body: 'Textured — slight texture coating that diffuses light and minimizes surface imperfections.\nSmooth — high-gloss smooth paint finish for a sleek, contemporary aesthetic.' }
    ]
  }
};

function openAboutModal(slug) {
  var content = ABOUT_CONTENT[slug];
  var sys = state.catalog && state.catalog.find(function(s) { return s.slug === slug; });
  var title = (content && content.title) || (sys && sys.name) || 'About';
  $('about-title').textContent = title;
  var body = $('about-body');
  if (content) {
    body.innerHTML = content.sections.map(function(s) {
      return '<div><h3 class="font-bold text-gray-800 mb-1">' + esc(s.heading) + '</h3>' +
        '<p class="text-gray-600 leading-relaxed whitespace-pre-line">' + esc(s.body) + '</p></div>';
    }).join('');
  } else if (sys && sys.description) {
    body.innerHTML = '<p class="text-gray-600 leading-relaxed">' + esc(sys.description) + '</p>';
  } else {
    body.innerHTML = '<p class="text-gray-400 italic">No information available yet.</p>';
  }
  $('about-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeAboutModal() {
  $('about-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ── Gallery Modal ──────────────────────────────────────────────

var GALLERY_SECTIONS = {
  'ag-panel': [
    { title: 'Ag Panel Roofing', photos: ['wh-ag-panel.jpg'], caption: 'Classic R-Panel — the most versatile metal roofing product available.' },
    { title: 'Trim Pieces', items: [
      { label: 'Ridge Cap', img: 'product-photos/ag-ridge-cap.jpg' },
      { label: 'Eave Trim', img: 'product-photos/ag-eave-trim.jpg' },
      { label: 'Rake / Gable', img: 'product-photos/ag-rake-trim.jpg' },
      { label: 'Hip Cap', img: 'product-photos/ag-hip-cap.jpg' },
      { label: 'Valley Flashing', img: 'product-photos/ag-valley.jpg' }
    ]}
  ],
  'standing-seam': [
    { title: 'Standing Seam Panels', photos: ['wh-standing-seam.jpg'], caption: 'Hidden fastener system — clean lines, premium look, superior weather resistance.' },
    { title: 'Trim Pieces', items: [
      { label: 'Ridge Cap', img: 'product-photos/ss-ridge-cap.jpg' },
      { label: 'Z-Flashing', img: 'product-photos/ss-z-flashing.jpg' },
      { label: 'Eave Trim', img: 'product-photos/ss-eave-trim.jpg' },
      { label: 'Rake / Gable', img: 'product-photos/ss-rake-trim.jpg' },
      { label: 'Hip Cap', img: 'product-photos/ss-hip-cap.jpg' },
      { label: 'Valley Flashing', img: 'product-photos/ss-valley.jpg' }
    ]}
  ]
};

function openGalleryModal(slug) {
  var sys = state.catalog && state.catalog.find(function(s) { return s.slug === slug; });
  $('gallery-title').textContent = (sys ? sys.name : 'Gallery') + ' — Photo Gallery';
  var sections = GALLERY_SECTIONS[slug] || [];
  var html = '';

  sections.forEach(function(sec) {
    html += '<div class="mb-6">';
    html += '<h3 class="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">' + esc(sec.title) + '</h3>';
    if (sec.photos) {
      sec.photos.forEach(function(src) {
        html += '<div class="rounded-xl overflow-hidden mb-2" style="height:220px">' +
          '<img src="' + esc(src) + '" class="w-full h-full object-cover" onerror="this.parentElement.style.background=\'#e5e7eb\';this.style.display=\'none\'">' +
          '</div>';
        if (sec.caption) html += '<p class="text-xs text-gray-500 italic mb-3">' + esc(sec.caption) + '</p>';
      });
    }
    if (sec.items) {
      html += '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">';
      sec.items.forEach(function(item) {
        html += '<div class="rounded-lg overflow-hidden border border-gray-100">' +
          '<div style="height:100px;background:#f3f4f6">' +
          '<img src="' + esc(item.img) + '" class="w-full h-full object-cover" onerror="this.parentElement.style.background=\'#e5e7eb\';this.style.display=\'none\'">' +
          '</div>' +
          '<div class="px-2 py-1.5 text-xs font-medium text-gray-700 text-center">' + esc(item.label) + '</div>' +
          '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
  });

  // Color palette section (shared)
  html += '<div class="mb-6">';
  html += '<h3 class="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Available Colors</h3>';
  html += '<div class="grid grid-cols-3 sm:grid-cols-4 gap-3">';
  state.allColors.forEach(function(c) {
    html += '<div class="flex flex-col items-center gap-1.5">' +
      '<div class="w-12 h-12 rounded-full shadow border-2 border-white" style="background:' + esc(c.hex_code || '#ccc') + '"></div>' +
      '<span class="text-xs text-gray-700 text-center leading-tight">' + esc(c.name) + '</span>' +
      '</div>';
  });
  html += '</div></div>';

  $('gallery-body').innerHTML = html;
  $('gallery-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeGalleryModal() {
  $('gallery-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

function buildCardBodyHTML(cat) {
  var type = getCardType(cat.slug);
  var html = '<div class="border-t border-gray-100">';

  // Category photo — custom trim shows customer uploads instead
  if (type !== 'custom') {
    var photoSrc = cat.image_url || ('product-photos/' + cat.slug + '.jpg');
    html += '<div style="height:160px;overflow:hidden">' +
      '<img src="' + esc(photoSrc) + '" alt="' + esc(cat.name) + '" ' +
      'class="w-full h-full object-cover" loading="lazy" ' +
      'onerror="this.parentElement.style.display=\'none\'">' +
      '</div>';
  }

  html += '<div class="p-4">';
  if (cat.microcopy) {
    html += '<p class="text-xs text-gray-500 italic mb-3">' + esc(cat.microcopy) + '</p>';
  }
  html += buildFieldsHTML(cat, type);
  html += '<div class="mt-4 pt-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">';
  html += '<button type="button" onclick="commitCard(\'' + cat.id + '\')" class="btn-rust px-4 py-2 rounded font-semibold text-sm transition-colors">Add to Order</button>';

  var skipLabel = cat.skip_label || (cat.badge !== 'REQUIRED' ? 'I do not need this' : null);
  if (skipLabel) {
    html += '<label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">' +
      '<input type="checkbox" id="skip-cb-' + cat.id + '" onchange="handleSkipCheck(\'' + cat.id + '\', this.checked)">' +
      '<span>' + esc(skipLabel) + '</span>' +
      '</label>';
  }
  html += '</div></div></div>';
  return html;
}

// ── Field builders ─────────────────────────────────────────────

function buildFieldsHTML(cat, type) {
  if (type === 'panels') {
    var hd = state.checklist[cat.id] && state.checklist[cat.id].hoverData;
    if (hd && hd.type === 'panel-area') return buildCoilFields(cat, hd);
    return buildPanelFields(cat);
  }
  if (type === 'trim')      return buildTrimFields(cat);
  if (type === 'closures')  return buildClosureFields(cat);
  if (type === 'clips')     return buildClipFields(cat);
  if (type === 'fasteners') return buildFastenerFields(cat);
  if (type === 'custom')    return buildCustomFields(cat);
  if (type === 'purlins')   return buildPurlinFields(cat);
  return buildQtyFields(cat);
}

function buildSSFinishToggle(catId) {
  return '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-2">PROFILE</label>' +
    '<div id="finish-toggle-' + catId + '" class="flex gap-2">' +
    '<label class="cursor-pointer">' +
    '<input type="radio" name="ss-finish-' + catId + '" value="Striated" class="sr-only" checked' +
    ' onchange="updateRadioBtns(\'finish-toggle-' + catId + '\')">' +
    '<span class="inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors bg-gray-800 text-white border-gray-800">Striated</span>' +
    '</label>' +
    '<label class="cursor-pointer">' +
    '<input type="radio" name="ss-finish-' + catId + '" value="Flat" class="sr-only"' +
    ' onchange="updateRadioBtns(\'finish-toggle-' + catId + '\')">' +
    '<span class="inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors bg-white text-gray-600 border-gray-300">Flat</span>' +
    '</label>' +
    '</div></div>' +
    '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-2">FINISH</label>' +
    '<div id="texture-toggle-' + catId + '" class="flex gap-2">' +
    '<label class="cursor-pointer">' +
    '<input type="radio" name="ss-texture-' + catId + '" value="Textured" class="sr-only" checked' +
    ' onchange="updateRadioBtns(\'texture-toggle-' + catId + '\')">' +
    '<span class="inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors bg-gray-800 text-white border-gray-800">Textured</span>' +
    '</label>' +
    '<label class="cursor-pointer">' +
    '<input type="radio" name="ss-texture-' + catId + '" value="Smooth" class="sr-only"' +
    ' onchange="updateRadioBtns(\'texture-toggle-' + catId + '\')">' +
    '<span class="inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors bg-white text-gray-600 border-gray-300">Smooth</span>' +
    '</label>' +
    '</div></div>';
}

function getPanelLabel(cat, product) {
  // For SS, multiple products share the same gauge (12" vs 16" panels) — use full name
  if (cat.slug && cat.slug.includes('ss')) {
    return product.name.replace(/^standing seam\s*/i, '');
  }
  return product.gauge || product.name;
}

function getPanelWidthFt(product) {
  if (!product) return 1.333;
  var m = (product.name || '').match(/(\d+)["]\s*panel/i);
  if (m) return parseInt(m[1]) / 12;
  return 1.333;
}

function buildPanelFields(cat) {
  var products = cat.products;
  var html = '';

  // Gauge
  html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-2">GAUGE / PANEL TYPE</label>';
  html += '<div class="flex flex-wrap gap-2" id="gauges-' + cat.id + '">';
  products.forEach(function(p, i) {
    var label  = getPanelLabel(cat, p);
    var active = i === 0 ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300';
    html += '<label class="cursor-pointer">' +
      '<input type="radio" name="gauge-' + cat.id + '" value="' + p.id + '" class="sr-only" ' + (i===0?'checked':'') +
      ' onchange="onGaugeChange(\'' + cat.id + '\', \'' + p.id + '\')">' +
      '<span class="gauge-lbl inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors ' + active + '">' + esc(label) + '</span>' +
      '</label>';
  });
  html += '</div></div>';

  // Striated / Flat (SS only)
  if (cat.slug && cat.slug.includes('ss')) html += buildSSFinishToggle(cat.id);

  // Color (for first product by default; swapped on gauge change)
  html += '<div id="color-section-' + cat.id + '" class="mb-4">' + buildColorPickerHTML(cat.id, products[0]) + '</div>';

  // Runs table
  html += '<div><label class="block text-xs font-semibold text-gray-600 mb-2">PANEL RUNS <span class="font-normal text-gray-400">(length in inches)</span></label>';
  html += '<div id="runs-' + cat.id + '" class="space-y-2"></div>';
  html += '<button type="button" onclick="addRun(\'' + cat.id + '\')" class="mt-2 text-sm font-medium hover:underline" style="color:#7a3020">+ Add Run</button>';
  html += '</div>';

  return html;
}

function buildCoilFields(cat, hd) {
  var products = cat.products;
  var html = '';
  html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-2">GAUGE / PANEL TYPE</label>';
  html += '<div class="flex flex-wrap gap-2" id="gauges-' + cat.id + '">';
  products.forEach(function(p, i) {
    var label  = getPanelLabel(cat, p);
    var active = i === 0 ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300';
    html += '<label class="cursor-pointer">' +
      '<input type="radio" name="gauge-' + cat.id + '" value="' + p.id + '" class="sr-only" ' + (i===0?'checked':'') +
      ' onchange="onGaugeChange(\'' + cat.id + '\', \'' + p.id + '\')">' +
      '<span class="gauge-lbl inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors ' + active + '">' + esc(label) + '</span>' +
      '</label>';
  });
  html += '</div></div>';
  html += buildSSFinishToggle(cat.id);
  html += '<div id="color-section-' + cat.id + '" class="mb-4">' + buildColorPickerHTML(cat.id, products[0]) + '</div>';
  html += '<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">';
  html += '<div class="font-semibold text-amber-800 mb-1">Hover Import — Coil Calculated</div>';
  html += '<div class="text-amber-900 text-base font-bold"><span id="coil-lf-' + cat.id + '">' + hd.lf.toLocaleString() + '</span> linear feet of coil</div>';
  html += '<div id="coil-note-' + cat.id + '" class="text-xs text-amber-600 mt-1">' + hd.areaFt.toLocaleString() + ' ft² (with waste) ÷ 1.333 (16" panel width)</div>';
  html += '</div>';
  return html;
}

function buildTrimFields(cat) {
  var products = cat.products;
  if (!products || !products.length) return '<p class="text-xs text-gray-400">No products configured.</p>';
  var isSS = cat.slug && cat.slug.startsWith('ss-');
  var html = '';

  // Gauge picker (only when multiple products / gauges available)
  if (products.length > 1) {
    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-2">GAUGE</label>';
    html += '<div class="flex flex-wrap gap-2" id="gauges-' + cat.id + '">';
    products.forEach(function(p, i) {
      var label = p.gauge || p.name;
      var active = i === 0 ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300';
      html += '<label class="cursor-pointer">' +
        '<input type="radio" name="gauge-' + cat.id + '" value="' + p.id + '" class="sr-only" ' + (i===0?'checked':'') +
        ' onchange="onGaugeChange(\'' + cat.id + '\', \'' + p.id + '\')">' +
        '<span class="gauge-lbl inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors ' + active + '">' + esc(label) + '</span>' +
        '</label>';
    });
    html += '</div></div>';
  }

  // Finish toggle for SS trim (Textured / Smooth — no striated since that's panel-only)
  if (isSS) {
    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-2">FINISH</label>';
    html += '<div id="trim-finish-' + cat.id + '" class="flex gap-2">';
    html += '<label class="cursor-pointer">' +
      '<input type="radio" name="trim-finish-' + cat.id + '" value="Textured" class="sr-only" checked' +
      ' onchange="updateRadioBtns(\'trim-finish-' + cat.id + '\')">' +
      '<span class="inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors bg-gray-800 text-white border-gray-800">Textured</span>' +
      '</label>';
    html += '<label class="cursor-pointer">' +
      '<input type="radio" name="trim-finish-' + cat.id + '" value="Smooth" class="sr-only"' +
      ' onchange="updateRadioBtns(\'trim-finish-' + cat.id + '\')">' +
      '<span class="inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors bg-white text-gray-600 border-gray-300">Smooth</span>' +
      '</label>';
    html += '</div></div>';
  }

  // Color picker (always reserve the slot so onGaugeChange can swap it)
  html += '<div id="color-section-' + cat.id + '" class="mb-4">' + buildColorPickerHTML(cat.id, products[0]) + '</div>';

  // Footage input
  var product   = products[0];
  var unitLabel = product.unit_type === 'square' ? 'SQUARES' : 'LINEAR FEET';
  var unitShort = product.unit_type === 'square' ? 'sq' : 'lf';
  html += '<div class="mb-2"><label class="block text-xs font-semibold text-gray-600 mb-1">' + unitLabel + '</label>';
  html += '<div class="flex items-center gap-2">';
  html += '<input type="number" id="footage-' + cat.id + '" min="8" step="1" placeholder="Min 8" class="border border-gray-300 rounded px-3 py-1.5 w-28 text-sm" oninput="updatePricePreview(\'' + cat.id + '\')">';
  html += '<span class="text-sm text-gray-500">' + unitShort + '</span>';
  html += '<span id="trim-unit-price-' + cat.id + '" class="text-xs text-gray-400 ml-1">' + fmt(getPrice(product)) + '/' + unitShort + '</span>';
  html += '</div>';
  html += '<p class="text-xs text-gray-400 mt-1">Minimum order: 8 lf per piece</p>';
  html += '<div id="price-preview-' + cat.id + '" class="text-xs text-gray-500 mt-1 h-4"></div></div>';
  return html;
}

function buildClosureFields(cat) {
  var html = '<div class="space-y-3">';
  cat.products.forEach(function(p) {
    var lbl = p.name.toLowerCase().indexOf('inside') !== -1 ? 'INSIDE CLOSURE (lf)'
            : p.name.toLowerCase().indexOf('outside') !== -1 ? 'OUTSIDE CLOSURE (lf)'
            : esc(p.name).toUpperCase();
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">' + lbl + '</label>';
    html += '<div class="flex items-center gap-2">';
    html += '<input type="number" id="closure-' + p.id + '" min="0" step="1" placeholder="0" class="border border-gray-300 rounded px-3 py-1.5 w-24 text-sm">';
    html += '<span class="text-xs text-gray-400">' + fmt(getPrice(p)) + '/lf</span>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

function buildClipFields(cat) {
  var html = '<div class="space-y-3">';
  cat.products.forEach(function(p) {
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">' + esc(p.name).toUpperCase() + '</label>';
    html += '<div class="flex items-center gap-2">';
    html += '<input type="number" id="clip-' + p.id + '" min="0" step="1" placeholder="0" class="border border-gray-300 rounded px-3 py-1.5 w-24 text-sm">';
    html += '<span class="text-xs text-gray-400">' + fmtUnit(p.unit_type) + ' · ' + fmt(getPrice(p)) + ' ea</span>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

// Hardcoded screw size options used when only one trim screw product exists
var TRIM_SCREW_SIZES = ['1"', '1.5"', '2"', '2.5"'];

function buildFastenerFields(cat) {
  var products   = cat.products;
  var screwProds = products.filter(function(p) { return /roofing screw/i.test(p.name); });
  var trimProds  = products.filter(function(p) { return /trim screw/i.test(p.name); });
  var other      = products.filter(function(p) { return !/roofing screw/i.test(p.name) && !/trim screw/i.test(p.name); });
  var html = '';

  if (screwProds.length) {
    html += '<div class="mb-3"><label class="block text-xs font-semibold text-gray-600 mb-2">ROOFING SCREW SIZE</label>';
    html += '<div class="flex flex-wrap gap-2 mb-2" id="screwsize-' + cat.id + '">';
    screwProds.forEach(function(p, i) {
      var sizeMatch = p.name.match(/([\d.]+["'])/);
      var size = sizeMatch ? sizeMatch[1] : p.name;
      var active = i === 0 ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300';
      html += '<label class="cursor-pointer">' +
        '<input type="radio" name="screwsize-' + cat.id + '" value="' + p.id + '" class="sr-only" ' + (i===0?'checked':'') +
        ' onchange="updateRadioBtns(\'screwsize-' + cat.id + '\')">' +
        '<span class="screw-lbl inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors ' + active + '">' + esc(size) + '</span>' +
        '</label>';
    });
    html += '</div>';
    html += '<div class="flex items-center gap-2">';
    html += '<input type="number" id="roofing-bags-' + cat.id + '" min="0" step="1" placeholder="0" class="border border-gray-300 rounded px-3 py-1.5 w-24 text-sm">';
    html += '<span class="text-xs text-gray-400">bags</span>';
    html += '</div></div>';
  }

  if (trimProds.length) {
    var trimProd = trimProds[0];
    html += '<div class="mb-3"><label class="block text-xs font-semibold text-gray-600 mb-2">TRIM SCREW SIZE</label>';
    if (trimProds.length > 1) {
      // Multiple trim screw products (one per size) — product-driven selector
      html += '<div class="flex flex-wrap gap-2 mb-2" id="trimscrewsize-' + cat.id + '">';
      trimProds.forEach(function(p, i) {
        var sizeMatch = p.name.match(/([\d.]+["'])/);
        var size = sizeMatch ? sizeMatch[1] : p.name;
        var active = i === 0 ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300';
        html += '<label class="cursor-pointer">' +
          '<input type="radio" name="trimscrewsize-' + cat.id + '" value="' + p.id + '" class="sr-only" ' + (i===0?'checked':'') +
          ' onchange="updateRadioBtns(\'trimscrewsize-' + cat.id + '\')">' +
          '<span class="screw-lbl inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors ' + active + '">' + esc(size) + '</span>' +
          '</label>';
      });
      html += '</div>';
    } else {
      // Single trim screw product — show hardcoded size options, record choice in description
      html += '<div class="flex flex-wrap gap-2 mb-2" id="trimscrewsize-' + cat.id + '">';
      TRIM_SCREW_SIZES.forEach(function(size, i) {
        var active = i === 0 ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300';
        html += '<label class="cursor-pointer">' +
          '<input type="radio" name="trimscrewsize-' + cat.id + '" value="' + size + '" class="sr-only" ' + (i===0?'checked':'') +
          ' onchange="updateRadioBtns(\'trimscrewsize-' + cat.id + '\')">' +
          '<span class="screw-lbl inline-block px-3 py-1.5 rounded border text-sm font-medium transition-colors ' + active + '">' + esc(size) + '</span>' +
          '</label>';
      });
      html += '</div>';
    }
    html += '<div class="flex items-center gap-2">';
    html += '<input type="number" id="trim-bags-' + cat.id + '" min="0" step="1" placeholder="0" class="border border-gray-300 rounded px-3 py-1.5 w-24 text-sm">';
    html += '<span class="text-xs text-gray-400">bags · ' + fmt(getPrice(trimProd)) + ' ea</span>';
    html += '</div></div>';
  }

  other.forEach(function(p) {
    html += '<div class="mb-3"><label class="block text-xs font-semibold text-gray-600 mb-1">' + esc(p.name).toUpperCase() + '</label>';
    html += '<div class="flex items-center gap-2">';
    html += '<input type="number" id="fastener-' + p.id + '" min="0" step="1" placeholder="0" class="border border-gray-300 rounded px-3 py-1.5 w-24 text-sm">';
    html += '<span class="text-xs text-gray-400">' + fmtUnit(p.unit_type) + ' · ' + fmt(getPrice(p)) + ' ea</span>';
    html += '</div></div>';
  });

  return html;
}

function buildCustomFields(cat) {
  var isss = cat.slug && cat.slug.includes('ss');
  var html = '';

  // Global drawing uploads (shared across all line items)
  html += '<div class="flex flex-wrap gap-2 mb-3">';
  html += '<button type="button" onclick="openDrawCanvas(\'' + cat.id + '\')"' +
    ' class="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">' +
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
    ' d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>' +
    '</svg> Draw Profile</button>';
  html += '<label class="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">' +
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
    ' d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>' +
    '</svg> Upload Drawings' +
    '<input type="file" class="sr-only" accept=".png,.jpg,.jpeg,.pdf" multiple onchange="handleSpecFileUpload(event,\'' + cat.id + '\')">' +
    '</label>';
  html += '</div>';
  html += '<div id="spec-previews-' + cat.id + '" class="mb-3"></div>';

  // Drawing line items
  html += '<div id="custom-drawings-' + cat.id + '" class="space-y-3 mb-3">';
  html += buildCustomDrawingRow(cat.id, 0);
  html += '</div>';

  html += '<button type="button" onclick="addCustomDrawing(\'' + cat.id + '\')"' +
    ' class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors mb-3">' +
    '+ Add Another Drawing</button>';

  // Additional coil (SS custom only)
  if (isss) {
    html += '<div class="pt-3 border-t border-gray-100">';
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">ADDITIONAL COIL <span class="font-normal text-gray-400">— odds & custom finishes (optional)</span></label>';
    html += '<div class="flex items-center gap-2">';
    html += '<input type="number" id="custom-extra-coil-' + cat.id + '" min="0" step="1" placeholder="0" class="border border-gray-300 rounded px-3 py-1.5 w-24 text-sm">';
    html += '<span class="text-xs text-gray-400">lf of coil</span>';
    html += '</div>';
    html += '<p class="text-xs text-gray-400 mt-1">Extra coil for on-site fab beyond panel calculation</p>';
    html += '</div>';
  }

  return html;
}

function buildCustomDrawingRow(catId, idx) {
  var num   = idx + 1;
  var gauges  = ['26ga','29ga','24ga','22ga','Other'];
  var finishes = ['Textured','Smooth','Matte','Other'];
  var gaugeOpts  = gauges.map(function(g)  { return '<option>' + g + '</option>'; }).join('');
  var finishOpts = finishes.map(function(f) { return '<option>' + f + '</option>'; }).join('');
  var colorOpts  = '<option value="">Select color…</option>' + state.allColors.map(function(c) {
    return '<option value="' + esc(c.name) + '">' + esc(c.name) + '</option>';
  }).join('');
  var removeBtn  = idx > 0
    ? '<button type="button" onclick="removeCustomDrawing(\'' + catId + '\',this)" class="text-gray-300 hover:text-red-400 text-xl leading-none">×</button>'
    : '<span></span>';

  return '<div class="custom-draw-row border border-gray-200 rounded-lg p-3">' +
    '<div class="flex justify-between items-center mb-2">' +
    '<span class="draw-num-label text-xs font-bold text-gray-500 uppercase tracking-wide">Drawing #' + num + '</span>' +
    removeBtn + '</div>' +
    // Description
    '<div class="mb-2"><label class="block text-xs font-semibold text-gray-600 mb-1">PROFILE / DESCRIPTION</label>' +
    '<input type="text" class="cd-desc border border-gray-300 rounded px-3 py-1.5 w-full text-sm" placeholder="e.g. Drip edge, Z-bar, fascia cap…"></div>' +
    // Gauge + Finish
    '<div class="grid grid-cols-2 gap-2 mb-2">' +
    '<div><label class="block text-xs font-semibold text-gray-600 mb-1">GAUGE</label>' +
    '<select class="cd-gauge border border-gray-300 rounded px-2 py-1.5 w-full text-sm">' + gaugeOpts + '</select></div>' +
    '<div><label class="block text-xs font-semibold text-gray-600 mb-1">FINISH</label>' +
    '<select class="cd-finish border border-gray-300 rounded px-2 py-1.5 w-full text-sm">' + finishOpts + '</select></div>' +
    '</div>' +
    // Color
    '<div class="mb-2"><label class="block text-xs font-semibold text-gray-600 mb-1">COLOR</label>' +
    '<select class="cd-color border border-gray-300 rounded px-2 py-1.5 w-full text-sm">' + colorOpts + '</select></div>' +
    // Length × Qty = LF
    '<div class="grid grid-cols-3 gap-2">' +
    '<div><label class="block text-xs font-semibold text-gray-600 mb-1">LENGTH (FT)</label>' +
    '<input type="number" class="cd-len border border-gray-300 rounded px-2 py-1.5 w-full text-sm" min="1" step="0.5" placeholder="10" oninput="updateCustomLF(this)"></div>' +
    '<div><label class="block text-xs font-semibold text-gray-600 mb-1">QTY (PCS)</label>' +
    '<input type="number" class="cd-qty border border-gray-300 rounded px-2 py-1.5 w-full text-sm" min="1" step="1" placeholder="1" oninput="updateCustomLF(this)"></div>' +
    '<div><label class="block text-xs font-semibold text-gray-600 mb-1">TOTAL LF</label>' +
    '<div class="cd-lf text-sm font-semibold text-gray-700 py-1.5">—</div></div>' +
    '</div></div>';
}

function addCustomDrawing(catId) {
  var container = $('custom-drawings-' + catId);
  if (!container) return;
  var idx = container.querySelectorAll('.custom-draw-row').length;
  var tmp = document.createElement('div');
  tmp.innerHTML = buildCustomDrawingRow(catId, idx);
  container.appendChild(tmp.firstElementChild);
}

function removeCustomDrawing(catId, btn) {
  var row = btn.closest('.custom-draw-row');
  if (row) row.remove();
  var container = $('custom-drawings-' + catId);
  if (!container) return;
  container.querySelectorAll('.custom-draw-row').forEach(function(r, i) {
    var lbl = r.querySelector('.draw-num-label');
    if (lbl) lbl.textContent = 'Drawing #' + (i + 1);
  });
}

function updateCustomLF(inp) {
  var row = inp.closest('.custom-draw-row');
  if (!row) return;
  var len = parseFloat((row.querySelector('.cd-len') || {}).value) || 0;
  var qty = parseInt((row.querySelector('.cd-qty')   || {}).value) || 0;
  var el  = row.querySelector('.cd-lf');
  if (el) el.textContent = (len && qty) ? (len * qty).toFixed(1) + ' lf' : '—';
}

function buildQtyFields(cat) {
  if (!cat.products || !cat.products.length) {
    return '<p class="text-xs text-red-400 py-2">No active products configured for this category. Check admin panel.</p>';
  }
  var html = '<div class="space-y-3">';
  cat.products.forEach(function(p) {
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">' + esc(p.name).toUpperCase() + '</label>';
    html += '<div class="flex items-center gap-2">';
    html += '<input type="number" id="qty-' + p.id + '" min="0" step="1" placeholder="0" class="border border-gray-300 rounded px-3 py-1.5 w-24 text-sm">';
    html += '<span class="text-xs text-gray-400">' + fmtUnit(p.unit_type) + ' · ' + fmt(getPrice(p)) + ' ea</span>';
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

// ── Purlins ────────────────────────────────────────────────────
// Purlins are 16ft fixed-length structural members run horizontally
// across the roof, spaced 2ft apart up the slope.
// Formula per panel run: rows = ceil(run_length_ft / 2)
//   sticks_per_row = ceil(total_width_ft / 16)  [36" Ag panel = 3ft wide]
//   sticks_for_run = rows × sticks_per_row

function calcPurlinQty() {
  if (!state.systemData) return null;
  var panelCat = state.systemData.categories.find(function(c) { return c.slug === 'ag-panels'; });
  if (!panelCat) return null;
  var entry = state.checklist[panelCat.id];
  if (!entry || !entry.panelRuns || !entry.panelRuns.length) return null;
  var total = 0;
  entry.panelRuns.forEach(function(run) {
    var lengthFt = run.inches / 12;
    var widthFt  = run.qty * 3;
    var rows     = Math.ceil(lengthFt / 2);
    var perRow   = Math.ceil(widthFt / 16);
    total += rows * perRow;
  });
  return total;
}

function buildPurlinFields(cat) {
  if (!cat.products || !cat.products.length) {
    return '<p class="text-xs text-red-400 py-2">No purlin products configured. Check admin panel.</p>';
  }
  var product = cat.products[0];
  var calc    = calcPurlinQty();
  var html    = '';

  if (calc !== null) {
    var panelCat = state.systemData.categories.find(function(c) { return c.slug === 'ag-panels'; });
    var entry    = state.checklist[panelCat.id];
    var detail   = entry.panelRuns.map(function(r) {
      var lf = r.inches / 12;
      var w  = r.qty * 3;
      return Math.ceil(lf / 2) + ' rows × ' + Math.ceil(w / 16) + ' sticks (' + lf.toFixed(0) + 'ft slope × ' + r.qty + ' panels)';
    }).join('; ');
    html += '<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">';
    html += '<div class="font-semibold text-blue-800 mb-1">Calculated from your panel runs</div>';
    html += '<div class="text-blue-900 text-base font-bold mb-1">' + calc + ' sticks (16 ft each)</div>';
    html += '<div class="text-xs text-blue-600">' + detail + '</div>';
    html += '<div class="text-xs text-blue-600 mt-1">Spaced 2 ft apart up the slope · 3 ft per Ag Panel wide</div>';
    html += '</div>';
  }

  html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">QUANTITY' + (calc !== null ? ' <span class="font-normal text-gray-400">(pre-filled — adjust if needed)</span>' : '') + '</label>';
  html += '<div class="flex items-center gap-2">';
  html += '<input type="number" id="qty-' + product.id + '" min="0" step="1" placeholder="0"' +
    (calc !== null ? ' value="' + calc + '"' : '') +
    ' class="border border-gray-300 rounded px-3 py-1.5 w-24 text-sm">';
  html += '<span class="text-xs text-gray-400">sticks · 16 ft ea · ' + fmt(getPrice(product)) + ' ea</span>';
  html += '</div></div>';
  return html;
}

function commitPurlins(cat) {
  var product = cat.products && cat.products[0];
  if (!product) return [];
  var inp = $('qty-' + product.id);
  var qty = inp ? parseInt(inp.value) || 0 : 0;
  if (!qty) { alert('Please enter a purlin quantity.'); return null; }
  return [{ category: cat.name, description: product.name + ' — 16 ft sticks', specs: qty + ' sticks', line_total: qty * getPrice(product) }];
}

// ── Color Picker ───────────────────────────────────────────────

function getProductColors(product) {
  return (product && product.product_colors || []).map(function(pc) {
    return {
      id: pc.colors.id, name: pc.colors.name,
      hex_code: pc.colors.hex_code, price_modifier: pc.price_modifier || 0
    };
  });
}

function buildColorPickerHTML(catId, product) {
  if (!product) return '';
  var colors = getProductColors(product);
  if (!colors.length) return '';
  var pickerId = 'colors-' + catId + '-' + product.id;
  var html = '<div><label class="block text-xs font-semibold text-gray-600 mb-2">COLOR</label>';
  html += '<div id="' + pickerId + '" class="flex flex-wrap gap-3" data-selected-id="" data-selected-name="" data-selected-modifier="0">';
  colors.forEach(function(c) {
    var bg = c.hex_code ? 'background-color:' + c.hex_code : 'background-color:#ccc';
    html += '<button type="button" class="color-swatch flex flex-col items-center gap-1 group" ' +
      'data-color-id="' + c.id + '" data-color-name="' + esc(c.name) + '" data-color-modifier="' + c.price_modifier + '" ' +
      'onclick="selectColor(\'' + catId + '\',\'' + product.id + '\',this)" ' +
      'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();selectColor(\'' + catId + '\',\'' + product.id + '\',this)}">' +
      '<span class="color-dot w-9 h-9 rounded-full border-2 border-white shadow-md block transition-transform group-hover:scale-110" style="' + bg + '"></span>' +
      '<span class="color-label text-xs text-gray-600 leading-tight text-center" style="max-width:72px;overflow-wrap:break-word">' + esc(c.name) + '</span>' +
      '</button>';
  });
  html += '</div>';
  html += '</div>';
  return html;
}

function selectColor(catId, productId, btn) {
  var container = $('colors-' + catId + '-' + productId);
  if (!container) return;
  container.querySelectorAll('.color-swatch').forEach(function(s) {
    var dot = s.querySelector('.color-dot');
    if (dot) dot.classList.remove('ring-2','ring-offset-2','ring-gray-800');
    var lbl = s.querySelector('.color-label');
    if (lbl) lbl.classList.remove('font-bold','text-gray-900');
  });
  var dot = btn.querySelector('.color-dot');
  if (dot) dot.classList.add('ring-2','ring-offset-2','ring-gray-800');
  var lbl = btn.querySelector('.color-label');
  if (lbl) lbl.classList.add('font-bold','text-gray-900');
  container.dataset.selectedId       = btn.dataset.colorId;
  container.dataset.selectedName     = btn.dataset.colorName;
  container.dataset.selectedModifier = btn.dataset.colorModifier;
  updatePricePreview(catId);
}

function getSelectedColor(catId, productId) {
  var c = $('colors-' + catId + '-' + productId);
  if (!c || !c.dataset.selectedId) return null;
  return { id: c.dataset.selectedId, name: c.dataset.selectedName, price_modifier: parseFloat(c.dataset.selectedModifier) || 0 };
}

// ── Gauge change ───────────────────────────────────────────────

function onGaugeChange(catId, productId) {
  updateRadioBtns('gauges-' + catId);
  var cat     = state.systemData.categories.find(function(c) { return c.id === catId; });
  var product = cat && cat.products.find(function(p) { return p.id === productId; });
  var section = $('color-section-' + catId);
  if (section && product) section.innerHTML = buildColorPickerHTML(catId, product);
  updatePricePreview(catId);
  updateAllRunTotals(catId);
}

function updateRadioBtns(containerId) {
  var container = $(containerId);
  if (!container) return;
  container.querySelectorAll('input[type="radio"]').forEach(function(radio) {
    var span = radio.nextElementSibling;
    if (!span) return;
    var cls = span.className;
    if (radio.checked) {
      cls = cls.replace('bg-white text-gray-600 border-gray-300','bg-gray-800 text-white border-gray-800');
    } else {
      cls = cls.replace('bg-gray-800 text-white border-gray-800','bg-white text-gray-600 border-gray-300');
    }
    span.className = cls;
  });
}

// ── Runs table ─────────────────────────────────────────────────

function getProductLengths(product) {
  return (product && product.product_lengths || [])
    .map(function(pl) { return pl.length_options; })
    .filter(Boolean)
    .sort(function(a,b) { return a.display_order - b.display_order; });
}

function initCardBody(cat) {
  var type = getCardType(cat.slug);

  if (type === 'fasteners') {
    var hdf = state.checklist[cat.id] && state.checklist[cat.id].hoverData;
    if (hdf && hdf.type === 'fasteners') {
      if (hdf.roofingBags) {
        var rInp = $('roofing-bags-' + cat.id);
        if (rInp) rInp.value = hdf.roofingBags;
      }
      if (hdf.trimBags) {
        var tInp = $('trim-bags-' + cat.id);
        if (tInp) tInp.value = hdf.trimBags;
      }
      var stdScrew = cat.products.find(function(p) { return /1\.5/i.test(p.name) && /roofing/i.test(p.name); });
      if (stdScrew) {
        var screwR = document.querySelector('input[name="screwsize-' + cat.id + '"][value="' + stdScrew.id + '"]');
        if (screwR) { screwR.checked = true; updateRadioBtns('screwsize-' + cat.id); }
      }
    } else if (hdf && hdf.type === 'ss-fasteners') {
      cat.products.forEach(function(p) {
        var inp = $('fastener-' + p.id);
        if (!inp) return;
        if (/gimlet|clip screw/i.test(p.name))  inp.value = hdf.gimletPacks;
        else if (/end.?lap/i.test(p.name))       inp.value = hdf.endLapPacks;
      });
    }
    return;
  }

  if (type === 'trim') {
    var hdt = state.checklist[cat.id] && state.checklist[cat.id].hoverData;
    if (hdt && hdt.type === 'linear') {
      var ftInp = $('footage-' + cat.id);
      if (ftInp) { ftInp.value = hdt.lf; updatePricePreview(cat.id); }
    }
    return;
  }

  if (type === 'clips') {
    var hdc = state.checklist[cat.id] && state.checklist[cat.id].hoverData;
    if (hdc && hdc.type === 'clips') {
      cat.products.forEach(function(p) {
        var inp = $('clip-' + p.id);
        if (!inp) return;
        if (/fixed/i.test(p.name))               inp.value = hdc.fixedClips;
        else if (/float|expansion/i.test(p.name)) inp.value = hdc.floatingClips;
        else if (/screw/i.test(p.name))           inp.value = hdc.clipScrewPacks;
      });
    }
    return;
  }

  if (type === 'sealant') {
    var hds = state.checklist[cat.id] && state.checklist[cat.id].hoverData;
    if (hds && hds.type === 'sealant') {
      cat.products.forEach(function(p) {
        var inp = $('qty-' + p.id);
        if (!inp) return;
        if (/butyl/i.test(p.name))                        inp.value = hds.butylRolls;
        else if (/caulk|tube|sealant|epdm/i.test(p.name)) inp.value = hds.caulkTubes;
      });
    }
    return;
  }

  if (type === 'underlayment') {
    var hdu = state.checklist[cat.id] && state.checklist[cat.id].hoverData;
    if (hdu && hdu.type === 'underlayment') {
      cat.products.forEach(function(p) {
        var inp = $('qty-' + p.id);
        if (!inp) return;
        if (/synthetic|syn/i.test(p.name))          inp.value = hdu.synSquares;
        else if (/ice|water|shield/i.test(p.name))  inp.value = hdu.iceWaterLf;
      });
    }
    return;
  }

  if (type !== 'panels') return;
  var hd = state.checklist[cat.id] && state.checklist[cat.id].hoverData;
  if (hd && hd.type === 'panel-runs' && Object.keys(hd.runs).length) {
    Object.keys(hd.runs).forEach(function(inchStr) {
      var count = hd.runs[inchStr];
      addRun(cat.id);
      var container = $('runs-' + cat.id);
      if (!container) return;
      var rows = container.querySelectorAll('.run-row');
      var row  = rows[rows.length - 1];
      if (!row) return;
      var lenInp = row.querySelector('.run-length-in');
      var qtyInp = row.querySelector('.run-qty');
      if (lenInp) lenInp.value = inchStr;
      if (qtyInp) qtyInp.value = count;
      updateRunTotal(cat.id, rows.length - 1);
    });
  } else {
    addRun(cat.id);
  }
}

function addRun(catId) {
  var container = $('runs-' + catId);
  if (!container) return;
  var idx = container.children.length;
  var row = document.createElement('div');
  row.className = 'run-row flex items-center gap-2 flex-wrap';
  row.dataset.runIdx = idx;
  row.innerHTML =
    '<input type="number" class="run-length-in border border-gray-300 rounded px-2 py-1.5 w-24 text-sm" min="1" placeholder=\'e.g. 144\' oninput="updateRunTotal(\'' + catId + '\',' + idx + ')">' +
    '<span class="text-gray-400 text-xs">in ×</span>' +
    '<input type="number" class="run-qty border border-gray-300 rounded px-2 py-1.5 w-16 text-sm" min="1" placeholder="Qty" oninput="updateRunTotal(\'' + catId + '\',' + idx + ')">' +
    '<span class="text-gray-400 text-xs">panels</span>' +
    '<span class="run-subtotal text-xs text-gray-500 w-16 text-right">—</span>' +
    '<button type="button" onclick="removeRun(this)" class="text-gray-300 hover:text-red-400 text-xl leading-none ml-1" aria-label="Remove run">×</button>';
  container.appendChild(row);
}

function removeRun(btn) {
  var row = btn.closest('.run-row');
  if (row) row.remove();
}

function getSelectedPanelProduct(catId) {
  var radio = document.querySelector('input[name="gauge-' + catId + '"]:checked');
  if (!radio) return null;
  var cat = state.systemData.categories.find(function(c) { return c.id === catId; });
  return cat ? cat.products.find(function(p) { return p.id === radio.value; }) : null;
}

function updateRunTotal(catId, idx) {
  var container = $('runs-' + catId);
  if (!container) return;
  var row = container.querySelector('[data-run-idx="' + idx + '"]');
  if (!row) row = container.querySelectorAll('.run-row')[idx];
  if (!row) return;
  var lenInp = row.querySelector('.run-length-in');
  var qtyInp = row.querySelector('.run-qty');
  var subtot = row.querySelector('.run-subtotal');
  var inches = lenInp ? parseFloat(lenInp.value) || 0 : 0;
  var qty    = qtyInp ? parseInt(qtyInp.value) || 0 : 0;
  if (!inches || !qty) { if (subtot) subtot.textContent = '—'; return; }
  var product = getSelectedPanelProduct(catId);
  var color   = product ? getSelectedColor(catId, product.id) : null;
  if (product) {
    var unit  = getPrice(product) + (color ? color.price_modifier : 0);
    var total = (inches / 12) * qty * unit;
    if (subtot) subtot.textContent = '$' + total.toFixed(2);
  }
}

function updateAllRunTotals(catId) {
  var container = $('runs-' + catId);
  if (!container) return;
  container.querySelectorAll('.run-row').forEach(function(row, i) {
    updateRunTotal(catId, i);
  });
}

// ── Price preview (trim) ───────────────────────────────────────

function updatePricePreview(catId) {
  var preview = $('price-preview-' + catId);
  if (!preview) return;
  var cat = state.systemData && state.systemData.categories.find(function(c) { return c.id === catId; });
  if (!cat) return;
  var radio   = document.querySelector('input[name="gauge-' + catId + '"]:checked');
  var product = radio
    ? cat.products.find(function(p) { return p.id === radio.value; })
    : cat.products[0];
  if (!product) return;
  var inp     = $('footage-' + catId);
  var footage = inp ? parseFloat(inp.value) || 0 : 0;
  if (!footage) { preview.textContent = ''; return; }
  var color = getSelectedColor(catId, product.id);
  var unit  = getPrice(product) + (color ? color.price_modifier : 0);
  var unitShort = product.unit_type === 'square' ? 'sq' : 'lf';
  preview.textContent = footage + ' ' + unitShort + ' × ' + fmt(unit) + '/' + unitShort + ' = ' + fmt(footage * unit);
}

// ── Commit Card ────────────────────────────────────────────────

function commitCard(catId) {
  var cat   = state.systemData.categories.find(function(c) { return c.id === catId; });
  if (!cat) return;
  var type  = getCardType(cat.slug);
  var items;

  var hd = state.checklist[catId] && state.checklist[catId].hoverData;
  if (type === 'panels' && hd && hd.type === 'panel-area') items = commitCoil(cat, hd);
  else if (type === 'panels')    items = commitPanels(cat);
  else if (type === 'trim') items = commitTrim(cat);
  else if (type === 'closures') items = commitClosures(cat);
  else if (type === 'clips')    items = commitQtyItems(cat, 'clip-');
  else if (type === 'fasteners') items = commitFasteners(cat);
  else if (type === 'custom')   items = commitCustom(cat);
  else if (type === 'purlins')  items = commitPurlins(cat);
  else items = commitQtyItems(cat, 'qty-');

  if (items === null) return;
  if (!items.length) { alert('Please enter at least one item before adding to order.'); return; }

  state.checklist[catId].status = 'complete';
  state.checklist[catId].items  = items;
  updateCardDisplay(catId);
  collapseCard(catId);
  updateCart();
}

function commitPanels(cat) {
  var product = getSelectedPanelProduct(cat.id);
  if (!product) { alert('Please select a gauge.'); return null; }
  var color    = getSelectedColor(cat.id, product.id);
  var finishR  = document.querySelector('input[name="ss-finish-' + cat.id + '"]:checked');
  var textureR = document.querySelector('input[name="ss-texture-' + cat.id + '"]:checked');
  var finish   = finishR  ? finishR.value  : '';
  var texture  = textureR ? textureR.value : '';
  var runs    = $('runs-' + cat.id);
  if (!runs) return [];
  var items    = [];
  var rawRuns  = [];
  var anyValid = false;
  runs.querySelectorAll('.run-row').forEach(function(row) {
    var lenInp = row.querySelector('.run-length-in');
    var qinp   = row.querySelector('.run-qty');
    var inches = lenInp ? parseFloat(lenInp.value) || 0 : 0;
    var qty    = qinp ? parseInt(qinp.value) || 0 : 0;
    if (!inches || !qty) return;
    anyValid = true;
    rawRuns.push({ inches: inches, qty: qty });
    var desc  = product.name + (finish ? ' — ' + finish : '') + (texture ? ' — ' + texture : '') + (color ? ' — ' + color.name : '');
    var specs = inches + '" × ' + qty + ' panel' + (qty > 1 ? 's' : '');
    var unit  = getPrice(product) + (color ? color.price_modifier : 0);
    var lt    = (inches / 12) * qty * unit;
    items.push({ category: cat.name, description: desc, specs: specs, line_total: lt });
  });
  if (!anyValid) { alert('Please add at least one panel run with a length and quantity.'); return null; }
  state.checklist[cat.id].panelRuns = rawRuns;
  state.checklist[cat.id].savedSelection = { productId: product.id, colorId: color ? color.id : null, finish: finish, texture: texture };
  return items;
}

function commitCoil(cat, hd) {
  var product = getSelectedPanelProduct(cat.id);
  if (!product) { alert('Please select a gauge.'); return null; }
  var color    = getSelectedColor(cat.id, product.id);
  var finishR  = document.querySelector('input[name="ss-finish-' + cat.id + '"]:checked');
  var textureR = document.querySelector('input[name="ss-texture-' + cat.id + '"]:checked');
  var finish   = finishR  ? finishR.value  : '';
  var texture  = textureR ? textureR.value : '';
  var desc     = product.name + (finish ? ' — ' + finish : '') + (texture ? ' — ' + texture : '') + (color ? ' — ' + color.name : '');
  var unit    = getPrice(product) + (color ? color.price_modifier : 0);
  var lt      = hd.lf * unit;
  state.checklist[cat.id].savedSelection = { productId: product.id, colorId: color ? color.id : null, finish: finish, texture: texture };
  return [{ category: cat.name, description: desc, specs: hd.lf.toLocaleString() + ' lf of coil', line_total: lt }];
}

function commitTrim(cat) {
  var radio   = document.querySelector('input[name="gauge-' + cat.id + '"]:checked');
  var product = radio
    ? cat.products.find(function(p) { return p.id === radio.value; })
    : cat.products[0];
  if (!product) return [];
  var inp     = $('footage-' + cat.id);
  var footage = inp ? parseFloat(inp.value) || 0 : 0;
  if (!footage) { alert('Please enter a footage amount.'); return null; }
  if (footage < 8) { alert('Minimum order is 8 lf.'); return null; }
  var color     = getSelectedColor(cat.id, product.id);
  var finishR   = document.querySelector('input[name="trim-finish-' + cat.id + '"]:checked');
  var finish    = finishR ? finishR.value : '';
  var unitShort = product.unit_type === 'square' ? 'sq' : 'lf';
  var unit = getPrice(product) + (color ? color.price_modifier : 0);
  var lt   = footage * unit;
  var desc = product.name + (finish ? ' — ' + finish : '') + (color ? ' — ' + color.name : '');
  state.checklist[cat.id].savedSelection = { productId: product.id, colorId: color ? color.id : null, finish: finish, footage: footage };
  return [{ category: cat.name, description: desc, specs: footage + ' ' + unitShort, line_total: lt }];
}

function commitClosures(cat) {
  var items = [];
  var saved = {};
  cat.products.forEach(function(p) {
    var inp     = $('closure-' + p.id);
    var footage = inp ? parseFloat(inp.value) || 0 : 0;
    saved[p.id] = footage;
    if (!footage) return;
    items.push({ category: cat.name, description: p.name, specs: footage + ' lf', line_total: footage * getPrice(p) });
  });
  state.checklist[cat.id].savedSelection = { perProduct: saved };
  return items;
}

function getCommittedPanelColor() {
  if (!state.systemData) return '';
  var panelCat = state.systemData.categories.find(function(c) { return getCardType(c.slug) === 'panels'; });
  if (!panelCat) return '';
  var entry = state.checklist[panelCat.id];
  if (!entry || entry.status !== 'complete' || !entry.items.length) return '';
  var parts = entry.items[0].description.split(' — ');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function commitFasteners(cat) {
  var items = [];
  var panelColor = getCommittedPanelColor();
  var screwRadio = document.querySelector('input[name="screwsize-' + cat.id + '"]:checked');
  var rBagsInp   = $('roofing-bags-' + cat.id);
  var rBags      = rBagsInp ? parseInt(rBagsInp.value) || 0 : 0;
  if (screwRadio && rBags > 0) {
    var sp = cat.products.find(function(p) { return p.id === screwRadio.value; });
    if (sp) {
      var screwDesc = sp.name + (panelColor ? ' — ' + panelColor : '');
      items.push({ category: cat.name, description: screwDesc, specs: rBags + ' bag' + (rBags>1?'s':''), line_total: rBags * getPrice(sp) });
    }
  }

  var trimProds = cat.products.filter(function(p) { return /trim screw/i.test(p.name); });
  var tBagsInp  = $('trim-bags-' + cat.id);
  var tBags     = tBagsInp ? parseInt(tBagsInp.value) || 0 : 0;
  if (trimProds.length && tBags > 0) {
    var trimSizeRadio = document.querySelector('input[name="trimscrewsize-' + cat.id + '"]:checked');
    var trimProd, trimDesc;
    if (trimProds.length > 1 && trimSizeRadio) {
      // Product-driven size selection
      trimProd = trimProds.find(function(p) { return p.id === trimSizeRadio.value; }) || trimProds[0];
      trimDesc = trimProd.name;
    } else {
      // Single product with UI-selected size
      trimProd = trimProds[0];
      var selectedSize = trimSizeRadio ? trimSizeRadio.value : '';
      trimDesc = trimProd.name + (selectedSize ? ' — ' + selectedSize : '');
    }
    items.push({ category: cat.name, description: trimDesc, specs: tBags + ' bag' + (tBags>1?'s':''), line_total: tBags * getPrice(trimProd) });
  }

  var otherSaved = {};
  cat.products.filter(function(p) { return !/roofing screw/i.test(p.name) && !/trim screw/i.test(p.name); })
    .forEach(function(p) {
      var inp = $('fastener-' + p.id);
      var qty = inp ? parseInt(inp.value) || 0 : 0;
      otherSaved[p.id] = qty;
      if (!qty) return;
      items.push({ category: cat.name, description: p.name, specs: qty + ' ' + fmtUnit(p.unit_type), line_total: qty * getPrice(p) });
    });
  var trimSizeR = document.querySelector('input[name="trimscrewsize-' + cat.id + '"]:checked');
  state.checklist[cat.id].savedSelection = {
    screwProductId: screwRadio ? screwRadio.value : null,
    roofingBags: rBags,
    trimScrewSize: trimSizeR ? trimSizeR.value : null,
    trimBags: tBags,
    otherQty: otherSaved
  };
  return items;
}

function commitCustom(cat) {
  var items = [];
  var container = $('custom-drawings-' + cat.id);

  if (container) {
    container.querySelectorAll('.custom-draw-row').forEach(function(row) {
      var desc   = ((row.querySelector('.cd-desc')   || {}).value || '').trim();
      var gauge  = ((row.querySelector('.cd-gauge')  || {}).value || '').trim();
      var finish = ((row.querySelector('.cd-finish') || {}).value || '').trim();
      var color  = ((row.querySelector('.cd-color')  || {}).value || '').trim();
      var len    = parseFloat((row.querySelector('.cd-len') || {}).value) || 0;
      var qty    = parseInt((row.querySelector('.cd-qty')   || {}).value)  || 0;
      var lf     = len && qty ? len * qty : 0;
      if (!desc && !lf) return;
      var parts  = [];
      if (desc)   parts.push(desc);
      if (gauge)  parts.push(gauge);
      if (finish) parts.push(finish);
      if (color)  parts.push(color);
      var unitPrice = getPrice(cat.products[0]);
      items.push({
        category:    cat.name,
        description: 'Custom Trim — ' + (parts.join(' · ') || 'See drawings'),
        specs:       lf ? (len + '\' × ' + qty + ' pcs = ' + lf.toFixed(1) + ' lf') : 'Footage TBD',
        line_total:  lf ? parseFloat((lf * unitPrice).toFixed(2)) : null
      });
    });
  }

  // Additional coil (SS only)
  var extraInp = $('custom-extra-coil-' + cat.id);
  if (extraInp) {
    var extraLf = parseFloat(extraInp.value) || 0;
    if (extraLf > 0) {
      items.push({ category: cat.name, description: 'Additional Coil — Odds & Custom Finishes', specs: extraLf + ' lf of coil', line_total: null });
    }
  }

  var specCount = state.specFiles.filter(function(f) { return f.catId === cat.id; }).length;
  if (!items.length && !specCount) {
    alert('Please fill in at least one drawing entry before adding to order.');
    return null;
  }
  if (!items.length && specCount) {
    items.push({ category: cat.name, description: 'Custom Trim — See attached drawings', specs: specCount + ' file' + (specCount > 1 ? 's' : '') + ' attached', line_total: null });
  }
  if (items.length && specCount) {
    items[0].description += ' (' + specCount + ' file' + (specCount > 1 ? 's' : '') + ' attached)';
  }
  return items;
}

function commitQtyItems(cat, prefix) {
  var items = [];
  var saved = {};
  cat.products.forEach(function(p) {
    var inp = $(prefix + p.id);
    var qty = inp ? parseInt(inp.value) || 0 : 0;
    saved[p.id] = qty;
    if (!qty) return;
    items.push({ category: cat.name, description: p.name, specs: qty + ' ' + fmtUnit(p.unit_type), line_total: qty * getPrice(p) });
  });
  state.checklist[cat.id].savedSelection = { perProduct: saved };
  return items;
}

// ── Skip / Undo ────────────────────────────────────────────────

function handleSkipCheck(catId, checked) {
  if (checked) skipCard(catId);
}

function skipCard(catId) {
  state.checklist[catId].status = 'skipped';
  state.checklist[catId].items  = [];
  updateCardDisplay(catId);
  collapseCard(catId);
  updateCart();
}

function undoSkip(catId) {
  state.checklist[catId].status = 'pending';
  updateCardDisplay(catId);
  updateCart();
}

function updateCardDisplay(catId) {
  var card = $('card-' + catId);
  if (!card) return;
  var cat = state.systemData.categories.find(function(c) { return c.id === catId; });
  if (!cat) return;
  var hdr = card.querySelector('.card-header');
  if (hdr) hdr.outerHTML = buildCardHeaderHTML(cat);
}

function buildSummary(catId) {
  var entry = state.checklist[catId];
  if (!entry || !entry.items.length) return '';
  var total = 0; var hasNull = false;
  entry.items.forEach(function(i) {
    if (i.line_total === null) hasNull = true; else total += i.line_total;
  });
  var n = entry.items.length;
  return n + (n===1?' item':' items') + ' — ' + (hasNull ? 'Quote Required' : fmt(total));
}

// ═══════════════════════════════════════════════════════════════
// SESSION 2 — CART
// ═══════════════════════════════════════════════════════════════

function updateCart() {
  state.cart = []; state.order_total = 0;
  state.systemData.categories.forEach(function(cat) {
    var entry = state.checklist[cat.id];
    if (!entry || entry.status !== 'complete') return;
    entry.items.forEach(function(item) {
      state.cart.push(item);
      if (item.line_total !== null) state.order_total += item.line_total;
    });
  });
  renderCart();
  updateMobileCartFab();
}

function getPendingRequired() {
  if (!state.systemData || state.mode === 'alacarte') return 0;
  return state.systemData.categories.filter(function(cat) {
    return cat.required && state.checklist[cat.id] && state.checklist[cat.id].status === 'pending';
  }).length;
}

function renderCart() {
  var panel = $('cart-panel');
  if (!panel) return;

  if (!state.cart.length) {
    panel.innerHTML =
      '<div class="flex flex-col items-center justify-center py-16 text-center">' +
        '<svg class="w-12 h-12 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 5h14.6M17 21a1 1 0 100-2 1 1 0 000 2zM9 21a1 1 0 100-2 1 1 0 000 2z"/>' +
        '</svg>' +
        '<p class="text-gray-400 font-medium">Your cart is empty</p>' +
        '<p class="text-gray-300 text-sm mt-1">Add items from the checklist to get started.</p>' +
      '</div>';
    $('cart-footer').classList.add('hidden');
    return;
  }

  // Group by category
  var groups = []; var map = {};
  state.cart.forEach(function(item) {
    if (!map[item.category]) { map[item.category] = []; groups.push(item.category); }
    map[item.category].push(item);
  });

  var html = '';
  groups.forEach(function(catName) {
    html += '<div class="mb-4"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">' + esc(catName) + '</div>';
    map[catName].forEach(function(item) {
      var amt = item.line_total !== null
        ? '<span class="font-medium text-gray-800">' + fmt(item.line_total) + '</span>'
        : '<span class="text-xs text-amber-600 font-medium">Quote Req.</span>';
      html += '<div class="flex justify-between items-start py-1">' +
        '<div class="flex-1 pr-2"><div class="text-sm text-gray-700">' + esc(item.description) + '</div>' +
        (item.specs ? '<div class="text-xs text-gray-400">' + esc(item.specs) + '</div>' : '') +
        '</div><div class="flex-shrink-0">' + amt + '</div></div>';
    });
    html += '</div>';
  });

  panel.innerHTML = html;

  // Footer
  var footer   = $('cart-footer');
  var pending  = getPendingRequired();
  var footHTML = '';

  if (pending > 0) {
    footHTML += '<div class="mb-3 text-xs font-medium text-amber-700 bg-amber-50 rounded px-3 py-2">' +
      '⚠ ' + pending + ' required item' + (pending > 1 ? 's' : '') + ' still pending</div>';
  }

  footHTML += '<div class="flex justify-between items-center mb-3">' +
    '<span class="font-semibold text-gray-700">Subtotal</span>';
  footHTML += '<span class="font-bold text-lg" style="color:#1a2d4f">' + fmt(state.order_total) + '</span>';
  footHTML += '</div>';
  footHTML += '<button type="button" onclick="proceedToCheckout()" class="btn-rust w-full py-3 rounded-lg font-semibold text-base transition-colors">Proceed to Checkout →</button>';

  footer.innerHTML = footHTML;
  footer.classList.remove('hidden');

  // Also update mobile drawer content if open
  var mobileContent = $('mobile-cart-content');
  if (mobileContent) mobileContent.innerHTML = html;
  var mobileFoot = $('mobile-cart-footer');
  if (mobileFoot) mobileFoot.innerHTML = footHTML;
}

// ── Mobile Cart ────────────────────────────────────────────────

function updateMobileCartFab() {
  var fab = $('mobile-cart-fab');
  if (!fab) return;
  if (!state.cart.length) { fab.classList.add('hidden'); return; }
  fab.classList.remove('hidden');
  var totalStr = fmt(state.order_total);
  var countEl    = $('mobile-cart-count');
  var totalEl    = $('mobile-cart-total-fab');
  if (countEl) countEl.textContent = state.cart.length + (state.cart.length === 1 ? ' item' : ' items');
  if (totalEl) totalEl.textContent = totalStr;
}

function showMobileCart() {
  var overlay = $('mobile-cart-overlay');
  if (overlay) { overlay.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
}

function hideMobileCart() {
  var overlay = $('mobile-cart-overlay');
  if (overlay) { overlay.classList.add('hidden'); document.body.style.overflow = ''; }
}

// ═══════════════════════════════════════════════════════════════
// SESSION 4 — CHECKOUT + PAYMENT + ORDER LOGGING
// ═══════════════════════════════════════════════════════════════

var stripeInstance = null;
var stripeCardElement = null;
var checkoutPaymentMethodId = null;
var lastCheckoutPayload = null;
var lastSupabaseOrderId = null;

function validateCheckout() {
  var warnings = [];
  state.systemData.categories.filter(function(c) { return c.required; }).forEach(function(cat) {
    var s = state.checklist[cat.id] && state.checklist[cat.id].status;
    if (!s || s === 'pending') warnings.push(cat.name + ' has not been added or skipped.');
  });
  if (!state.cart.length) warnings.push('Your order is empty.');
  return { valid: warnings.length === 0, warnings: warnings };
}

function proceedToCheckout() {
  var result = validateCheckout();
  if (!result.valid) {
    var override = confirm('⚠ Some required items are still pending:\n\n' + result.warnings.join('\n') + '\n\nProceed anyway?');
    if (!override) return;
  }
  showCustomerInfoModal();
}

// ── Customer Info Modal ────────────────────────────────────────

function showCustomerInfoModal() {
  closeCheckoutModals();
  $('customer-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (state.customer.fname) {
    $('ci-fname').value = state.customer.fname || '';
    $('ci-lname').value = state.customer.lname || '';
    $('ci-phone').value = state.customer.phone || '';
    $('ci-email').value = state.customer.email || '';
    $('ci-jobname').value = state.customer.jobName || '';
    $('ci-notes').value = state.customer.notes || '';
    var radios = document.querySelectorAll('input[name="ci-fulfillment"]');
    radios.forEach(function(r) { r.checked = r.value === state.customer.fulfillment; });
  }
}

function submitCustomerInfo() {
  var errors = false;
  function fieldErr(id, errId, msg) {
    var el = $(id), err = $(errId);
    if (!el.value.trim()) {
      err.textContent = msg; err.classList.remove('hidden');
      el.classList.add('border-red-400'); errors = true;
    } else {
      err.classList.add('hidden'); el.classList.remove('border-red-400');
    }
  }
  fieldErr('ci-fname', 'ci-fname-err', 'First name is required.');
  fieldErr('ci-lname', 'ci-lname-err', 'Last name is required.');
  fieldErr('ci-phone', 'ci-phone-err', 'Phone number is required.');

  var emailEl = $('ci-email'), emailErr = $('ci-email-err');
  var emailVal = emailEl.value.trim();
  if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    emailErr.textContent = emailVal ? 'Enter a valid email address.' : 'Email is required.';
    emailErr.classList.remove('hidden'); emailEl.classList.add('border-red-400'); errors = true;
  } else {
    emailErr.classList.add('hidden'); emailEl.classList.remove('border-red-400');
  }

  if (errors) return;

  var fulfillmentEl = document.querySelector('input[name="ci-fulfillment"]:checked');
  state.customer = {
    fname:       $('ci-fname').value.trim(),
    lname:       $('ci-lname').value.trim(),
    phone:       $('ci-phone').value.trim(),
    email:       emailVal,
    jobName:     $('ci-jobname').value.trim(),
    fulfillment: fulfillmentEl ? fulfillmentEl.value : 'pickup',
    notes:       $('ci-notes').value.trim()
  };
  showPaymentModal();
}

// ── Payment Modal ──────────────────────────────────────────────

function showPaymentModal() {
  closeCheckoutModals();
  $('payment-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  var amtLabel = state.order_total > 0 ? 'Total: $' + state.order_total.toFixed(2) : 'Total: Quoted items — see summary';
  $('payment-amount-label').textContent = amtLabel;

  var key = state.settings && state.settings.stripe_publishable_key;
  if (!key) {
    $('payment-no-stripe').classList.remove('hidden');
    $('payment-stripe-wrap').classList.add('hidden');
    return;
  }
  $('payment-no-stripe').classList.add('hidden');
  $('payment-stripe-wrap').classList.remove('hidden');
  $('pay-btn-amount').textContent = state.order_total > 0 ? '$' + state.order_total.toFixed(2) : '(Quoted)';
  initStripeElements(key);
}

function initStripeElements(publishableKey) {
  if (stripeInstance && stripeCardElement) return;

  function mountCard() {
    stripeInstance = Stripe(publishableKey);
    var elements = stripeInstance.elements();
    stripeCardElement = elements.create('card', {
      style: {
        base: { fontSize: '14px', color: '#374151', '::placeholder': { color: '#9ca3af' } }
      }
    });
    stripeCardElement.mount('#stripe-card-element');
    stripeCardElement.on('change', function(ev) {
      $('stripe-card-error').textContent = ev.error ? ev.error.message : '';
    });
  }

  if (window.Stripe) {
    mountCard();
  } else {
    var script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = mountCard;
    document.head.appendChild(script);
  }
}

function submitPayment() {
  if (!stripeInstance || !stripeCardElement) return;
  var btn = $('pay-btn');
  btn.disabled = true;
  btn.textContent = 'Processing…';
  $('stripe-card-error').textContent = '';

  stripeInstance.createPaymentMethod({ type: 'card', card: stripeCardElement }).then(function(result) {
    if (result.error) {
      $('stripe-card-error').textContent = result.error.message;
      btn.disabled = false;
      btn.innerHTML = 'Pay <span id="pay-btn-amount">$' + state.order_total.toFixed(2) + '</span>';
      return;
    }
    checkoutPaymentMethodId = result.paymentMethod.id;
    runCheckoutProcessing();
  });
}

// ── Processing Steps ───────────────────────────────────────────

function showProcessingModal() {
  closeCheckoutModals();
  $('processing-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  [1,2,3,4].forEach(function(n) {
    var el = $('proc-step-' + n);
    el.querySelector('.proc-icon').textContent = '○';
    el.classList.remove('text-gray-800', 'text-green-600');
    el.classList.add('text-gray-400');
  });
  $('proc-error').classList.add('hidden');
  $('proc-retry-btn').classList.add('hidden');
  var spinner = $('processing-modal').querySelector('.spinner');
  if (spinner) spinner.classList.remove('hidden');
}

function setProcStep(n, done) {
  var el = $('proc-step-' + n);
  el.querySelector('.proc-icon').textContent = done ? '✓' : '◌';
  el.classList.remove('text-gray-400', 'text-gray-800', 'text-green-600');
  el.classList.add(done ? 'text-green-600' : 'text-gray-800');
}

function showProcError(msg) {
  var errEl = $('proc-error');
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
  $('proc-retry-btn').classList.remove('hidden');
  var spinner = $('processing-modal').querySelector('.spinner');
  if (spinner) spinner.classList.add('hidden');
}

async function runCheckoutProcessing() {
  showProcessingModal();

  // Step 1 — Upload spec files
  setProcStep(1, false);
  try {
    await uploadSpecFiles();
    setProcStep(1, true);
  } catch(e) {
    showProcError('Failed to upload files: ' + (e.message || e) + '. Please try again.');
    return;
  }

  // Step 2 — Build payload + write to Supabase first
  setProcStep(2, false);
  var orderId;
  try {
    var payload = buildWebhookPayload(state.customer, null);
    orderId = await writeOrderToSupabase(payload);
    lastSupabaseOrderId = orderId;
    payload = buildWebhookPayload(state.customer, orderId);
    lastCheckoutPayload = payload;
    setProcStep(2, true);
  } catch(e) {
    showProcError('Failed to save your order: ' + (e.message || e) + '. Please try again — no charge has been made.');
    return;
  }

  // Step 3 — Generate PDF + send emails via Edge Function (non-fatal)
  setProcStep(3, false);
  var webhookFired = false;
  try {
    var edgeRes = await fetch(SUPABASE_URL + '/functions/v1/process-order', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ order_id: orderId }),
    });
    var edgeData = await edgeRes.json();
    webhookFired = !!edgeData.ok;
  } catch(e) {
    webhookFired = false;
  }
  setProcStep(3, true);

  // Step 4 — Update webhook_fired flag (edge function already does this, belt-and-suspenders)
  setProcStep(4, false);
  try {
    if (!webhookFired) {
      await db.from('orders').update({ webhook_fired: false }).eq('id', lastSupabaseOrderId);
    }
  } catch(e) { /* non-fatal */ }
  setProcStep(4, true);

  await new Promise(function(r) { setTimeout(r, 600); });
  showSuccessModal(lastCheckoutPayload);
}

function retryCheckout() {
  stripeInstance = null;
  stripeCardElement = null;
  checkoutPaymentMethodId = null;
  showPaymentModal();
}

// ── Webhook + Supabase ─────────────────────────────────────────

function buildWebhookPayload(customerInfo, supabaseOrderId) {
  return {
    order_number:   'WH-' + Date.now(),
    order_id:       supabaseOrderId || '',
    order_date:     new Date().toLocaleDateString('en-US'),
    customer_name:  customerInfo.fname + ' ' + customerInfo.lname,
    customer_phone: customerInfo.phone,
    customer_email: customerInfo.email,
    job_name:       customerInfo.jobName || '',
    fulfillment:    customerInfo.fulfillment,
    order_notes:    customerInfo.notes || '',
    order_total:    state.order_total.toFixed(2),
    system:         state.system,
    driver_email:   (state.settings && state.settings.driver_email) || '',
    payment_method: checkoutPaymentMethodId || '',
    line_items: JSON.stringify(state.cart.map(function(item) {
      return {
        description: item.description,
        specs:       item.specs || '',
        category:    item.category || '',
        amount:      item.line_total != null ? '$' + item.line_total.toFixed(2) : 'Quote Required'
      };
    })),
    spec_files: JSON.stringify(state.specFiles.map(function(f) {
      return { filename: f.filename, url: f.storageUrl || '', description: f.description || '' };
    }))
  };
}

async function writeOrderToSupabase(payload) {
  var userResult = await db.auth.getUser();
  var customerId = (userResult.data && userResult.data.user) ? userResult.data.user.id : null;

  var insertData = {
    order_number:    payload.order_number,
    system:          state.system,
    customer_name:   payload.customer_name,
    customer_phone:  payload.customer_phone,
    customer_email:  payload.customer_email,
    job_name:        payload.job_name,
    fulfillment:     payload.fulfillment,
    order_notes:     payload.order_notes,
    order_total:     state.order_total,
    status:          'pending',
    webhook_fired:   false,
    webhook_payload: payload
  };
  if (customerId) insertData.customer_id = customerId;

  var orderRes = await db.from('orders').insert(insertData).select().single();
  if (orderRes.error) throw orderRes.error;
  var order = orderRes.data;

  var lineRes = await db.from('order_line_items').insert(
    state.cart.map(function(item, i) {
      return {
        order_id:      order.id,
        category:      item.category || '',
        description:   item.description,
        specs:         item.specs || '',
        amount:        item.line_total,
        display_order: i
      };
    })
  );
  if (lineRes.error) throw lineRes.error;

  if (state.specFiles.length > 0) {
    var specRes = await db.from('spec_files').insert(
      state.specFiles.map(function(f) {
        return { order_id: order.id, filename: f.filename, storage_url: f.storageUrl || '', description: f.description || '' };
      })
    );
    if (specRes.error) throw specRes.error;
  }

  return order.id;
}

async function fireWebhook(payload) {
  var webhookUrl = state.settings && state.settings.make_webhook_url;
  if (!webhookUrl) throw new Error('No webhook URL configured.');
  var res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Webhook returned ' + res.status);
}

// ── Success Modal ──────────────────────────────────────────────

function showSuccessModal(payload) {
  closeCheckoutModals();
  $('success-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  $('success-order-number').textContent = payload.order_number;
  $('success-email-note').textContent = 'A confirmation email is on its way to ' + payload.customer_email;
  $('success-total').textContent = '$' + state.order_total.toFixed(2);

  var itemsEl = $('success-line-items');
  itemsEl.innerHTML = '';
  state.cart.forEach(function(item) {
    var row = document.createElement('div');
    row.className = 'flex justify-between gap-4';
    var amtText = item.line_total != null ? '$' + item.line_total.toFixed(2) : 'Quote Req.';
    row.innerHTML = '<span class="text-gray-600 flex-1">' + item.description + '</span>' +
      '<span class="font-medium text-gray-800 flex-shrink-0">' + amtText + '</span>';
    itemsEl.appendChild(row);
  });

  $('acc-email-display').value = state.customer.email || '';
  $('acc-password').value = '';
  $('acc-password-err').classList.add('hidden');
  $('acc-success-msg').classList.add('hidden');
  $('success-account-form').classList.remove('hidden');
  $('skip-account-btn').classList.remove('hidden');
  $('success-account-prompt').classList.remove('hidden');
}

async function createAccount() {
  var pw = $('acc-password').value;
  var errEl = $('acc-password-err');
  if (!pw || pw.length < 8) {
    errEl.textContent = 'Password must be at least 8 characters.';
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');

  var signUpRes = await db.auth.signUp({ email: state.customer.email, password: pw });
  if (signUpRes.error) {
    errEl.textContent = signUpRes.error.message;
    errEl.classList.remove('hidden');
    return;
  }

  var uid = signUpRes.data && signUpRes.data.user && signUpRes.data.user.id;
  if (uid && lastSupabaseOrderId) {
    await db.from('orders').update({ customer_id: uid }).eq('id', lastSupabaseOrderId);
  }

  $('success-account-form').classList.add('hidden');
  $('skip-account-btn').classList.add('hidden');
  var msg = $('acc-success-msg');
  msg.textContent = '✓ Account created! Check your email to confirm.';
  msg.classList.remove('hidden');
}

function skipAccount() {
  $('success-account-prompt').classList.add('hidden');
}

function startNewOrder() {
  closeCheckoutModals();
  state.customer = {};
  state.specFiles = [];
  stripeInstance = null;
  stripeCardElement = null;
  checkoutPaymentMethodId = null;
  lastCheckoutPayload = null;
  lastSupabaseOrderId = null;
  goHome(null);
}

function closeCheckoutModals() {
  ['customer-modal', 'payment-modal', 'processing-modal', 'success-modal'].forEach(function(id) {
    var el = $(id);
    if (el) el.classList.add('hidden');
  });
  document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════════════════════
// SESSION 3 — CUSTOM TRIM CANVAS + SPEC FILE UPLOADS
// ═══════════════════════════════════════════════════════════════

// ── Canvas state ───────────────────────────────────────────────
var fabricCanvas  = null;
var canvasCatId   = null;
var canvasTool    = 'line';
var canvasHistory = [];
var gridVisible   = true;
var gridSpacing   = 20;
var isLineDrawing = false;
var lineStartX, lineStartY, activeLine;
var arcClickCount = 0;
var arcPts        = [];
var arcPreview    = null;

// ── Open / Close ───────────────────────────────────────────────
function openDrawCanvas(catId) {
  canvasCatId   = catId;
  canvasHistory = [];
  arcClickCount = 0; arcPts = []; arcPreview = null;
  $('canvas-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  setTimeout(function() {
    if (fabricCanvas) { fabricCanvas.dispose(); fabricCanvas = null; }
    fabricCanvas = new fabric.Canvas('trim-canvas', {
      width: 800, height: 500,
      backgroundColor: '#ffffff',
      selection: false
    });
    gridVisible = true;
    drawCanvasGrid();
    setCanvasTool('line');
    bindCanvasEvents();
    saveCanvasHistory();
  }, 60);
}

function cancelDrawing() {
  if (fabricCanvas) { fabricCanvas.dispose(); fabricCanvas = null; }
  $('canvas-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

function saveDrawing() {
  if (!fabricCanvas) return;
  setGridVisible(false);
  var dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 1 });
  setGridVisible(true);

  // Check if anything was drawn (canvas is pure white if nothing added)
  var nonGrid = fabricCanvas.getObjects().filter(function(o) { return !o.data || !o.data.isGrid; });
  if (!nonGrid.length) { alert('Nothing drawn yet. Add at least one line or shape before saving.'); return; }

  // Convert data URL → File
  var parts = dataUrl.split(',');
  var mime  = parts[0].match(/:(.*?);/)[1];
  var bstr  = atob(parts[1]);
  var n     = bstr.length;
  var u8    = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  var blob     = new Blob([u8], { type: mime });
  var filename = 'custom-trim-' + (state.specFiles.length + 1) + '.png';
  var file     = new File([blob], filename, { type: mime });

  state.specFiles.push({
    file: file, filename: filename,
    previewUrl: dataUrl, storageUrl: null,
    description: 'Custom Trim Drawing', footage: 0,
    catId: canvasCatId
  });

  renderSpecPreviews(canvasCatId);
  if (fabricCanvas) { fabricCanvas.dispose(); fabricCanvas = null; }
  $('canvas-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ── Grid ───────────────────────────────────────────────────────
function drawCanvasGrid() {
  if (!fabricCanvas) return;
  var w = fabricCanvas.getWidth(), h = fabricCanvas.getHeight();
  for (var x = gridSpacing; x < w; x += gridSpacing) {
    fabricCanvas.add(new fabric.Line([x, 0, x, h], {
      stroke: '#e5e7eb', strokeWidth: 0.5,
      selectable: false, evented: false, data: { isGrid: true }
    }));
  }
  for (var y = gridSpacing; y < h; y += gridSpacing) {
    fabricCanvas.add(new fabric.Line([0, y, w, y], {
      stroke: '#e5e7eb', strokeWidth: 0.5,
      selectable: false, evented: false, data: { isGrid: true }
    }));
  }
  // Send all grid lines to back
  fabricCanvas.getObjects().filter(function(o) { return o.data && o.data.isGrid; })
    .forEach(function(o) { fabricCanvas.sendToBack(o); });
  fabricCanvas.renderAll();
}

function setGridVisible(vis) {
  if (!fabricCanvas) return;
  fabricCanvas.getObjects().forEach(function(o) {
    if (o.data && o.data.isGrid) o.visible = vis;
  });
  fabricCanvas.renderAll();
}

function toggleCanvasGrid() {
  gridVisible = !gridVisible;
  setGridVisible(gridVisible);
  var btn = $('grid-btn');
  if (btn) {
    btn.style.background = gridVisible ? '#dbeafe' : '';
    btn.style.borderColor = gridVisible ? '#93c5fd' : '';
  }
}

function updateCanvasScale() {
  var sel = $('canvas-scale');
  if (!sel || !fabricCanvas) return;
  gridSpacing = parseInt(sel.value);
  fabricCanvas.getObjects().slice().forEach(function(o) {
    if (o.data && o.data.isGrid) fabricCanvas.remove(o);
  });
  if (gridVisible) drawCanvasGrid();
}

// ── Tools ──────────────────────────────────────────────────────
function setCanvasTool(tool) {
  canvasTool = tool;
  document.querySelectorAll('.canvas-tool-btn').forEach(function(btn) {
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
  });
  var activeBtn = $('tool-' + tool);
  if (activeBtn) {
    activeBtn.style.background = '#1a2d4f';
    activeBtn.style.color = '#fff';
    activeBtn.style.borderColor = '#1a2d4f';
  }
  if (!fabricCanvas) return;
  fabricCanvas.isDrawingMode = false;
  fabricCanvas.selection = (tool === 'select');
  fabricCanvas.forEachObject(function(o) {
    if (!o.data || !o.data.isGrid) o.selectable = (tool === 'select');
  });
  // Reset arc state
  arcClickCount = 0; arcPts = [];
  if (arcPreview) { fabricCanvas.remove(arcPreview); arcPreview = null; }
  fabricCanvas.renderAll();
}

function bindCanvasEvents() {
  fabricCanvas.on('mouse:down', function(opt) {
    var p = fabricCanvas.getPointer(opt.e);

    if (canvasTool === 'line') {
      isLineDrawing = true;
      lineStartX = p.x; lineStartY = p.y;
      activeLine = new fabric.Line([p.x, p.y, p.x, p.y], {
        stroke: '#1a2d4f', strokeWidth: 2,
        selectable: false, evented: false
      });
      fabricCanvas.add(activeLine);

    } else if (canvasTool === 'arc') {
      arcClickCount++;
      arcPts.push({ x: p.x, y: p.y });
      if (arcClickCount === 1) {
        arcPreview = new fabric.Path('M ' + p.x + ' ' + p.y + ' L ' + p.x + ' ' + p.y, {
          stroke: '#1a2d4f', strokeWidth: 2, fill: '',
          selectable: false, evented: false
        });
        fabricCanvas.add(arcPreview);
      } else if (arcClickCount === 2) {
        var x1 = arcPts[0].x, y1 = arcPts[0].y, x2 = p.x, y2 = p.y;
        var cx = (x1 + x2) / 2;
        var cy = (y1 + y2) / 2 - Math.max(40, Math.abs(x2 - x1) * 0.3);
        if (arcPreview) fabricCanvas.remove(arcPreview);
        var arc = new fabric.Path(
          'M ' + x1 + ' ' + y1 + ' Q ' + cx + ' ' + cy + ' ' + x2 + ' ' + y2, {
          stroke: '#1a2d4f', strokeWidth: 2, fill: '', selectable: true, evented: true
        });
        fabricCanvas.add(arc);
        arcClickCount = 0; arcPts = []; arcPreview = null;
        saveCanvasHistory();
      }

    } else if (canvasTool === 'text') {
      var txt = new fabric.IText('Label', {
        left: p.x, top: p.y,
        fontSize: 14, fill: '#374151', fontFamily: 'monospace',
        selectable: true, editable: true
      });
      fabricCanvas.add(txt);
      fabricCanvas.setActiveObject(txt);
      txt.enterEditing();
      txt.selectAll();
      saveCanvasHistory();
    }
  });

  fabricCanvas.on('mouse:move', function(opt) {
    var p = fabricCanvas.getPointer(opt.e);
    if (canvasTool === 'line' && isLineDrawing && activeLine) {
      activeLine.set({ x2: p.x, y2: p.y });
      fabricCanvas.renderAll();
    } else if (canvasTool === 'arc' && arcClickCount === 1 && arcPreview) {
      var x1 = arcPts[0].x, y1 = arcPts[0].y;
      var cx = (x1 + p.x) / 2;
      var cy = (y1 + p.y) / 2 - Math.max(40, Math.abs(p.x - x1) * 0.3);
      arcPreview.set({ path: [['M', x1, y1], ['Q', cx, cy, p.x, p.y]] });
      fabricCanvas.renderAll();
    }
  });

  fabricCanvas.on('mouse:up', function() {
    if (canvasTool === 'line' && isLineDrawing) {
      isLineDrawing = false;
      if (activeLine) {
        activeLine.set({ selectable: true, evented: true });
        activeLine = null;
      }
      saveCanvasHistory();
    }
  });
}

// ── History ────────────────────────────────────────────────────
function saveCanvasHistory() {
  if (!fabricCanvas) return;
  canvasHistory.push(JSON.stringify(fabricCanvas.toJSON(['data'])));
  if (canvasHistory.length > 30) canvasHistory.shift();
}

function undoCanvas() {
  if (!fabricCanvas || canvasHistory.length <= 1) return;
  canvasHistory.pop();
  var prev = canvasHistory[canvasHistory.length - 1];
  fabricCanvas.loadFromJSON(prev, function() { fabricCanvas.renderAll(); });
}

function clearCanvas() {
  if (!fabricCanvas) return;
  fabricCanvas.getObjects().slice().forEach(function(o) {
    if (!o.data || !o.data.isGrid) fabricCanvas.remove(o);
  });
  fabricCanvas.renderAll();
  saveCanvasHistory();
}

// ── Spec File Upload (client side) ────────────────────────────
function handleSpecFileUpload(event, catId) {
  var files  = Array.from(event.target.files);
  var errors = [];
  files.forEach(function(file) {
    if (file.size > 10 * 1024 * 1024) { errors.push(file.name + ' exceeds 10 MB.'); return; }
    var ok = ['image/png','image/jpeg','application/pdf'].indexOf(file.type) !== -1;
    if (!ok) { errors.push(file.name + ' — only PNG, JPG, PDF allowed.'); return; }
    var previewUrl = (file.type !== 'application/pdf') ? URL.createObjectURL(file) : null;
    state.specFiles.push({
      file: file, filename: file.name,
      previewUrl: previewUrl, storageUrl: null,
      description: '', footage: 0, catId: catId
    });
  });
  event.target.value = '';
  if (errors.length) alert(errors.join('\n'));
  renderSpecPreviews(catId);
}

function removeSpecFile(idx) {
  var f = state.specFiles[idx];
  if (!f) return;
  var catId = f.catId;
  if (f.previewUrl && f.previewUrl.startsWith('blob:')) URL.revokeObjectURL(f.previewUrl);
  state.specFiles.splice(idx, 1);
  renderSpecPreviews(catId);
}

function renderSpecPreviews(catId) {
  var container = $('spec-previews-' + catId);
  if (!container) return;
  var entries = [];
  state.specFiles.forEach(function(f, i) { if (f.catId === catId) entries.push({ f: f, i: i }); });
  if (!entries.length) { container.innerHTML = ''; return; }

  var html = '<div class="grid grid-cols-3 gap-2 mb-2">';
  entries.forEach(function(x) {
    var f = x.f;
    var thumb = f.previewUrl
      ? '<img src="' + f.previewUrl + '" class="w-full h-16 object-cover" alt="' + esc(f.filename) + '">'
      : '<div class="w-full h-16 bg-red-50 flex items-center justify-center text-xs font-bold text-red-400">PDF</div>';
    html +=
      '<div class="relative border border-gray-200 rounded overflow-hidden bg-gray-50">' +
        thumb +
        '<button type="button" onclick="removeSpecFile(' + x.i + ')" aria-label="Remove" ' +
          'class="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 text-xs font-bold leading-none">' +
          '&times;</button>' +
        '<p class="text-xs text-gray-400 truncate px-1 py-0.5 leading-tight">' + esc(f.filename) + '</p>' +
      '</div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

// ── Spec File Upload to Supabase (called at checkout in Session 4) ──
async function uploadSpecFiles() {
  for (var i = 0; i < state.specFiles.length; i++) {
    var spec = state.specFiles[i];
    if (spec.storageUrl) continue;
    var path = 'specs/' + Date.now() + '-' + spec.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    var r = await db.storage.from('product-photos').upload(path, spec.file);
    if (r.error) throw r.error;
    spec.storageUrl = db.storage.from('product-photos').getPublicUrl(path).data.publicUrl;
  }
}

// ═══════════════════════════════════════════════════════════════
// SESSION 10 — HOVER REPORT IMPORT WIZARD
// ═══════════════════════════════════════════════════════════════

// Set PDF.js worker (called after DOM ready)
function initPdfJs() {
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  } else {
    // PDF.js failed to load — hide the import button gracefully
    var btn = document.getElementById('hover-entry-section');
    if (btn) btn.style.display = 'none';
  }
}

// Add hoverImport to state on init
state.hoverImport = {
  active: false,
  property: '',
  totalAreaFt: 0,
  wasteTable: {},
  facets: [],
  ridgesLF: 0, valleysLF: 0, rakesLF: 0, eavesLF: 0, hipsLF: 0, stepFlashingLF: 0,
  wastePct: 10
};

var hoverWizardStep = 1;
var hoverParsedData = null;
var hoverSelectedSystem = null;
var hoverPanelWidthFt = 1.333;

// ── Wizard open/close ──────────────────────────────────────────
function openHoverWizard() {
  hoverWizardStep = 1;
  hoverParsedData = null;
  hoverSelectedSystem = null;
  document.getElementById('hover-parse-err').classList.add('hidden');
  document.getElementById('hover-parsing').classList.add('hidden');
  document.getElementById('hover-drop-zone').classList.remove('hidden');
  document.getElementById('hover-file-input').value = '';
  showHoverStep(1);
  document.getElementById('hover-wizard').classList.remove('hidden');
}

function closeHoverWizard() {
  document.getElementById('hover-wizard').classList.add('hidden');
}

function showHoverStep(n) {
  hoverWizardStep = n;
  for (var i = 1; i <= 4; i++) {
    var el = document.getElementById('hover-step-' + i);
    if (el) el.classList.toggle('hidden', i !== n);
    var dot = document.getElementById('hw-dot-' + i);
    if (dot) dot.style.background = i <= n ? '#1a2d4f' : '#e5e7eb';
  }
  document.getElementById('hover-step-label').textContent = 'Step ' + n + ' of 4';
  document.getElementById('hw-back-btn').classList.toggle('hidden', n === 1);
  document.getElementById('hw-next-btn').classList.toggle('hidden', n === 1 || n === 4);
  document.getElementById('hw-build-btn').classList.toggle('hidden', n !== 4);
  if (n === 2) renderStep2();
  if (n === 3) renderStep3();
  if (n === 4) renderStep4();
}

function hoverWizardNext() {
  if (hoverWizardStep === 2) {
    var sel = document.querySelector('input[name="hover-system"]:checked');
    if (!sel) { alert('Please select a roofing system.'); return; }
    hoverSelectedSystem = sel.value;
    // For Standing Seam, step 3 is just waste info, skip facet inputs
  }
  if (hoverWizardStep === 3 && hoverSelectedSystem === 'ag-panel') {
    if (!validateFacetInputs()) return;
  }
  showHoverStep(hoverWizardStep + 1);
}

function hoverWizardBack() {
  if (hoverWizardStep > 1) showHoverStep(hoverWizardStep - 1);
}

// ── File handling ──────────────────────────────────────────────
function handleHoverFileSelect(event) {
  var file = event.target.files[0];
  if (file) processHoverFile(file);
}

function handleHoverFileDrop(event) {
  var file = event.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') processHoverFile(file);
}

async function processHoverFile(file) {
  document.getElementById('hover-drop-zone').classList.add('hidden');
  document.getElementById('hover-parse-err').classList.add('hidden');
  document.getElementById('hover-parsing').classList.remove('hidden');
  try {
    var data = await parseHoverPDF(file);
    hoverParsedData = data;
    Object.assign(state.hoverImport, data);
    document.getElementById('hover-parsing').classList.add('hidden');
    showHoverStep(2);
  } catch(e) {
    document.getElementById('hover-parsing').classList.add('hidden');
    document.getElementById('hover-drop-zone').classList.remove('hidden');
    document.getElementById('hover-parse-err').classList.remove('hidden');
    console.error('Hover parse error:', e);
  }
}

// ── PDF parsing ────────────────────────────────────────────────
async function parseHoverPDF(file) {
  var arrayBuffer = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  var fullText = '';
  for (var i = 1; i <= pdf.numPages; i++) {
    var page = await pdf.getPage(i);
    var content = await page.getTextContent();
    fullText += content.items.map(function(item) { return item.str; }).join(' ') + '\n';
  }
  return extractHoverData(fullText);
}

function extractHoverData(text) {
  function parseFtIn(str) {
    if (!str) return 0;
    str = str.trim();
    if (str === '-' || str === '') return 0;
    var m = str.match(/(\d+)'\s*(\d+)?/);
    if (!m) return parseFloat(str) || 0;
    return parseInt(m[1]) + (parseInt(m[2] || 0) / 12);
  }

  // Total area — first ft² occurrence
  var areaMatch = text.match(/([\d,]+)\s*ft²/);
  var totalAreaFt = areaMatch ? parseInt(areaMatch[1].replace(/,/g, '')) : 0;

  // Linear measurements — from ROOF MEASUREMENTS section
  // Format in PDF: "Ridges (RI)                146' 8""
  var ridgesMatch  = text.match(/Ridges?\s*\(RI\)\s+([\d'"\s]+)/i);
  var hipsMatch    = text.match(/Hips?\s*\(H\)\s+([\d'"\s\-]+)/i);
  var valleysMatch = text.match(/Valleys?\s*\(V\)\s+([\d'"\s]+)/i);
  var rakesMatch   = text.match(/Rakes?\s*\(RA\)\s+([\d'"\s]+)/i);
  var eavesMatch   = text.match(/Eaves?\s*\(E\)\s+([\d'"\s]+)/i);
  var sfMatch      = text.match(/Step\s+Flashing\s*\(SF\)\*?\s+([\d'"\s]+)/i);

  // Facets — "RF-1   202 ft²   4/12" (note ft² between area and pitch)
  var facetMatches = Array.from(text.matchAll(/RF-(\d+)\s+([\d,]+)\s*ft²\s+([\d]+\/[\d]+)/g));
  var facets = facetMatches.map(function(m) {
    return {
      id: 'RF-' + m[1],
      areaFt: parseInt(m[2].replace(/,/g, '')),
      pitch: m[3],
      runInches: null
    };
  });

  // Waste table — find all ft² values in the waste section
  var wasteTable = {};
  var wasteSection = text.match(/Zero Waste[\s\S]*?(?:Squares|The table)/i);
  if (wasteSection) {
    var wasteFtMatches = Array.from(wasteSection[0].matchAll(/([\d,]+)\s*ft²/g));
    var pcts = [0, 5, 10, 15, 20];
    wasteFtMatches.forEach(function(m, i) {
      if (i < pcts.length) wasteTable[pcts[i]] = parseInt(m[1].replace(/,/g, ''));
    });
  }
  if (!wasteTable[0]) wasteTable[0] = totalAreaFt;

  // Property address
  var addrMatch = text.match(/(\d+\s+\w[\w\s]+(?:Lane|Dr|St|Ave|Rd|Blvd|Way|Court|Ct|Place|Pl)[^,\n]*)/i);
  var property = addrMatch ? addrMatch[1].trim() : '';

  var ridgesLF = parseFtIn(ridgesMatch && ridgesMatch[1]);
  var eavesLF  = parseFtIn(eavesMatch && eavesMatch[1]);

  if (!totalAreaFt || (!ridgesLF && !eavesLF)) {
    throw new Error('Required measurements not found — may not be a Hover report.');
  }

  return {
    totalAreaFt: totalAreaFt,
    property: property,
    ridgesLF: ridgesLF,
    hipsLF: parseFtIn(hipsMatch && hipsMatch[1]),
    valleysLF: parseFtIn(valleysMatch && valleysMatch[1]),
    rakesLF: parseFtIn(rakesMatch && rakesMatch[1]),
    eavesLF: eavesLF,
    stepFlashingLF: parseFtIn(sfMatch && sfMatch[1]),
    facets: facets,
    wasteTable: wasteTable
  };
}

// ── Step 2: render measurements ────────────────────────────────
function renderStep2() {
  var d = hoverParsedData;
  if (!d) return;

  var propEl = document.getElementById('hw-property');
  if (propEl) propEl.textContent = d.property || '';

  function fmtLf(val) {
    if (!val || val === 0) return '—';
    var ft = Math.floor(val);
    var inches = Math.round((val - ft) * 12);
    return inches ? ft + '\' ' + inches + '"' : ft + '\'';
  }

  var rows = [
    ['Total Area', (d.totalAreaFt || 0).toLocaleString() + ' ft²'],
    ['Ridges', fmtLf(d.ridgesLF)],
    ['Eaves', fmtLf(d.eavesLF)],
    ['Rakes', fmtLf(d.rakesLF)],
    ['Valleys', fmtLf(d.valleysLF)],
    ['Hips', fmtLf(d.hipsLF)],
    ['Facets detected', d.facets.length ? d.facets.length + ' (' + d.facets[0].id + '–' + d.facets[d.facets.length-1].id + ')' : '—'],
    ['Pitch', d.facets.length ? d.facets[0].pitch : '—']
  ];

  var gridEl = document.getElementById('hw-measurements-grid');
  gridEl.innerHTML = rows.map(function(r) {
    return '<div class="text-gray-400">' + r[0] + '</div><div class="font-medium text-gray-800">' + r[1] + '</div>';
  }).join('');

  var sfNote = document.getElementById('hw-step-flashing-note');
  if (d.stepFlashingLF > 0) {
    sfNote.textContent = '⚠ Step flashing detected: ' + fmtLf(d.stepFlashingLF) + ' — not auto-ordered, please review separately.';
    sfNote.classList.remove('hidden');
  } else {
    sfNote.classList.add('hidden');
  }

  document.getElementById('hw-next-btn').classList.remove('hidden');
}

// ── Step 3: render facet inputs or SS info ─────────────────────
function renderStep3() {
  var d = hoverParsedData;
  if (!d) return;

  var facetsSection = document.getElementById('hw-facets-section');
  var ssSection = document.getElementById('hw-ss-step3');

  if (hoverSelectedSystem === 'ag-panel') {
    facetsSection.classList.remove('hidden');
    ssSection.classList.add('hidden');
    var tbody = document.getElementById('hw-facet-rows');
    tbody.innerHTML = d.facets.map(function(f) {
      return '<tr class="border-b border-gray-50">' +
        '<td class="py-2 pr-4 font-medium text-gray-700">' + esc(f.id) + '</td>' +
        '<td class="py-2 pr-4 text-gray-500">' + f.areaFt.toLocaleString() + ' ft²</td>' +
        '<td class="py-2 pr-4">' +
          '<input type="number" min="1" max="480" placeholder="e.g. 144"' +
          ' id="run-' + f.id + '" onchange="updateFacetPreview(\'' + f.id + '\', ' + f.areaFt + ')"' +
          ' oninput="updateFacetPreview(\'' + f.id + '\', ' + f.areaFt + ')"' +
          ' class="w-24 border border-gray-300 rounded px-2 py-1 text-sm"> in' +
        '</td>' +
        '<td class="py-2 text-xs text-gray-400" id="preview-' + f.id + '">—</td>' +
      '</tr>';
    }).join('');
  } else {
    facetsSection.classList.add('hidden');
    ssSection.classList.remove('hidden');
    var areaEl = document.getElementById('hw-ss-area-display');
    var baseLf = Math.ceil((d.totalAreaFt || 0) / hoverPanelWidthFt);
    if (areaEl) areaEl.textContent = baseLf.toLocaleString();
  }
}

function updateFacetPreview(facetId, areaFt) {
  var input = document.getElementById('run-' + facetId);
  var preview = document.getElementById('preview-' + facetId);
  if (!input || !preview) return;
  var inches = parseFloat(input.value);
  if (!inches || inches <= 0) { preview.textContent = '—'; return; }
  var runFt = inches / 12;
  var eaveWidthFt = areaFt / runFt;
  var panelCount = Math.ceil(eaveWidthFt / 3);
  preview.textContent = '~' + panelCount + ' panels';
}

function validateFacetInputs() {
  var d = hoverParsedData;
  var allValid = true;
  d.facets.forEach(function(f) {
    var input = document.getElementById('run-' + f.id);
    if (!input) return;
    var val = parseFloat(input.value);
    if (!val || val <= 0) {
      input.classList.add('border-red-400');
      input.focus();
      allValid = false;
    } else {
      input.classList.remove('border-red-400');
      f.runInches = val;
    }
  });
  if (!allValid) alert('Please enter a run length for all roof sections.');
  return allValid;
}

// ── Step 4: render waste + preview ────────────────────────────
function renderStep4() {
  updateWastePreview();
  document.querySelectorAll('input[name="hover-waste"]').forEach(function(radio) {
    radio.onchange = updateWastePreview;
  });
}

function updateWastePreview() {
  var d = hoverParsedData;
  var sel = document.querySelector('input[name="hover-waste"]:checked');
  var wastePct = sel ? parseInt(sel.value) : 10;
  state.hoverImport.wastePct = wastePct;

  // Show area with waste
  var areaEl = document.getElementById('hw-waste-area');
  var areaWithWaste = d.wasteTable[wastePct] || Math.ceil(d.totalAreaFt * (1 + wastePct / 100));
  var lfWithWaste = Math.ceil(areaWithWaste / hoverPanelWidthFt);
  if (areaEl) areaEl.textContent = areaWithWaste.toLocaleString() + ' ft² → ' + lfWithWaste.toLocaleString() + ' lf of coil';

  var previewEl = document.getElementById('hw-order-preview');
  if (!previewEl) return;

  var lines = [];
  var wasteFactor = 1 + wastePct / 100;

  // Trim waste constants (per spec)
  var TRIM_WASTE  = 1.10;  // +10% for all trim cuts
  var RIDGE_MULT  = 2;     // two-piece ridge/hip cap
  var VALLEY_MULT = 2;     // flashing both sides of valley
  var SF_WASTE    = 1.25;  // step flashing +25%

  if (hoverSelectedSystem === 'ag-panel' && d.facets.length) {
    var groups = {};
    d.facets.forEach(function(f) {
      if (!f.runInches || f.areaFt === 0) return;
      var runFt = f.runInches / 12;
      var count = Math.ceil((f.areaFt / runFt / 3) * wasteFactor);
      var key = f.runInches;
      groups[key] = (groups[key] || 0) + count;
    });
    var panelLines = Object.keys(groups).map(function(inches) {
      return inches + '" × ' + groups[inches] + ' panels';
    });
    lines.push({ label: 'Panels (Ag Panel)', detail: panelLines.join(', '), check: true });
  } else if (hoverSelectedSystem === 'standing-seam') {
    lines.push({ label: 'Coil (Standing Seam)', detail: lfWithWaste.toLocaleString() + ' lf (' + areaWithWaste.toLocaleString() + ' ft²)', check: true });
  }

  if (d.ridgesLF > 0)
    lines.push({ label: 'Ridge Cap (2-piece)', detail: Math.ceil(d.ridgesLF * RIDGE_MULT * TRIM_WASTE) + ' lf (raw ' + Math.ceil(d.ridgesLF) + '\' × 2 + 10%)', check: true });
  if (d.eavesLF > 0)
    lines.push({ label: 'Eave Trim', detail: Math.ceil(d.eavesLF * TRIM_WASTE) + ' lf (raw ' + Math.ceil(d.eavesLF) + '\' + 10%)', check: true });
  if (d.rakesLF > 0)
    lines.push({ label: 'Rake / Gable Trim', detail: Math.ceil(d.rakesLF * TRIM_WASTE) + ' lf (raw ' + Math.ceil(d.rakesLF) + '\' + 10%)', check: true });
  if (d.valleysLF > 0)
    lines.push({ label: 'Valley Flashing', detail: Math.ceil(d.valleysLF * VALLEY_MULT * TRIM_WASTE) + ' lf (raw ' + Math.ceil(d.valleysLF) + '\' × 2 sides + 10%)', check: true });
  else
    lines.push({ label: 'Valley Flashing', detail: 'skipped — none detected', check: false, skip: true });
  if (d.hipsLF > 0)
    lines.push({ label: 'Hip Cap (2-piece)', detail: Math.ceil(d.hipsLF * RIDGE_MULT * TRIM_WASTE) + ' lf (raw ' + Math.ceil(d.hipsLF) + '\' × 2 + 10%)', check: true });
  else
    lines.push({ label: 'Hip Cap', detail: 'skipped — none detected', check: false, skip: true });
  if (d.stepFlashingLF > 0)
    lines.push({ label: 'Step Flashing', detail: Math.ceil(d.stepFlashingLF * SF_WASTE) + ' lf (raw ' + Math.ceil(d.stepFlashingLF) + '\' + 25%)', check: true });

  // Screws
  var ridgeLfS  = Math.ceil((d.ridgesLF  || 0) * RIDGE_MULT  * TRIM_WASTE);
  var hipLfS    = Math.ceil((d.hipsLF    || 0) * RIDGE_MULT  * TRIM_WASTE);
  var valleyLfS = Math.ceil((d.valleysLF || 0) * VALLEY_MULT * TRIM_WASTE);
  var rakeLfS   = Math.ceil((d.rakesLF   || 0) * TRIM_WASTE);
  var eaveLfS   = Math.ceil((d.eavesLF   || 0) * TRIM_WASTE);
  var sfLfS     = Math.ceil((d.stepFlashingLF || 0) * SF_WASTE);
  var totalTrimLfS = ridgeLfS + hipLfS + valleyLfS + rakeLfS + eaveLfS + sfLfS;
  var trimScrewsS  = Math.ceil(totalTrimLfS * 2.5);
  var trimBagsS    = Math.ceil(trimScrewsS / 250);
  if (hoverSelectedSystem === 'ag-panel') {
    var roofingScrewsS = Math.ceil(areaWithWaste / 100 * 80);
    var roofingBagsS   = Math.ceil(roofingScrewsS / 250);
    lines.push({ label: 'Roofing Screws', detail: roofingBagsS + ' bags (' + roofingScrewsS.toLocaleString() + ' screws ÷ 250/bag)', check: true });
    lines.push({ label: 'Trim Screws', detail: trimBagsS + ' bags (' + trimScrewsS.toLocaleString() + ' screws ÷ 250/bag, 2.5/lf of trim)', check: true });
  } else if (hoverSelectedSystem === 'standing-seam') {
    var gimletPacksP = Math.ceil(trimScrewsS / 250);
    var endLapPacksP = Math.ceil(lfWithWaste / 200);
    lines.push({ label: 'Clip/Trim Screws — Gimlet Head', detail: gimletPacksP + ' bags (' + trimScrewsS.toLocaleString() + ' screws ÷ 250/bag)', check: true });
    lines.push({ label: 'End-Lap Screws', detail: endLapPacksP + ' bags (~1 per 200 lf of coil)', check: true });
    var totalClipsP = Math.ceil(lfWithWaste * 0.75);
    lines.push({ label: 'SS Clips', detail: totalClipsP + ' clips (~0.75/lf of coil, default all fixed)', check: true });
    lines.push({ label: 'Clip Screws', detail: Math.ceil(totalClipsP * 3 / 250) + ' bags (3 screws/clip ÷ 250/bag)', check: true });
  }

  // Sealant & tape
  if (hoverSelectedSystem === 'standing-seam') {
    var butylRolls = Math.ceil(lfWithWaste / 100);
    var caulkTubes = Math.ceil(totalTrimLfS / 62);
    lines.push({ label: 'Butyl Tape', detail: butylRolls + ' rolls (1 per ~100 lf of coil)', check: true });
    lines.push({ label: 'Tube Sealant', detail: caulkTubes + ' tubes (1 per ~62 lf of trim)', check: true });
    // Underlayment
    var synSq = Math.ceil(areaWithWaste * 1.10 / 100);
    var iceWLf = Math.ceil(((d.eavesLF || 0) + (d.valleysLF || 0) * 2) * 1.10);
    lines.push({ label: 'Synthetic Underlayment', detail: synSq + ' squares (' + (areaWithWaste * 1.10).toFixed(0) + ' ft² ÷ 100)', check: true });
    if (iceWLf > 0)
      lines.push({ label: 'Ice & Water Shield', detail: iceWLf + ' lf (eaves + valleys × 2 sides + 10%)', check: true });
    else
      lines.push({ label: 'Ice & Water Shield', detail: 'eaves/valleys only — verify field conditions', check: false, skip: true });
  } else if (hoverSelectedSystem === 'ag-panel') {
    var caulkTubesAg = Math.ceil(totalTrimLfS / 62);
    var butylRollsAg = Math.ceil(totalTrimLfS / 150);
    lines.push({ label: 'Butyl Tape', detail: butylRollsAg + ' rolls (1 per ~150 lf of trim)', check: true });
    lines.push({ label: 'Tube Sealant', detail: caulkTubesAg + ' tubes (1 per ~62 lf of trim)', check: true });
  }

  previewEl.innerHTML = lines.map(function(l) {
    var icon = l.skip ? '⏭' : '✅';
    var cls  = l.skip ? 'text-gray-400' : 'text-gray-700';
    return '<div class="flex gap-3 ' + cls + '">' +
      '<span class="flex-shrink-0">' + icon + '</span>' +
      '<div><span class="font-medium">' + esc(l.label) + '</span>' +
      (l.detail ? ' <span class="text-gray-400">— ' + esc(l.detail) + '</span>' : '') +
      '</div></div>';
  }).join('');
}

// ── Apply hover data and launch configurator ───────────────────
function applyHoverAndBuild() {
  var d = hoverParsedData;
  var wastePct = state.hoverImport.wastePct;
  var wasteFactor = 1 + wastePct / 100;

  closeHoverWizard();

  // Launch configurator for the selected system in complete mode
  selectSystem(hoverSelectedSystem);
  selectMode('complete');

  // Wait for categories to load then apply hover data
  setTimeout(function() {
    applyHoverToChecklist(hoverSelectedSystem, d, wasteFactor);
    state.hoverImport.active = true;
    var banner = document.getElementById('hover-banner');
    if (banner) banner.classList.remove('hidden');
  }, 500);
}

function applyHoverToChecklist(system, d, wasteFactor) {
  if (!state.systemData || !state.systemData.categories) return;

  // Trim waste constants (match updateWastePreview)
  var TRIM_WASTE  = 1.10;
  var RIDGE_MULT  = 2;
  var VALLEY_MULT = 2;
  var SF_WASTE    = 1.25;

  state.systemData.categories.forEach(function(cat) {
    var slug = cat.slug || '';

    if (slug.includes('panel')) {
      if (system === 'ag-panel' && d.facets.length) {
        var groups = {};
        d.facets.forEach(function(f) {
          if (!f.runInches || f.areaFt === 0) return;
          var runFt = f.runInches / 12;
          var count = Math.ceil((f.areaFt / runFt / 3) * wasteFactor);
          groups[f.runInches] = (groups[f.runInches] || 0) + count;
        });
        state.checklist[cat.id].status = 'hover-populated';
        state.checklist[cat.id].hoverData = { type: 'panel-runs', runs: groups };
      } else if (system === 'standing-seam') {
        var areaWithWaste = Math.ceil(d.totalAreaFt * wasteFactor);
        var lfCoil = Math.ceil(areaWithWaste / hoverPanelWidthFt);
        state.checklist[cat.id].status = 'hover-populated';
        state.checklist[cat.id].hoverData = { type: 'panel-area', areaFt: areaWithWaste, lf: lfCoil };
      }
    } else if (slug.includes('ridge')) {
      if (d.ridgesLF > 0) {
        state.checklist[cat.id].status = 'hover-populated';
        state.checklist[cat.id].hoverData = { type: 'linear', lf: Math.ceil(d.ridgesLF * RIDGE_MULT * TRIM_WASTE) };
      }
    } else if (slug.includes('valley')) {
      if (d.valleysLF > 0) {
        state.checklist[cat.id].status = 'hover-populated';
        state.checklist[cat.id].hoverData = { type: 'linear', lf: Math.ceil(d.valleysLF * VALLEY_MULT * TRIM_WASTE) };
      } else {
        state.checklist[cat.id].status = 'hover-skip-suggested';
      }
    } else if (slug.includes('rake') || slug.includes('gable')) {
      if (d.rakesLF > 0) {
        state.checklist[cat.id].status = 'hover-populated';
        state.checklist[cat.id].hoverData = { type: 'linear', lf: Math.ceil(d.rakesLF * TRIM_WASTE) };
      }
    } else if (slug.includes('eave')) {
      if (d.eavesLF > 0) {
        state.checklist[cat.id].status = 'hover-populated';
        state.checklist[cat.id].hoverData = { type: 'linear', lf: Math.ceil(d.eavesLF * TRIM_WASTE) };
      }
    } else if (slug.includes('hip')) {
      if (d.hipsLF > 0) {
        state.checklist[cat.id].status = 'hover-populated';
        state.checklist[cat.id].hoverData = { type: 'linear', lf: Math.ceil(d.hipsLF * RIDGE_MULT * TRIM_WASTE) };
      } else {
        state.checklist[cat.id].status = 'hover-skip-suggested';
      }
    } else if (slug.includes('step') || slug.includes('flashing')) {
      if (d.stepFlashingLF > 0) {
        state.checklist[cat.id].status = 'hover-populated';
        state.checklist[cat.id].hoverData = { type: 'linear', lf: Math.ceil(d.stepFlashingLF * SF_WASTE) };
      }
    } else if (slug.includes('sealant')) {
      var trimTotalSeal = Math.ceil((d.ridgesLF  || 0) * RIDGE_MULT  * TRIM_WASTE)
        + Math.ceil((d.hipsLF    || 0) * RIDGE_MULT  * TRIM_WASTE)
        + Math.ceil((d.valleysLF || 0) * VALLEY_MULT * TRIM_WASTE)
        + Math.ceil((d.rakesLF   || 0) * TRIM_WASTE)
        + Math.ceil((d.eavesLF   || 0) * TRIM_WASTE)
        + Math.ceil((d.stepFlashingLF || 0) * SF_WASTE);
      var caulkTubesCalc = Math.ceil(trimTotalSeal / 62);
      var butylRollsCalc;
      if (system === 'standing-seam') {
        var lfCoilSeal = Math.ceil(Math.ceil(d.totalAreaFt * wasteFactor) / hoverPanelWidthFt);
        butylRollsCalc = Math.ceil(lfCoilSeal / 100);
      } else {
        // AG Panel: butyl at trim junctions — 1 roll per 150 lf of trim
        butylRollsCalc = Math.ceil(trimTotalSeal / 150);
      }
      state.checklist[cat.id].status = 'hover-populated';
      state.checklist[cat.id].hoverData = {
        type: 'sealant',
        butylRolls: butylRollsCalc,
        caulkTubes: caulkTubesCalc
      };
    } else if (slug.includes('underlayment')) {
      if (system === 'standing-seam') {
        var areaFtU   = Math.ceil(d.totalAreaFt * wasteFactor);
        var synSquares = Math.ceil(areaFtU * 1.10 / 100);
        var iceWaterLf = Math.ceil(((d.eavesLF || 0) + (d.valleysLF || 0) * 2) * 1.10);
        state.checklist[cat.id].status = 'hover-populated';
        state.checklist[cat.id].hoverData = {
          type: 'underlayment',
          synSquares: synSquares,
          iceWaterLf: iceWaterLf
        };
      }
    } else if (slug.includes('fastener') && system === 'ag-panel') {
      // AG Panel only — SS fasteners (100-packs by each) don't map to this bag-based calc
      var ridgeLf  = d.ridgesLF  > 0 ? Math.ceil(d.ridgesLF  * RIDGE_MULT  * TRIM_WASTE) : 0;
      var hipLf    = d.hipsLF    > 0 ? Math.ceil(d.hipsLF    * RIDGE_MULT  * TRIM_WASTE) : 0;
      var valleyLf = d.valleysLF > 0 ? Math.ceil(d.valleysLF * VALLEY_MULT * TRIM_WASTE) : 0;
      var rakeLf   = d.rakesLF   > 0 ? Math.ceil(d.rakesLF   * TRIM_WASTE) : 0;
      var eaveLf   = d.eavesLF   > 0 ? Math.ceil(d.eavesLF   * TRIM_WASTE) : 0;
      var sfLf     = d.stepFlashingLF > 0 ? Math.ceil(d.stepFlashingLF * SF_WASTE) : 0;
      var totalTrimLf = ridgeLf + hipLf + valleyLf + rakeLf + eaveLf + sfLf;
      var trimScrews  = Math.ceil(totalTrimLf * 2.5);
      var trimBags    = Math.ceil(trimScrews / 250);
      var areaFtWithWaste  = Math.ceil(d.totalAreaFt * wasteFactor);
      var roofingScrews    = Math.ceil(areaFtWithWaste / 100 * 80);
      var roofingBags      = Math.ceil(roofingScrews / 250);
      state.checklist[cat.id].status = 'hover-populated';
      state.checklist[cat.id].hoverData = {
        type: 'fasteners',
        roofingBags: roofingBags,
        trimBags: trimBags,
        trimScrews: trimScrews,
        roofingScrews: roofingScrews
      };
    } else if (slug === 'ss-clips') {
      var lfCoilClip = Math.ceil(Math.ceil(d.totalAreaFt * wasteFactor) / hoverPanelWidthFt);
      var totalClips = Math.ceil(lfCoilClip * 0.75);
      state.checklist[cat.id].status = 'hover-populated';
      state.checklist[cat.id].hoverData = {
        type: 'clips',
        fixedClips: totalClips,
        floatingClips: 0,
        clipScrewPacks: Math.ceil(totalClips * 3 / 250)
      };
    } else if (slug.includes('fastener') && system === 'standing-seam') {
      var ridgeLfSS  = d.ridgesLF  > 0 ? Math.ceil(d.ridgesLF  * RIDGE_MULT  * TRIM_WASTE) : 0;
      var hipLfSS    = d.hipsLF    > 0 ? Math.ceil(d.hipsLF    * RIDGE_MULT  * TRIM_WASTE) : 0;
      var valleyLfSS = d.valleysLF > 0 ? Math.ceil(d.valleysLF * VALLEY_MULT * TRIM_WASTE) : 0;
      var rakeLfSS   = d.rakesLF   > 0 ? Math.ceil(d.rakesLF   * TRIM_WASTE) : 0;
      var eaveLfSS   = d.eavesLF   > 0 ? Math.ceil(d.eavesLF   * TRIM_WASTE) : 0;
      var sfLfSS     = d.stepFlashingLF > 0 ? Math.ceil(d.stepFlashingLF * SF_WASTE) : 0;
      var totalTrimSS = ridgeLfSS + hipLfSS + valleyLfSS + rakeLfSS + eaveLfSS + sfLfSS;
      var lfCoilFast = Math.ceil(Math.ceil(d.totalAreaFt * wasteFactor) / hoverPanelWidthFt);
      var gimletPacks = Math.ceil(totalTrimSS * 2.5 / 250);
      var endLapPacks = Math.ceil(lfCoilFast / 200);
      state.checklist[cat.id].status = 'hover-populated';
      state.checklist[cat.id].hoverData = {
        type: 'ss-fasteners',
        gimletPacks: gimletPacks,
        endLapPacks: endLapPacks
      };
    }
  });

  // Re-render checklist
  renderChecklist();
}

function confirmHoverSkip(catId) {
  state.checklist[catId].status = 'skipped';
  state.checklist[catId].items = [];
  var cat = state.systemData.categories.find(function(c) { return c.id === catId; });
  if (!cat) return;
  var hdr = document.querySelector('[onclick="toggleCard(\'' + catId + '\')"]');
  if (hdr) hdr.outerHTML = buildCardHeaderHTML(cat);
}

function dismissHoverBanner() {
  var banner = document.getElementById('hover-banner');
  if (banner) banner.classList.add('hidden');
}

// Call initPdfJs after page loads
document.addEventListener('DOMContentLoaded', initPdfJs);
