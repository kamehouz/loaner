/* Dinio — Dashboard view */
const { useState: useStateD } = React;

function TrailTracker({ loans, confirm, setConfirm }) {
  const [mk, setMk] = useStateD(Core.monthKey());
  const closed = loans.filter(l => Core.trailActiveIn(l, mk));
  const total = closed.reduce((a, l) => a + Core.monthlyTrail(l), 0);
  const got = closed.filter(l => confirm[l.id + '|' + mk]);
  const gotAmt = got.reduce((a, l) => a + Core.monthlyTrail(l), 0);
  const atCurrent = mk >= Core.monthKey();

  const toggle = (l) => {
    const key = l.id + '|' + mk;
    setConfirm({ ...confirm, [key]: !confirm[key] });
  };

  return (
    <div className="card trail card-pad" style={{ marginBottom: 18 }}>
      <div className="trail-head">
        <div className="trail-title">
          <div className="bell"><Icon name="repeat" size={18} /></div>
          <div>
            <h3>Monthly trail deposits</h3>
            <div className="sub">Confirm the 0.5% recurring deposit landed — this revenue leaks without a monthly check.</div>
          </div>
        </div>
        <div className="month-nav">
          <button className="icon-btn" onClick={() => setMk(Core.shiftMonth(mk, -1))} title="Previous month"><Icon name="left" size={16} /></button>
          <span className="lbl">{Core.monthLabel(mk)}</span>
          <button className="icon-btn" onClick={() => setMk(Core.shiftMonth(mk, 1))} disabled={atCurrent}
            style={{ opacity: atCurrent ? .35 : 1, pointerEvents: atCurrent ? 'none' : 'auto' }} title="Next month"><Icon name="right" size={16} /></button>
        </div>
      </div>

      {closed.length > 0 ? (
        <React.Fragment>
          <div className="trail-summary">
            <span className="big money">{Core.money(total)}</span>
            <span className="seg">expected this month</span>
            <div className="meter"><div style={{ width: (total ? Math.round(gotAmt / total * 100) : 0) + '%' }} /></div>
            <span className="seg"><b>{got.length}/{closed.length}</b> confirmed · {Core.money(gotAmt)} in</span>
            {gotAmt < total && <span className="seg pend"><b>{Core.money(total - gotAmt)}</b> pending</span>}
          </div>
          <div className="trail-rows">
            {closed.map(l => {
              const on = !!confirm[l.id + '|' + mk];
              return (
                <div key={l.id} className="trail-row">
                  <div className="who">
                    <div className="nm">{l.name}</div>
                    <div className="meta">{l.id} · on {Core.money(l.amount)} · since {Core.fmtDate(l.close)}</div>
                  </div>
                  <div className="amt money">{Core.money(Core.monthlyTrail(l))}<small> /mo</small></div>
                  <button className={'confirm' + (on ? ' got' : '')} onClick={() => toggle(l)}>
                    <Icon name={on ? 'check' : 'bell'} size={13} />{on ? 'Deposited' : 'Mark received'}
                  </button>
                </div>
              );
            })}
          </div>
        </React.Fragment>
      ) : (
        <div className="trail-empty">No active trails in {Core.monthLabel(mk)}. Trails begin the month a loan closes.</div>
      )}
    </div>
  );
}

function CommissionTable({ loans, onOpen }) {
  const closed = loans.filter(Core.isClosed);
  const totC = closed.reduce((a, l) => a + Core.closingComm(l), 0);
  const totT = closed.reduce((a, l) => a + Core.monthlyTrail(l), 0);
  const totTD = closed.reduce((a, l) => a + Core.trailToDate(l), 0);
  return (
    <div className="card alerts">
      <div className="card-pad" style={{ paddingBottom: 6 }}>
        <div className="section-title"><Icon name="dollar" size={17} style={{ color: 'var(--green)' }} /> Commission summary <span className="hint">· {closed.length} closed loan{closed.length !== 1 ? 's' : ''}</span></div>
      </div>
      {closed.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr>
              <th>Customer</th><th className="num">Loan amount</th><th>Close date</th>
              <th className="num">2% commission</th><th className="num">Trail / mo</th>
              <th className="num">Months</th>
            </tr></thead>
            <tbody>
              {closed.map(l => (
                <tr key={l.id} className="clickable" onClick={() => onOpen(l)}>
                  <td className="cust">{l.name}</td>
                  <td className="num money">{Core.money(l.amount)}</td>
                  <td>{Core.fmtDate(l.close)}</td>
                  <td className="num money" style={{ fontWeight: 700 }}>{Core.money(Core.closingComm(l))}</td>
                  <td className="num money">{Core.money(Core.monthlyTrail(l))}</td>
                  <td className="num">{Core.monthsActive(l)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td>Totals</td><td></td><td></td>
              <td className="num money">{Core.money(totC)}</td>
              <td className="num money">{Core.money(totT)} <span className="muted" style={{ fontWeight: 600 }}>/mo</span></td>
              <td></td>
            </tr></tfoot>
          </table>
        </div>
      ) : (
        <div className="empty" style={{ padding: '40px 20px' }}><Icon name="dollar" size={32} className="ic" /><h3>No closed loans yet</h3><div>Commissions appear here once a loan is marked Closed.</div></div>
      )}
    </div>
  );
}

function Dashboard({ loans, confirm, setConfirm, onOpen }) {
  const live = loans.filter(l => !Core.isDead(l));
  const volume = loans.reduce((a, l) => a + (Number(l.amount) || 0), 0);
  const closed = loans.filter(Core.isClosed);
  const closeComm = closed.reduce((a, l) => a + Core.closingComm(l), 0);
  const trail = closed.reduce((a, l) => a + Core.monthlyTrail(l), 0);
  const alerts = loans.filter(Core.needsFollowUp);

  return (
    <div>
      <div className="kpis">
        <Kpi label="Loans in pipeline" value={live.length} foot="active (not dead)" tone="" icon="layers" />
        <Kpi label="Total loan volume" value={Core.shortMoney(volume)} foot="all statuses" tone="" icon="trend" />
        <Kpi label="Closed loans" value={closed.length} foot="funded" tone="green" icon="check" />
        <Kpi label="Closing commissions" value={Core.money(closeComm)} foot={'earned · ' + (Core.CONFIG.closePct * 100) + '% of closed'} tone="accent" icon="dollar" />
        <Kpi label="Monthly trail — active" value={Core.money(trail)} foot={'per month · ' + (Core.CONFIG.trailPct * 100) + '%'} tone="accent" icon="repeat" />
      </div>

      <TrailTracker loans={loans} confirm={confirm} setConfirm={setConfirm} />

      <div className="dash-cols">
        <div className="card card-pad">
          <div className="section-title"><Icon name="layers" size={17} style={{ color: 'var(--blue)' }} /> Pipeline by stage</div>
          <PipelineBars loans={loans} />
        </div>
        <CommissionTable loans={loans} onOpen={onOpen} />
      </div>

      <div className="card alerts">
        <div className="card-pad">
          <div className="section-title"><Icon name="flag" size={17} style={{ color: 'var(--amber)' }} /> Follow-up alerts <span className="hint">· untouched &gt; {Core.CONFIG.followDays} business days</span></div>
          {alerts.length ? (
            <div className="alert-list">
              {alerts.map(l => (
                <div key={l.id} className="alert-item" onClick={() => onOpen(l)} style={{ cursor: 'pointer' }}>
                  <span className="lead-id">{l.id}</span>
                  <div className="who">
                    <div className="nm">{l.name}</div>
                    <div className="meta">{Core.statusOf(l.status).code} · {Core.statusOf(l.status).label}</div>
                  </div>
                  <StatusBadge loan={l} withCode={false} />
                  <div className="days">{Core.businessDaysSince(l.follow)}d<small>since follow-up</small></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="all-clear"><Icon name="check" size={18} /> All caught up — every active loan was followed up recently.</div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, TrailTracker, CommissionTable });
