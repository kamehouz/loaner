/* Dinio Lending — Pipeline Tracker · core logic (no JSX) */
(function () {
  'use strict';

  // ---------- business config (overridable via Tweaks) ----------
  var CONFIG = {
    closePct: 0.02,      // 2% at closing
    trailPct: 0.005,     // 0.5% monthly trail
    followDays: 3,       // business days before a loan is "stale"
    idPrefix: 'DIN'
  };

  // ---------- status model (id-based; editable) ----------
  // role drives commission/alert logic: 'closed' & 'dead' are locked roles.
  // intermediate stages (role null) are fully editable / add / remove / reorder.
  function defaultStatuses() {
    return [
      { id: 'lead',         label: 'Lead Logged',     role: null },
      { id: 'docs',         label: 'Collecting Docs', role: null },
      { id: 'ready',        label: 'Ready to Submit', role: null },
      { id: 'submitted',    label: 'Submitted',       role: null },
      { id: 'underwriting', label: 'In Underwriting', role: null },
      { id: 'decision',     label: 'Decision',        role: null },
      { id: 'closed',       label: 'Closed',          role: 'closed' },
      { id: 'dead',         label: 'Dead',            role: 'dead' }
    ];
  }
  var _statuses = defaultStatuses();
  function statuses() { return _statuses; }
  function setStatuses(arr) { if (Array.isArray(arr) && arr.length) _statuses = arr; }
  // progress (role null), then closed, then dead — canonical display order
  function orderedStatuses() {
    var prog = _statuses.filter(function (s) { return !s.role; });
    var closed = _statuses.filter(function (s) { return s.role === 'closed'; });
    var dead = _statuses.filter(function (s) { return s.role === 'dead'; });
    return prog.concat(closed, dead);
  }
  function toneFor(role) { return role === 'closed' ? 'closed' : role === 'dead' ? 'dead' : 'progress'; }
  // resolve a stored status id -> {id,label,code,tone,role}; code is computed from position
  function statusInfo(id) {
    var prog = _statuses.filter(function (s) { return !s.role; });
    var s = _statuses.find(function (x) { return x.id === id; });
    if (!s) return { id: id, label: 'Unassigned', code: '?', tone: 'plain', role: null };
    var code;
    if (s.role === 'dead') code = 'X';
    else if (s.role === 'closed') code = String(prog.length + 1);
    else code = String(prog.indexOf(s) + 1);
    return { id: s.id, label: s.label, code: code, tone: toneFor(s.role), role: s.role || null };
  }
  function statusOf(id) { return statusInfo(id); }
  function isClosed(l) { var s = _statuses.find(function (x) { return x.id === l.status; }); return !!(s && s.role === 'closed'); }
  function isDead(l) { var s = _statuses.find(function (x) { return x.id === l.status; }); return !!(s && s.role === 'dead'); }
  function firstProgressId() { var p = _statuses.find(function (s) { return !s.role; }); return p ? p.id : (_statuses[0] && _statuses[0].id); }
  function newStatusId() { return 'stage_' + Math.random().toString(36).slice(2, 8); }
  // pure: return arr re-ordered as progress..., closed, dead (for display & storage)
  function normalizeStatuses(arr) {
    var prog = arr.filter(function (s) { return !s.role; });
    var closed = arr.filter(function (s) { return s.role === 'closed'; });
    var dead = arr.filter(function (s) { return s.role === 'dead'; });
    return prog.concat(closed, dead);
  }
  // pure: compute display code for a status given its array
  function codeIn(arr, s) {
    if (s.role === 'dead') return 'X';
    var prog = arr.filter(function (x) { return !x.role; });
    if (s.role === 'closed') return String(prog.length + 1);
    return String(prog.indexOf(s) + 1);
  }

  var DECISIONS = ['Pending', 'Approved', 'Conditional', 'Denied'];
  var DOCS = ['Pending', 'No', 'Yes'];

  // ---------- date helpers ----------
  function parseDate(s) { if (!s) return null; var d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d; }
  function today() { return new Date(); }
  function fmtDate(s) {
    var d = parseDate(s); if (!d) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function monthsBetween(fromStr, to) {
    var d = parseDate(fromStr); if (!d) return 0;
    var t = to || today();
    var m = (t.getFullYear() - d.getFullYear()) * 12 + (t.getMonth() - d.getMonth());
    if (t.getDate() < d.getDate()) m -= 0; // count started months inclusively
    return Math.max(0, m);
  }
  function businessDaysSince(fromStr) {
    var d = parseDate(fromStr); if (!d) return null;
    var s = new Date(d), e = today(), n = 0;
    s.setHours(0,0,0,0); e.setHours(0,0,0,0);
    while (s < e) { s.setDate(s.getDate() + 1); var w = s.getDay(); if (w !== 0 && w !== 6) n++; }
    return n;
  }
  function monthKey(date) { var d = date || today(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function monthLabel(key) {
    var p = key.split('-'); var d = new Date(+p[0], +p[1] - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  function shiftMonth(key, delta) {
    var p = key.split('-'); var d = new Date(+p[0], +p[1] - 1 + delta, 1); return monthKey(d);
  }

  // ---------- money ----------
  function money(n, cents) {
    if (n == null || isNaN(n)) return '—';
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  }
  function shortMoney(n) {
    if (n == null || isNaN(n)) return '—';
    if (Math.abs(n) >= 1000000) return '$' + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return '$' + n;
  }

  // ---------- commission calcs ----------
  function closingComm(l) { return isClosed(l) ? (l.amount || 0) * CONFIG.closePct : 0; }
  function monthlyTrail(l) { return isClosed(l) ? (l.amount || 0) * CONFIG.trailPct : 0; }
  function monthsActive(l) { return isClosed(l) && l.close ? monthsBetween(l.close) : 0; }
  function trailToDate(l) { return monthlyTrail(l) * monthsActive(l); }
  // is the trail active in a given month key? (closed and close-month <= key)
  function trailActiveIn(l, key) {
    if (!isClosed(l) || !l.close) return false;
    return monthKey(parseDate(l.close)) <= key && key <= monthKey(today());
  }
  function needsFollowUp(l) {
    if (isClosed(l) || isDead(l)) return false;
    var b = businessDaysSince(l.follow);
    return b != null && b > CONFIG.followDays;
  }

  // ---------- columns ----------
  // locked core columns are rendered always; these are the optional, configurable ones
  function defaultColumns() {
    return [
      { key: 'received',  name: 'Date Received',       on: true  },
      { key: 'phone',     name: 'Phone',               on: true  },
      { key: 'seller',    name: 'RIMCO Seller',        on: true  },
      { key: 'model',     name: 'Generator Model',     on: true  },
      { key: 'intake',    name: 'Intake Started',      on: false },
      { key: 'docs',      name: 'Docs Complete?',      on: true  },
      { key: 'submitted', name: 'Submitted to TuCoop', on: true  },
      { key: 'contact',   name: 'TuCoop Contact',      on: false },
      { key: 'decision',  name: 'Decision',            on: true  },
      { key: 'follow',    name: 'Last Follow-up',      on: true  },
      { key: 'notes',     name: 'Notes',               on: false }
    ];
  }
  var COLUMN_META = {
    received:  { type: 'date' },
    phone:     { type: 'text' },
    seller:    { type: 'text' },
    model:     { type: 'text' },
    intake:    { type: 'date' },
    docs:      { type: 'select', options: DOCS },
    submitted: { type: 'date' },
    contact:   { type: 'text', placeholder: 'TBD — confirm with TuCoop' },
    decision:  { type: 'select', options: DECISIONS },
    follow:    { type: 'date' },
    notes:     { type: 'textarea' }
  };

  // ---------- seed data ----------
  function seedLoans() {
    return [
      { id:'DIN-001', received:'2026-02-02', name:'Maria Santos',    phone:'787-555-0142', seller:'RIMCO — Bayamón',  model:'Cat DE65 GC',  amount:48000,  intake:'2026-02-04', docs:'Yes',     submitted:'2026-02-18', contact:'', status:'closed',       decision:'Approved', close:'2026-03-15', follow:'2026-03-20', notes:'Funded. Trail active.' },
      { id:'DIN-002', received:'2026-04-10', name:'James Whitfield', phone:'787-555-0199', seller:'RIMCO — Ponce',    model:'Cat DE150 GC', amount:112500, intake:'2026-04-12', docs:'Yes',     submitted:'2026-05-02', contact:'', status:'underwriting', decision:'Pending',  close:'',           follow:'2026-06-04', notes:'In underwriting — awaiting conditions.' },
      { id:'DIN-003', received:'2026-05-22', name:'Lena Park',       phone:'787-555-0177', seller:'RIMCO — Carolina', model:'Cat DE40 GC',  amount:36800,  intake:'2026-05-24', docs:'Pending', submitted:'',           contact:'', status:'docs',         decision:'Pending',  close:'',           follow:'2026-06-05', notes:'Collecting income docs.' },
      { id:'DIN-004', received:'2026-04-28', name:'Roberto Cruz',    phone:'787-555-0123', seller:'RIMCO — Bayamón',  model:'Cat DE110 GC', amount:89200,  intake:'2026-05-01', docs:'Yes',     submitted:'2026-05-20', contact:'', status:'submitted',    decision:'Pending',  close:'',           follow:'2026-05-26', notes:'Submitted — needs a nudge.' },
      { id:'DIN-005', received:'2025-12-08', name:'Aisha Bello',     phone:'787-555-0188', seller:'RIMCO — Ponce',    model:'Cat DE80 GC',  amount:65000,  intake:'2025-12-10', docs:'Yes',     submitted:'2025-12-22', contact:'', status:'closed',       decision:'Approved', close:'2026-01-10', follow:'2026-01-15', notes:'Funded. Trail active.' }
    ];
  }

  function nextId(loans) {
    var max = 0;
    loans.forEach(function (l) { var m = /(\d+)$/.exec(l.id || ''); if (m) max = Math.max(max, +m[1]); });
    return CONFIG.idPrefix + '-' + String(max + 1).padStart(3, '0');
  }
  function blankLoan(loans) {
    return { id: nextId(loans), received:'', name:'', phone:'', seller:'', model:'', amount:'', intake:'',
      docs:'Pending', submitted:'', contact:'', status: firstProgressId(), decision:'Pending', close:'', follow:'', notes:'' };
  }

  // ---------- storage ----------
  var K = { loans:'dinio_loans_v1', cols:'dinio_cols_v1', trail:'dinio_trail_v1', cfg:'dinio_cfg_v1', statuses:'dinio_statuses_v1' };
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  window.Core = {
    CONFIG: CONFIG, DECISIONS: DECISIONS, DOCS: DOCS, COLUMN_META: COLUMN_META, K: K,
    statusOf: statusOf, statusInfo: statusInfo, statuses: statuses, setStatuses: setStatuses,
    orderedStatuses: orderedStatuses, defaultStatuses: defaultStatuses, firstProgressId: firstProgressId, newStatusId: newStatusId, toneFor: toneFor, normalizeStatuses: normalizeStatuses, codeIn: codeIn,
    isClosed: isClosed, isDead: isDead,
    fmtDate: fmtDate, monthsBetween: monthsBetween, businessDaysSince: businessDaysSince,
    monthKey: monthKey, monthLabel: monthLabel, shiftMonth: shiftMonth, today: today, parseDate: parseDate,
    money: money, shortMoney: shortMoney,
    closingComm: closingComm, monthlyTrail: monthlyTrail, monthsActive: monthsActive, trailToDate: trailToDate,
    trailActiveIn: trailActiveIn, needsFollowUp: needsFollowUp,
    defaultColumns: defaultColumns, seedLoans: seedLoans, nextId: nextId, blankLoan: blankLoan,
    load: load, save: save
  };
})();
