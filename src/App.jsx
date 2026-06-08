import { useState, useEffect, useCallback } from 'react'
import { supabase, missingConfig } from './supabase.js'
import * as Core from './core.js'
import { Icon } from './components/Icons.jsx'
import { ConfirmDialog } from './components/Shared.jsx'
import { Dashboard } from './components/Dashboard.jsx'
import { LoanDatabase } from './components/LoanDatabase.jsx'
import { LoanForm, ColumnsDrawer } from './components/LoanForm.jsx'
import { TweaksPanel, TweakSection, TweakSlider, TweakColor, useTweaks } from './components/TweaksPanel.jsx'

const TWEAK_DEFAULTS = {
  accent: '#c96f43',
  closePct: 2,
  trailPct: 0.5,
  followDays: 3,
}

function hexToRgb(h) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 201, g: 111, b: 67 }
}
function shade(h, amt) {
  const c = hexToRgb(h)
  const f = v => Math.max(0, Math.min(255, Math.round(v + amt * 2.55)))
  return '#' + [f(c.r), f(c.g), f(c.b)].map(x => x.toString(16).padStart(2, '0')).join('')
}
function tint(h, frac) {
  const c = hexToRgb(h)
  const f = v => Math.round(v + (255 - v) * frac)
  return '#' + [f(c.r), f(c.g), f(c.b)].map(x => x.toString(16).padStart(2, '0')).join('')
}

export default function App() {
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [loans, setLoans]       = useState([])
  const [columns, setColumnsRaw]  = useState(Core.defaultColumns())
  const [statuses, setStatusesRaw] = useState(Core.defaultStatuses())
  const [confirm, setConfirmRaw]  = useState({})
  const [t, setTweak]           = useTweaks(TWEAK_DEFAULTS)

  const [view, setView]         = useState(() => {
    try { return localStorage.getItem('dinio_view') || 'dashboard' } catch { return 'dashboard' }
  })
  const [editing, setEditing]   = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [manage, setManage]     = useState(false)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')

  // apply tweaks synchronously so calcs reflect this render
  Core.CONFIG.closePct   = t.closePct / 100
  Core.CONFIG.trailPct   = t.trailPct / 100
  Core.CONFIG.followDays = t.followDays
  Core.setStatuses(statuses)

  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--accent', t.accent)
    root.setProperty('--accent-deep', shade(t.accent, -16))
    root.setProperty('--accent-soft', tint(t.accent, 0.86))
  }, [t.accent])

  useEffect(() => {
    try { localStorage.setItem('dinio_view', view) } catch {}
  }, [view])

  // ── helpers that save to Supabase then update local state ──────────────────
  const setColumns = useCallback(async (cols) => {
    setColumnsRaw(cols)
    await supabase.from('app_config').upsert({ key: 'columns', value: cols })
  }, [])

  const setStatuses = useCallback(async (sts) => {
    setStatusesRaw(sts)
    await supabase.from('app_config').upsert({ key: 'statuses', value: sts })
  }, [])

  const setConfirm = useCallback(async (conf) => {
    setConfirmRaw(conf)
    await supabase.from('app_config').upsert({ key: 'trail', value: conf })
  }, [])

  // ── initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [loansRes, configRes] = await Promise.all([
          supabase.from('loans').select('*').order('created_at', { ascending: true }),
          supabase.from('app_config').select('*'),
        ])

        if (loansRes.error) throw loansRes.error
        if (configRes.error) throw configRes.error

        let initialLoans = loansRes.data || []

        // First run — seed sample data
        if (initialLoans.length === 0) {
          const seed = Core.seedLoans()
          const { error: seedErr } = await supabase.from('loans').insert(seed)
          if (!seedErr) initialLoans = seed
        }
        setLoans(initialLoans)

        const config = configRes.data || []
        const get = (k, def) => { const r = config.find(x => x.key === k); return r ? r.value : def }

        const initCols = get('columns', Core.defaultColumns())
        const initSts  = get('statuses', Core.defaultStatuses())
        const initTrail = get('trail', {})

        setColumnsRaw(initCols)
        setStatusesRaw(initSts)
        setConfirmRaw(initTrail)
        Core.setStatuses(initSts)

        // Initialise config rows if first run
        if (!config.find(r => r.key === 'columns')) {
          await supabase.from('app_config').insert([
            { key: 'columns',  value: initCols },
            { key: 'statuses', value: initSts  },
            { key: 'trail',    value: initTrail },
          ])
        }
      } catch (err) {
        console.error('Failed to load data:', err)
        setError(err.message || 'Failed to connect to database.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── real-time subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel('dinio-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, payload => {
        if (payload.eventType === 'INSERT') {
          setLoans(prev => prev.some(l => l.id === payload.new.id) ? prev : [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setLoans(prev => prev.map(l => l.id === payload.new.id ? payload.new : l))
        } else if (payload.eventType === 'DELETE') {
          setLoans(prev => prev.filter(l => l.id !== payload.old.id))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, payload => {
        if (!payload.new) return
        const { key, value } = payload.new
        if (key === 'columns')  { setColumnsRaw(value) }
        if (key === 'statuses') { setStatusesRaw(value); Core.setStatuses(value) }
        if (key === 'trail')    { setConfirmRaw(value) }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, []) // setters are stable

  // ── reconcile orphaned statuses ────────────────────────────────────────────
  useEffect(() => {
    const ids = new Set(statuses.map(s => s.id))
    const fallback = Core.firstProgressId()
    let changed = false
    const fixed = loans.map(l => {
      if (!ids.has(l.status)) { changed = true; return { ...l, status: fallback } }
      return l
    })
    if (changed) {
      fixed.forEach(l => {
        const orig = loans.find(x => x.id === l.id)
        if (orig && orig.status !== l.status) {
          supabase.from('loans').update({ status: l.status }).eq('id', l.id)
        }
      })
      setLoans(fixed)
    }
  }, [statuses]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── CRUD operations ────────────────────────────────────────────────────────
  const openLoan = (loan, del) => {
    if (del) setDeleting(loan)
    else setEditing({ loan, isNew: false })
  }
  const addLoan = () => setEditing({ loan: Core.blankLoan(loans), isNew: true })

  const saveLoan = async (form) => {
    const exists = loans.some(l => l.id === form.id)
    // Optimistic update
    setLoans(prev => exists ? prev.map(l => l.id === form.id ? form : l) : [...prev, form])
    setEditing(null)
    // Persist (real-time will reconcile other clients)
    if (exists) {
      await supabase.from('loans').update(form).eq('id', form.id)
    } else {
      await supabase.from('loans').insert(form)
    }
  }

  const doDelete = async (loan) => {
    setLoans(prev => prev.filter(l => l.id !== loan.id))
    setDeleting(null)
    setEditing(null)
    await supabase.from('loans').delete().eq('id', loan.id)
  }

  const todayStr = Core.today().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  if (missingConfig) {
    return (
      <div className="error-screen">
        <h2>Setup required</h2>
        <p>This app needs two Supabase environment variables to connect to the database.</p>
        <p>In your <strong>Vercel project → Settings → Environment Variables</strong>, add:</p>
        <p><code>VITE_SUPABASE_URL</code> — your Supabase project URL</p>
        <p><code>VITE_SUPABASE_ANON_KEY</code> — your Supabase anon/public key</p>
        <p>Then go to <strong>Vercel → Deployments → Redeploy</strong> to pick up the new variables.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div className="msg">Connecting to database…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Connection error</h2>
        <p>{error}</p>
        <p>Make sure your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> environment variables are set correctly in Vercel.</p>
      </div>
    )
  }

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <div className="mark">D</div>
          <div>
            <div className="name">Dinio <b>Lending</b></div>
          </div>
          <span className="partner">TuCoop Referral Pipeline</span>
        </div>
        <div className="tabs">
          <button className={'tab' + (view === 'dashboard' ? ' active' : '')} onClick={() => setView('dashboard')}>
            <Icon name="grid" size={16} /><span>Dashboard</span>
          </button>
          <button className={'tab' + (view === 'database' ? ' active' : '')} onClick={() => setView('database')}>
            <Icon name="table" size={16} /><span>Loan Database</span>
          </button>
        </div>
        <span className="spacer" />
        <div className="today">as of<b>{todayStr}</b></div>
      </div>

      <div className="app">
        <div className="page-head">
          <div>
            <h1>{view === 'dashboard' ? 'Pipeline Dashboard' : 'Loan Database'}</h1>
            <div className="sub">
              {view === 'dashboard'
                ? "Live health of the TuCoop referral pipeline and CAT's earned commissions."
                : 'Every referral and its full record. Click any row to edit; manage which columns you track.'}
            </div>
          </div>
        </div>

        {view === 'dashboard'
          ? <Dashboard loans={loans} confirm={confirm} setConfirm={setConfirm} onOpen={openLoan} />
          : <LoanDatabase
              loans={loans} columns={columns} onOpen={openLoan} onAdd={addLoan}
              onManage={tab => setManage(tab || 'columns')}
              search={search} setSearch={setSearch} filter={filter} setFilter={setFilter}
            />
        }
      </div>

      {editing && (
        <LoanForm
          loan={editing.loan} isNew={editing.isNew} columns={columns}
          onSave={saveLoan} onDelete={l => setDeleting(l)} onClose={() => setEditing(null)}
          onManageStatuses={() => setManage('statuses')}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this loan?"
          body={`"${deleting.name || deleting.id}" will be permanently removed. This can't be undone.`}
          onConfirm={() => doDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
      {manage && (
        <ColumnsDrawer
          columns={columns} setColumns={setColumns}
          statuses={statuses} setStatuses={setStatuses}
          onClose={() => setManage(false)}
          initialTab={manage === 'statuses' ? 'statuses' : 'columns'}
        />
      )}

      <TweaksPanel>
        <TweakSection label="Brand" />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={['#c96f43', '#4f7ba6', '#4d8a5b', '#9a6a4f', '#7a5aa6']}
          onChange={v => setTweak('accent', v)}
        />
        <TweakSection label="Commission model" />
        <TweakSlider label="Closing commission" value={t.closePct} min={0.5} max={5} step={0.25} unit="%"
          onChange={v => setTweak('closePct', v)} />
        <TweakSlider label="Monthly trail" value={t.trailPct} min={0.1} max={2} step={0.1} unit="%"
          onChange={v => setTweak('trailPct', v)} />
        <TweakSection label="Workflow" />
        <TweakSlider label="Follow-up threshold" value={t.followDays} min={1} max={10} step={1} unit=" biz days"
          onChange={v => setTweak('followDays', v)} />
      </TweaksPanel>
    </>
  )
}
