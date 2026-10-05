import { calc } from '../lib/calc';
import { fmtDate, money, rate, ymOf } from '../lib/format';
import type { Loan, Settings } from '../lib/types';
import { Chip, Kv, PageHead } from '../components/ui';

interface Props {
  loans: Loan[];
  loan: Loan | undefined;
  settings: Settings;
  today: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export function Projection({ loans, loan, settings, today, onSelect, onAdd }: Props) {
  const curYm = ymOf(today);

  const options = [...loans].sort((x, y) => x.num.localeCompare(y.num));
  const c = loan ? calc(loan, settings) : null;

  return (
    <div className="screen">
      <PageHead title="Loan projection" sub="Every payment and fee over the life of a loan.">
        {loan && (
          <label className="field" style={{ minWidth: 260 }}>Loan
            <select className="input" value={loan.id} onChange={(e) => onSelect(e.target.value)}>
              {options.map((l) => <option key={l.id} value={l.id}>{l.client} · {l.num}{l.status === 'Dead' ? ' (dead)' : ''}</option>)}
            </select>
          </label>
        )}
      </PageHead>

      {loan && c ? (
        <>
          <div className="panel-grid wide">
            <div className="card panel" style={{ gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><h2>Summary</h2><Chip status={loan.status} /></div>
              <div className="summary-items">
                {([
                  ['Client', loan.client],
                  ['Equipment cost', money(loan.cost)],
                  ['Deposit', `${money(c.deposit)} (${loan.depositPct}%)`],
                  ['Financed amount', money(c.financed)],
                  ['Interest', rate(loan.rate)],
                  ['Term', `${loan.term} months`],
                  ['Monthly payment', money(c.pmt)],
                ] as const).map(([k, v]) => <div key={k}><span>{k}</span><span>{v}</span></div>)}
              </div>
            </div>
            <div className="card panel">
              <h2>Fees</h2>
              <Kv k="Origination fee" v={money(c.orig)} />
              <Kv k="Legal/closing fee" v={money(c.legal)} />
              <Kv k="Referral fee, life of loan" v={money(c.refTotal)} />
              <div className="fee-total"><span>Total fees</span><span>{money(c.totalFees)}</span></div>
            </div>
          </div>

          <div className="section">
            <div className="section-head">
              <h2>Payment schedule</h2>
              <span className="legend"><i style={{ background: 'var(--blue-focus)' }} />Current month</span>
            </div>
            <div className="table scroll">
              <div style={{ minWidth: 760 }}>
                <div className="trow thead sched-cols">
                  <span>Pmt #</span><span>Pmt date</span><span className="r">Principal</span><span className="r">Interest</span><span className="r">P&amp;I payment</span><span className="r">Balance</span><span className="r">Referral fee</span>
                </div>
                {c.rows.map((r) => {
                  const current = r.ym === curYm;
                  return (
                    <div key={r.n} className={'trow tbody-row sched-cols' + (current ? ' current' : r.n % 2 ? '' : ' alt')}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{r.n}{current && <span className="now-tag">Now</span>}</span>
                      <span>{fmtDate(r.date)}</span>
                      <span className="r">{money(r.principal)}</span>
                      <span className="r">{money(r.interest)}</span>
                      <span className="r">{money(r.payment)}</span>
                      <span className="r">{money(r.balance)}</span>
                      <span className="r ref">{money(r.referral)}</span>
                    </div>
                  );
                })}
                <div className="trow tfoot sched-cols">
                  <span>Total</span><span />
                  <span className="r">{money(c.totals.principal)}</span>
                  <span className="r">{money(c.totals.interest)}</span>
                  <span className="r">{money(c.totals.payment)}</span>
                  <span className="r">—</span>
                  <span className="r ref">{money(c.totals.referral)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="empty" style={{ padding: '48px 24px', gap: 12 }}>
          <div className="text"><b style={{ fontSize: 16 }}>Nothing to project yet</b><span>Add a loan to see its payments and fees.</span></div>
          <button className="btn btn-primary" onClick={onAdd}>Add loan</button>
        </div>
      )}
    </div>
  );
}
