/* Dinio Lending — core business logic */

// ---------- business config (mutated by App via tweaks) ----------
export const CONFIG = {
  closePct: 0.02,
  trailPct: 0.005,
  followDays: 3,
  idPrefix: 'DIN',
}

// ---------- status model ----------
export function defaultStatuses() {
  return [
    { id: 'lead',         label: 'Lead Logged',     role: null },
    { id: 'docs',         label: 'Collecting Docs', role: null },
    { id: 'ready',        label: 'Ready to Submit', role: null },
    { id: 'submitted',    label: 'Submitted',       role: null },
    { id: 'underwriting', label: 'In Underwriting', role: null },
    { id: 'decision',     label: 'Decision',        role: null },
    { id: 'closed',       label: 'Closed',          role: 'closed' },
    { id: 'dead',         label: 'Dead',            role: 'dead' },
  ]
}

let _statuses = defaultStatuses()
export function statuses() { return _statuses }
export function setStatuses(arr) { if (Array.isArray(arr) && arr.length) _statuses = arr }

export function orderedStatuses() {
  const prog   = _statuses.filter(s => !s.role)
  const closed = _statuses.filter(s => s.role === 'closed')
  const dead   = _statuses.filter(s => s.role === 'dead')
  return [...prog, ...closed, ...dead]
}

export function toneFor(role) {
  return role === 'closed' ? 'closed' : role === 'dead' ? 'dead' : 'progress'
}

export function statusInfo(id) {
  const prog = _statuses.filter(s => !s.role)
  const s = _statuses.find(x => x.id === id)
  if (!s) return { id, label: 'Unassigned', code: '?', tone: 'plain', role: null }
  let code
  if (s.role === 'dead')   code = 'X'
  else if (s.role === 'closed') code = String(prog.length + 1)
  else code = String(prog.indexOf(s) + 1)
  return { id: s.id, label: s.label, code, tone: toneFor(s.role), role: s.role || null }
}

export const statusOf = statusInfo

export function isClosed(l) {
  const s = _statuses.find(x => x.id === l.status)
  return !!(s && s.role === 'closed')
}
export function isDead(l) {
  const s = _statuses.find(x => x.id === l.status)
  return !!(s && s.role === 'dead')
}
export function firstProgressId() {
  const p = _statuses.find(s => !s.role)
  return p ? p.id : (_statuses[0] && _statuses[0].id)
}
export function newStatusId() {
  return 'stage_' + Math.random().toString(36).slice(2, 8)
}
export function normalizeStatuses(arr) {
  const prog   = arr.filter(s => !s.role)
  const closed = arr.filter(s => s.role === 'closed')
  const dead   = arr.filter(s => s.role === 'dead')
  return [...prog, ...closed, ...dead]
}
export function codeIn(arr, s) {
  if (s.role === 'dead') return 'X'
  const prog = arr.filter(x => !x.role)
  if (s.role === 'closed') return String(prog.length + 1)
  return String(prog.indexOf(s) + 1)
}

export const DECISIONS = ['Pending', 'Approved', 'Conditional', 'Denied']
export const DOCS = ['Pending', 'No', 'Yes']

// ---------- date helpers ----------
export function parseDate(s) {
  if (!s) return null
  const d = new Date(s + 'T00:00:00')
  return isNaN(d) ? null : d
}
export function today() { return new Date() }
export function fmtDate(s) {
  const d = parseDate(s)
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export function monthsBetween(fromStr, to) {
  const d = parseDate(fromStr)
  if (!d) return 0
  const t = to || today()
  const m = (t.getFullYear() - d.getFullYear()) * 12 + (t.getMonth() - d.getMonth())
  return Math.max(0, m)
}
export function businessDaysSince(fromStr) {
  const d = parseDate(fromStr)
  if (!d) return null
  const s = new Date(d), e = today()
  s.setHours(0, 0, 0, 0); e.setHours(0, 0, 0, 0)
  let n = 0
  while (s < e) {
    s.setDate(s.getDate() + 1)
    const w = s.getDay()
    if (w !== 0 && w !== 6) n++
  }
  return n
}
export function monthKey(date) {
  const d = date || today()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}
export function monthLabel(key) {
  const p = key.split('-')
  const d = new Date(+p[0], +p[1] - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
export function shiftMonth(key, delta) {
  const p = key.split('-')
  const d = new Date(+p[0], +p[1] - 1 + delta, 1)
  return monthKey(d)
}

// ---------- money ----------
export function money(n, cents) {
  if (n == null || isNaN(n)) return '—'
  return '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })
}
export function shortMoney(n) {
  if (n == null || isNaN(n)) return '—'
  if (Math.abs(n) >= 1000000) return '$' + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (Math.abs(n) >= 1000)    return '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return '$' + n
}

// ---------- commission calcs ----------
export function closingComm(l)  { return isClosed(l) ? (l.amount || 0) * CONFIG.closePct : 0 }
export function monthlyTrail(l) { return isClosed(l) ? (l.amount || 0) * CONFIG.trailPct : 0 }
export function monthsActive(l) { return isClosed(l) && l.close ? monthsBetween(l.close) : 0 }
export function trailToDate(l)  { return monthlyTrail(l) * monthsActive(l) }
export function trailActiveIn(l, key) {
  if (!isClosed(l) || !l.close) return false
  return monthKey(parseDate(l.close)) <= key && key <= monthKey(today())
}
export function needsFollowUp(l) {
  if (isClosed(l) || isDead(l)) return false
  const b = businessDaysSince(l.follow)
  return b != null && b > CONFIG.followDays
}

// ---------- columns ----------
export function defaultColumns() {
  return [
    { key: 'received',  name: 'Date Received',        on: true  },
    { key: 'phone',     name: 'Phone',                on: true  },
    { key: 'seller',    name: 'RIMCO Seller',         on: true  },
    { key: 'model',     name: 'Generator Model',      on: true  },
    { key: 'intake',    name: 'Intake Started',       on: false },
    { key: 'docs',      name: 'Docs Complete?',       on: true  },
    { key: 'submitted', name: 'Submitted to TuCoop',  on: true  },
    { key: 'contact',   name: 'TuCoop Contact',       on: false },
    { key: 'decision',  name: 'Decision',             on: true  },
    { key: 'follow',    name: 'Last Follow-up',       on: true  },
    { key: 'notes',     name: 'Notes',                on: false },
  ]
}

export const COLUMN_META = {
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
  notes:     { type: 'textarea' },
}

// ---------- seed data ----------
export function seedLoans() {
  return [
    { id: 'DIN-001', received: '2026-02-02', name: 'Maria Santos',    phone: '787-555-0142', seller: 'RIMCO — Bayamón',  model: 'Cat DE65 GC',  amount: 48000,  intake: '2026-02-04', docs: 'Yes',     submitted: '2026-02-18', contact: '', status: 'closed',       decision: 'Approved', close: '2026-03-15', follow: '2026-03-20', notes: 'Funded. Trail active.' },
    { id: 'DIN-002', received: '2026-04-10', name: 'James Whitfield', phone: '787-555-0199', seller: 'RIMCO — Ponce',    model: 'Cat DE150 GC', amount: 112500, intake: '2026-04-12', docs: 'Yes',     submitted: '2026-05-02', contact: '', status: 'underwriting', decision: 'Pending',  close: '',           follow: '2026-06-04', notes: 'In underwriting — awaiting conditions.' },
    { id: 'DIN-003', received: '2026-05-22', name: 'Lena Park',       phone: '787-555-0177', seller: 'RIMCO — Carolina', model: 'Cat DE40 GC',  amount: 36800,  intake: '2026-05-24', docs: 'Pending', submitted: '',           contact: '', status: 'docs',         decision: 'Pending',  close: '',           follow: '2026-06-05', notes: 'Collecting income docs.' },
    { id: 'DIN-004', received: '2026-04-28', name: 'Roberto Cruz',    phone: '787-555-0123', seller: 'RIMCO — Bayamón',  model: 'Cat DE110 GC', amount: 89200,  intake: '2026-05-01', docs: 'Yes',     submitted: '2026-05-20', contact: '', status: 'submitted',    decision: 'Pending',  close: '',           follow: '2026-05-26', notes: 'Submitted — needs a nudge.' },
    { id: 'DIN-005', received: '2025-12-08', name: 'Aisha Bello',     phone: '787-555-0188', seller: 'RIMCO — Ponce',    model: 'Cat DE80 GC',  amount: 65000,  intake: '2025-12-10', docs: 'Yes',     submitted: '2025-12-22', contact: '', status: 'closed',       decision: 'Approved', close: '2026-01-10', follow: '2026-01-15', notes: 'Funded. Trail active.' },
  ]
}

export function nextId(loans) {
  let max = 0
  loans.forEach(l => {
    const m = /(\d+)$/.exec(l.id || '')
    if (m) max = Math.max(max, +m[1])
  })
  return CONFIG.idPrefix + '-' + String(max + 1).padStart(3, '0')
}

export function blankLoan(loans) {
  return {
    id: nextId(loans), received: '', name: '', phone: '', seller: '', model: '',
    amount: '', intake: '', docs: 'Pending', submitted: '', contact: '',
    status: firstProgressId(), decision: 'Pending', close: '', follow: '', notes: '',
  }
}
