/* Dinio — shared atoms & icons */
const { useState, useEffect, useRef, useMemo } = React;

/* ---------- icon set (line icons, 24 grid) ---------- */
const ICON_PATHS = {
  grid:    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  table:   '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16"/>',
  plus:    '<path d="M12 5v14M5 12h14"/>',
  search:  '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  edit:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:   '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6M10 11v6M14 11v6"/>',
  cog:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V22a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 6 20.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4 15a1.7 1.7 0 0 0-1.5-1H2a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.5a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1A1.7 1.7 0 0 0 15 4.5a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 19.5 9a1.7 1.7 0 0 0 1.5 1h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"/>',
  bell:    '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  check:   '<path d="M20 6L9 17l-5-5"/>',
  x:       '<path d="M18 6L6 18M6 6l12 12"/>',
  alert:   '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  left:    '<path d="M15 18l-6-6 6-6"/>',
  right:   '<path d="M9 18l6-6-6-6"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  dollar:  '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  layers:  '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
  trend:   '<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
  inbox:   '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.5z"/>',
  repeat:  '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  flag:    '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  users:   '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/>',
};
function Icon({ name, size = 18, stroke = 1.7, className = '', style }) {
  return (
    <svg className={'ic ' + className} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style} dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || '' }} />
  );
}

/* ---------- status badge ---------- */
function StatusBadge({ loan, withCode = true }) {
  const s = Core.statusOf(loan.status);
  const follow = Core.needsFollowUp(loan);
  const tone = follow ? 'follow' : s.tone;
  return (
    <span className={'badge ' + tone}>
      <span className="dot" />
      {withCode ? (s.code + ' · ') : ''}{s.label}{follow ? ' · follow up' : ''}
    </span>
  );
}

/* ---------- KPI card ---------- */
function Kpi({ label, value, foot, tone, icon }) {
  return (
    <div className={'card kpi ' + (tone || '')}>
      {icon && <div className={'spark ' + (tone === 'accent' ? 'a' : tone === 'green' ? 'g' : 'b')}><Icon name={icon} size={16} /></div>}
      <div className="label">{label}</div>
      <div className="val money">{value}</div>
      {foot && <div className="foot">{foot}</div>}
    </div>
  );
}

/* ---------- pipeline bars ---------- */
function PipelineBars({ loans }) {
  const counts = Core.orderedStatuses().map(s => {
    const info = Core.statusInfo(s.id);
    return { info, c: loans.filter(l => l.status === s.id).length };
  });
  const max = Math.max(1, ...counts.map(x => x.c));
  return (
    <div className="bars">
      {counts.map(({ info, c }) => (
        <div key={info.id} className={'bar-row' + (c === 0 ? ' empty' : '')}>
          <span className="nm">{info.code} · {info.label}</span>
          <div className="bar-track">
            <div className={'bar-fill' + (info.tone === 'closed' ? ' closed' : info.tone === 'dead' ? ' dead' : '')}
              style={{ width: (c === 0 ? 0 : Math.max(7, (c / max) * 100)) + '%' }} />
          </div>
          <span className="ct">{c}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- confirm dialog ---------- */
function ConfirmDialog({ title, body, confirmLabel = 'Delete', onConfirm, onCancel }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div className="scrim" onMouseDown={onCancel}>
      <div className="confirm-dialog" style={{ marginTop: '14vh' }} onMouseDown={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="row">
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn danger" onClick={onConfirm}><Icon name="trash" size={15} />{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, StatusBadge, Kpi, PipelineBars, ConfirmDialog });
