import { useState, useEffect } from 'react'
import { Icon } from './Icons.jsx'
import * as Core from '../core.js'

const ALL_FIELDS = [
  { key: 'received',  label: 'Date Lead Received',    type: 'date' },
  { key: 'name',      label: 'Customer Name',         type: 'text',     core: true, required: true },
  { key: 'phone',     label: 'Phone',                 type: 'text' },
  { key: 'seller',    label: 'RIMCO Seller',          type: 'text' },
  { key: 'model',     label: 'Generator Model',       type: 'text' },
  { key: 'amount',          label: 'Loan Amount',          type: 'money',  core: true, required: true },
  { key: 'interest_rate',   label: 'Interest Rate (%)',   type: 'number', core: true, placeholder: 'e.g. 10.5', step: '0.25' },
  { key: 'loan_term_months',label: 'Loan Term (months)',  type: 'number', core: true, placeholder: 'e.g. 60',   step: '1' },
  { key: 'intake',    label: 'Intake Started',        type: 'date' },
  { key: 'docs',      label: 'Docs Complete?',        type: 'select',   options: Core.DOCS },
  { key: 'submitted', label: 'Submitted to TuCoop',   type: 'date' },
  { key: 'contact',   label: 'TuCoop Contact',        type: 'text',     placeholder: 'TBD — confirm with TuCoop' },
  { key: 'status',    label: 'Status',                type: 'status',   core: true, required: true },
  { key: 'decision',  label: 'Decision',              type: 'select',   options: Core.DECISIONS },
  { key: 'close',     label: 'Close / Loan-end Date', type: 'date',     core: true },
  { key: 'follow',    label: 'Last Follow-up',        type: 'date' },
  { key: 'notes',     label: 'Notes',                 type: 'textarea' },
]

function Field({ f, value, onChange, error, columnName, onManageStatuses }) {
  const label = columnName || f.label
  const locked = f.core
  const common = {
    className: 'inp' + (error ? ' err' : ''),
    value: value || '',
    onChange: e => onChange(f.key, e.target.value),
  }
  let control
  if (f.type === 'textarea') {
    control = <textarea className={'area' + (error ? ' err' : '')} value={value || ''} onChange={e => onChange(f.key, e.target.value)} />
  } else if (f.type === 'date') {
    control = <input type="date" {...common} />
  } else if (f.type === 'money') {
    control = <input type="number" min="0" step="1000" placeholder="0" {...common} />
  } else if (f.type === 'select') {
    control = (
      <select className="sel" value={value || f.options[0]} onChange={e => onChange(f.key, e.target.value)}>
        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  } else if (f.type === 'status') {
    control = (
      <select className="sel" value={value} onChange={e => onChange(f.key, e.target.value)}>
        {Core.orderedStatuses().map(s => {
          const i = Core.statusInfo(s.id)
          return <option key={s.id} value={s.id}>{i.code} · {i.label}</option>
        })}
      </select>
    )
  } else if (f.type === 'number') {
    control = <input type="number" min="0" step={f.step || '1'} placeholder={f.placeholder || '0'} {...common} />
  } else {
    control = <input type="text" placeholder={f.placeholder || ''} {...common} />
  }

  return (
    <div className={'fld' + (f.type === 'textarea' ? ' full' : '') + (locked ? ' locked' : '')}>
      <label>
        {label}
        {f.required && <span className="req">★</span>}
        {!f.required && !f.core && <span className="tag">· optional</span>}
        {f.key === 'close' && <span className="tag">· required when Closed</span>}
        {f.type === 'status' && onManageStatuses && (
          <button type="button" className="edit-statuses" onClick={onManageStatuses}>
            <Icon name="cog" size={12} />Edit statuses
          </button>
        )}
      </label>
      {control}
      {error && <span className="err-msg">{error}</span>}
    </div>
  )
}

export function LoanForm({ loan, isNew, columns, onSave, onDelete, onClose, onManageStatuses }) {
  const [form, setForm] = useState({ ...loan })
  const [errs, setErrs] = useState({})

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errs[k]) setErrs(p => ({ ...p, [k]: null }))
  }

  const presentKeys = new Set(columns.map(c => c.key))
  const colName = k => { const c = columns.find(x => x.key === k); return c ? c.name : null }
  const visibleFields = ALL_FIELDS.filter(f => f.core || presentKeys.has(f.key))

  const validate = () => {
    const e = {}
    if (!form.name || !form.name.trim()) e.name = 'Customer name is required'
    if (form.amount === '' || form.amount == null || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      e.amount = 'Enter a loan amount'
    }
    if (Core.statusInfo(form.status).role === 'closed' && !form.close) {
      e.close = 'Close date is required for a closed loan'
    }
    setErrs(e)
    return Object.keys(e).length === 0
  }

  const save = () => {
    if (validate()) onSave({ ...form, amount: Number(form.amount) || 0 })
  }

  const amt = Number(form.amount) || 0
  const willClose = Core.statusInfo(form.status).role === 'closed'

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="ttl">
            <h2>{isNew ? 'Add new loan' : 'Edit loan'}</h2>
            <span className="id">{form.id}</span>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            {visibleFields.map(f => (
              <Field
                key={f.key} f={f} value={form[f.key]} onChange={set}
                error={errs[f.key]} columnName={colName(f.key)}
                onManageStatuses={onManageStatuses}
              />
            ))}
            <div className="calc-box">
              <div className="ck">
                <span className="k">2% commission</span>
                <span className="v money">{willClose ? Core.money(amt * Core.CONFIG.closePct) : '—'}</span>
              </div>
              <div className="ck">
                <span className="k">Trail — month 1</span>
                <span className="v money">{willClose ? Core.money(amt * Core.CONFIG.trailPct / 12, true) : '—'}</span>
              </div>
              <div className="note">
                Trail is on declining balance — reduces each month as the loan pays down.{' '}
                {willClose ? 'Set interest rate and term above for precise figures.' : 'Shown once status is Closed.'}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          {!isNew && (
            <button className="btn danger grow" onClick={() => onDelete(form)}>
              <Icon name="trash" size={15} />Delete
            </button>
          )}
          {isNew && <span className="grow" />}
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>
            <Icon name="check" size={15} />{isNew ? 'Add loan' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Columns + Statuses drawer ──────────────────────────────────────────── */

const LOCKED_COLS = [
  { name: 'Customer Name',           tag: 'required' },
  { name: 'Loan Amount',             tag: 'required' },
  { name: 'Status',                  tag: 'required' },
  { name: 'Close / loan-end date',   tag: 'req. if closed' },
  { name: '2% Commission · 0.5% Trail', tag: 'auto-calc' },
]

function ColumnsTab({ columns, setColumns }) {
  const [drag, setDrag] = useState(null)
  const toggle = i => setColumns(columns.map((c, idx) => idx === i ? { ...c, on: !c.on } : c))
  const rename = (i, v) => setColumns(columns.map((c, idx) => idx === i ? { ...c, name: v } : c))
  const remove = i => setColumns(columns.filter((_, idx) => idx !== i))
  const onDrop = (i) => {
    if (drag == null || drag === i) return
    const next = [...columns]
    const [m] = next.splice(drag, 1)
    next.splice(i, 0, m)
    setColumns(next)
    setDrag(null)
  }

  return (
    <>
      <div className="col-group-label">
        <Icon name="check" size={13} style={{ color: 'var(--green)' }} /> Locked · core data points
      </div>
      {LOCKED_COLS.map((c, i) => (
        <div key={i} className="col-row locked">
          <span className="grip">⋮⋮</span>
          <span className="cname">{c.name}</span>
          <span className="lock-tag">🔒 {c.tag}</span>
        </div>
      ))}
      <div className="col-group-label">Optional · rename / hide / remove</div>
      {columns.map((c, i) => (
        <div key={c.key} className="col-row" draggable
          onDragStart={() => setDrag(i)} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(i)}>
          <span className="grip" title="Drag to reorder">⋮⋮</span>
          <input className="rename" value={c.name} onChange={e => rename(i, e.target.value)} />
          <button className={'switch' + (c.on ? ' on' : '')} onClick={() => toggle(i)} title={c.on ? 'Visible' : 'Hidden'}>
            <span className="knob" />
          </button>
          <button className="icon-btn danger" onClick={() => remove(i)} title="Remove column entirely">
            <Icon name="trash" size={15} />
          </button>
        </div>
      ))}
      {columns.length === 0 && (
        <div className="muted" style={{ fontSize: 13, padding: '8px 4px' }}>
          All optional columns removed — only core data points remain.
        </div>
      )}
    </>
  )
}

function StatusesTab({ statuses, setStatuses }) {
  const [drag, setDrag] = useState(null)
  const norm = arr => Core.normalizeStatuses(arr)
  const progress = statuses.filter(s => !s.role)
  const closed = statuses.find(s => s.role === 'closed')
  const dead = statuses.find(s => s.role === 'dead')

  const rename = (id, v) => setStatuses(norm(statuses.map(s => s.id === id ? { ...s, label: v } : s)))
  const remove = (id) => setStatuses(norm(statuses.filter(s => s.id !== id)))
  const add = () => setStatuses(norm([...statuses, { id: Core.newStatusId(), label: 'New Stage', role: null }]))
  const onDrop = (id) => {
    if (drag == null || drag === id) return
    const list = [...progress]
    const from = list.findIndex(s => s.id === drag)
    const to = list.findIndex(s => s.id === id)
    if (from < 0 || to < 0) { setDrag(null); return }
    const [m] = list.splice(from, 1)
    list.splice(to, 0, m)
    setStatuses(norm([...list, closed, dead].filter(Boolean)))
    setDrag(null)
  }

  return (
    <>
      <div className="col-group-label">Pipeline stages · drag, rename, add or remove</div>
      {progress.map(s => (
        <div key={s.id} className="col-row" draggable
          onDragStart={() => setDrag(s.id)} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(s.id)}>
          <span className="grip" title="Drag to reorder">⋮⋮</span>
          <span className="status-code">{Core.codeIn(statuses, s)}</span>
          <input className="rename" value={s.label} onChange={e => rename(s.id, e.target.value)} />
          <button
            className="icon-btn danger" onClick={() => remove(s.id)} title="Remove stage"
            disabled={progress.length <= 1}
            style={{ opacity: progress.length <= 1 ? .3 : 1, pointerEvents: progress.length <= 1 ? 'none' : 'auto' }}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      ))}
      <button className="btn ghost add-stage" onClick={add}><Icon name="plus" size={15} />Add stage</button>

      <div className="col-group-label">
        <Icon name="check" size={13} style={{ color: 'var(--green)' }} /> Locked roles · drive commissions &amp; alerts
      </div>
      {closed && (
        <div className="col-row locked">
          <span className="status-code closed">{Core.codeIn(statuses, closed)}</span>
          <input className="rename" value={closed.label} onChange={e => rename(closed.id, e.target.value)} />
          <span className="lock-tag">🔒 earns 2% + trail</span>
        </div>
      )}
      {dead && (
        <div className="col-row locked">
          <span className="status-code dead">X</span>
          <input className="rename" value={dead.label} onChange={e => rename(dead.id, e.target.value)} />
          <span className="lock-tag" style={{ color: 'var(--red-ink)', borderColor: '#eccfc4' }}>🔒 excluded</span>
        </div>
      )}
      <p className="drawer-hint">
        Rename these freely (e.g. "Closed" → "Funded"), but their role is locked — that's how the app
        knows which loans earn commission and which to drop from the pipeline.
      </p>
    </>
  )
}

export function ColumnsDrawer({ columns, setColumns, statuses, setStatuses, onClose, initialTab = 'columns' }) {
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <h2>Customize</h2>
          <p>{tab === 'columns'
            ? 'Show only the columns you need. Drag to reorder, rename inline, hide, or remove. Core data points stay locked so commission math never breaks.'
            : 'Rename, add, remove or reorder your pipeline stages. The "Closed" and "Dead" roles are locked so commissions and alerts keep working.'
          }</p>
          <div className="drawer-tabs">
            <button className={'dtab' + (tab === 'columns' ? ' active' : '')} onClick={() => setTab('columns')}>Columns</button>
            <button className={'dtab' + (tab === 'statuses' ? ' active' : '')} onClick={() => setTab('statuses')}>Statuses</button>
          </div>
        </div>
        <div className="drawer-body">
          {tab === 'columns'
            ? <ColumnsTab columns={columns} setColumns={setColumns} />
            : <StatusesTab statuses={statuses} setStatuses={setStatuses} />
          }
        </div>
        <div className="drawer-foot">
          {tab === 'columns'
            ? <button className="btn ghost" onClick={() => setColumns(Core.defaultColumns())}>Reset columns</button>
            : <button className="btn ghost" onClick={() => setStatuses(Core.defaultStatuses())}>Reset statuses</button>
          }
          <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={onClose}>Done</button>
        </div>
      </div>
    </>
  )
}
