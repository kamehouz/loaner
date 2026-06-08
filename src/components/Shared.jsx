import { useEffect } from 'react'
import { Icon } from './Icons.jsx'
import * as Core from '../core.js'

export function StatusBadge({ loan, withCode = true }) {
  const s = Core.statusOf(loan.status)
  const follow = Core.needsFollowUp(loan)
  const tone = follow ? 'follow' : s.tone
  return (
    <span className={'badge ' + tone}>
      <span className="dot" />
      {withCode ? (s.code + ' · ') : ''}{s.label}{follow ? ' · follow up' : ''}
    </span>
  )
}

export function Kpi({ label, value, foot, tone, icon }) {
  return (
    <div className={'card kpi ' + (tone || '')}>
      {icon && (
        <div className={'spark ' + (tone === 'accent' ? 'a' : tone === 'green' ? 'g' : 'b')}>
          <Icon name={icon} size={16} />
        </div>
      )}
      <div className="label">{label}</div>
      <div className="val money">{value}</div>
      {foot && <div className="foot">{foot}</div>}
    </div>
  )
}

export function PipelineBars({ loans }) {
  const counts = Core.orderedStatuses().map(s => {
    const info = Core.statusInfo(s.id)
    return { info, c: loans.filter(l => l.status === s.id).length }
  }).filter(x => x.c > 0)

  const max = Math.max(1, ...counts.map(x => x.c))

  if (!counts.length) {
    return <div className="bars" style={{ color: 'var(--muted)', fontSize: 13, padding: '18px 0' }}>No loans in the pipeline yet.</div>
  }

  return (
    <div className="bars">
      {counts.map(({ info, c }) => (
        <div key={info.id} className="bar-row">
          <span className="nm">{info.code} · {info.label}</span>
          <div className="bar-track">
            <div
              className={'bar-fill' + (info.tone === 'closed' ? ' closed' : info.tone === 'dead' ? ' dead' : '')}
              style={{ width: Math.max(7, (c / max) * 100) + '%' }}
            />
          </div>
          <span className="ct">{c}</span>
        </div>
      ))}
    </div>
  )
}

export function ConfirmDialog({ title, body, confirmLabel = 'Delete', onConfirm, onCancel }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCancel])

  return (
    <div className="scrim" onMouseDown={onCancel}>
      <div className="confirm-dialog" style={{ marginTop: '14vh' }} onMouseDown={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="row">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn danger" onClick={onConfirm}>
            <Icon name="trash" size={15} />{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
