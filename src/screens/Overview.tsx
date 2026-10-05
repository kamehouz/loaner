import { calc } from '../lib/calc';
import { billingItems } from '../lib/billing';
import { money, r2, ymLabel, type YM } from '../lib/format';
import type { Loan, Settings } from '../lib/types';
import { Chip, MonthPicker, PageHead } from '../components/ui';

interface Props {
  loans: Loan[];
  settings: Settings;
  today: string;
  ym: YM;
  currentYm: YM;
  onMonth: (ym: YM) => void;
  onOpenLoan: (id: string) => void;
  mobile: boolean;
}

export function Overview({ loans, settings, today, ym, currentYm, onMonth, onOpenLoan, mobile }: Props) {
  const closed = loans.filter((l) => l.status === 'Closed');
  const pipe = loans.filter((l) => l.status === 'Pipeline');
  // Fees "so far" count closed loans whose closing date has passed.
  const closedCalc = closed.filter((l) => l.closingDate <= today).map((l) => calc(l, settings));
  const refItems = billingItems(loans, ym, settings).filter((i) => i.kind === 'ref');
  const monthRef = r2(refItems.reduce((t, i) => t + i.amount, 0));
  const label = ymLabel(ym);

  return (
    <div className="screen loose">
      <PageHead title="Overview" sub="Where the business stands today.">
        <MonthPicker ym={ym} currentYm={currentYm} onChange={onMonth} />
      </PageHead>

      <div className="stat-grid">
        <div className="card stat">
          <span className="label">Closed loans</span>
          <span className="big">{closed.length}</span>
          <span className="sub-strong" style={{ color: 'var(--green)' }}>{money(closed.reduce((t, l) => t + l.cost, 0))} closed</span>
        </div>
        <div className="card stat">
          <span className="label">Pipeline loans</span>
          <span className="big">{pipe.length}</span>
          <span className="sub-strong" style={{ color: 'var(--blue)' }}>{money(pipe.reduce((t, l) => t + l.cost, 0))} in pipeline</span>
        </div>
        <div className="card stat">
          <span className="label">Origination fees so far</span>
          <span className="mid">{money(closedCalc.reduce((t, c) => t + c.orig, 0))}</span>
          <span className="sub">From closed loans</span>
        </div>
        <div className="card stat">
          <span className="label">Closing fees so far</span>
          <span className="mid">{money(closedCalc.reduce((t, c) => t + c.legal, 0))}</span>
          <span className="sub">From closed loans</span>
        </div>
        <div className="card stat accent">
          <span className="label">Monthly referral fee</span>
          <span className="mid">{money(monthRef)}</span>
          <span className="sub">Ongoing · {label}</span>
        </div>
      </div>

      <div className="section">
        <h2>Referral fee for the month shown, by loan</h2>
        <div className="table">
          {!mobile && (
            <div className="trow thead ov-cols">
              <span>Client</span><span>Loan #</span><span>Status</span><span>Payment #</span><span className="r">Referral fee</span>
            </div>
          )}
          {refItems.map((i) => mobile ? (
            <div key={i.key} className="m-row clickable" onClick={() => onOpenLoan(i.loan.id)}>
              <div><b>{i.loan.client}</b><small>{i.loan.num} · Payment {i.pmtN} of {i.loan.term}</small></div>
              <span>{money(i.amount)}</span>
            </div>
          ) : (
            <div key={i.key} className="trow tbody-row ov-cols clickable" onClick={() => onOpenLoan(i.loan.id)}>
              <span style={{ fontWeight: 500 }}>{i.loan.client}</span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{i.loan.num}</span>
              <span><Chip status={i.loan.status} /></span>
              <span className="num" style={{ color: 'var(--ink-2)' }}>{i.pmtN} of {i.loan.term}</span>
              <span className="num r" style={{ fontWeight: 500 }}>{money(i.amount)}</span>
            </div>
          ))}
          {refItems.length > 0 ? (
            <div className="ov-total"><span>Total for {label}</span><span className="num">{money(monthRef)}</span></div>
          ) : (
            <div className="empty-inline">
              <b>No referral fees in {label}</b>
              <span>Referral fees start once a closed loan's first payment is due.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
