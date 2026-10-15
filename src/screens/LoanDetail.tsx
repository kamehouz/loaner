import { calcLoan, dealSplit, upfrontFees } from '../lib/calc';
import { fmtDate, money, pct, rate, ymOf } from '../lib/format';
import { missingInfo, type Loan, type Settings } from '../lib/types';
import { ChevronLeft, Chip, Kv } from '../components/ui';

interface Props {
  loan: Loan;
  settings: Settings;
  today: string;
  onBack: () => void;
  onProjection: () => void;
  onEdit: () => void;
  onMarkDead: () => void;
  onRestore: () => void;
}

export function LoanDetail({ loan, settings, today, onBack, onProjection, onEdit, onMarkDead, onRestore }: Props) {
  const c = calcLoan(loan, settings);
  const nowRow = c?.rows.find((r) => r.ym === ymOf(today));
  const dead = loan.status === 'Dead';
  const missing = dead ? [] : missingInfo(loan);
  const split = loan.cost != null ? dealSplit(loan.cost, loan.depositPct) : null;
  const upfront = loan.cost != null ? upfrontFees(loan.cost, settings) : null;
  const amount = (n: number | null | undefined) => (n == null ? '—' : money(n));

  return (
    <div className="screen">
      <button className="link" onClick={onBack} style={{ alignSelf: 'flex-start', height: 32, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ChevronLeft size={14} />All loans
      </button>
      <div className="page-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em' }}>{loan.client}</h1>
            <Chip status={loan.status} large />
          </div>
          <span className="mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{loan.num ?? 'No loan number yet'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onProjection}>View projection</button>
          <button className="btn btn-secondary" onClick={onEdit}>Edit loan</button>
          {dead
            ? <button className="btn btn-secondary" style={{ color: 'var(--blue)' }} onClick={onRestore}>Move back to pipeline</button>
            : <button className="btn btn-danger-outline" onClick={onMarkDead}>Mark as dead</button>}
        </div>
      </div>
      {missing.length > 0 && (
        <div className="note" style={{ background: 'var(--blue-wash)', color: 'var(--blue-deep)' }}>
          <b>Still needed from the bank:</b> {missing.join(', ')}. Use Edit loan to add each one as it comes in.
        </div>
      )}
      {dead && <div className="note">This loan is marked dead. It is kept for your records and left out of billing and totals.</div>}
      <div className="panel-grid">
        <div className="card panel">
          <h2>Loan terms</h2>
          <Kv k="Closing date" v={fmtDate(loan.closingDate)} />
          <Kv k="First payment date" v={fmtDate(loan.firstPaymentDate)} />
          <Kv k="Equipment cost" v={amount(loan.cost)} />
          <Kv k="Deposit" v={loan.cost == null ? '—' : pct(loan.depositPct)} />
          <Kv k="Interest rate" v={loan.rate == null ? '—' : rate(loan.rate)} />
          <Kv k="Term" v={loan.term == null ? '—' : `${loan.term} months`} />
        </div>
        <div className="card panel calc">
          <h2>Calculated</h2>
          <Kv k="Deposit" v={amount(split?.deposit)} />
          <Kv k="Financed amount" v={amount(split?.financed)} />
          <Kv k="Monthly payment" v={amount(c?.pmt)} />
          <Kv k="Final payment" v={c ? fmtDate(c.lastDate) : '—'} />
          <Kv k="Payment this month" v={nowRow ? `#${nowRow.n} of ${loan.term}` : '—'} />
        </div>
        <div className="card panel">
          <h2>Fees to Dinio Capital</h2>
          <Kv k="Origination fee" v={amount(upfront?.orig)} />
          <Kv k="Legal/closing fee" v={amount(upfront?.legal)} />
          <Kv k="Referral fees, life of loan" v={amount(c?.refTotal)} />
          <Kv className="total" k="Total fees" v={amount(c?.totalFees)} />
        </div>
      </div>
    </div>
  );
}
