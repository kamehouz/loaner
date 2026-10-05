import { calc } from '../lib/calc';
import { fmtDate, money, pct, rate, ymOf } from '../lib/format';
import type { Loan, Settings } from '../lib/types';
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
  const c = calc(loan, settings);
  const nowRow = c.rows.find((r) => r.ym === ymOf(today));
  const dead = loan.status === 'Dead';

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
          <span className="mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{loan.num}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onProjection}>View projection</button>
          <button className="btn btn-secondary" onClick={onEdit}>Edit loan</button>
          {dead
            ? <button className="btn btn-secondary" style={{ color: 'var(--blue)' }} onClick={onRestore}>Move back to pipeline</button>
            : <button className="btn btn-danger-outline" onClick={onMarkDead}>Mark as dead</button>}
        </div>
      </div>
      {dead && <div className="note">This loan is marked dead. It is kept for your records and left out of billing and totals.</div>}
      <div className="panel-grid">
        <div className="card panel">
          <h2>Loan terms</h2>
          <Kv k="Closing date" v={fmtDate(loan.closingDate)} />
          <Kv k="First payment date" v={fmtDate(loan.firstPaymentDate)} />
          <Kv k="Equipment cost" v={money(loan.cost)} />
          <Kv k="Deposit" v={pct(loan.depositPct)} />
          <Kv k="Interest rate" v={rate(loan.rate)} />
          <Kv k="Term" v={`${loan.term} months`} />
        </div>
        <div className="card panel calc">
          <h2>Calculated</h2>
          <Kv k="Deposit" v={money(c.deposit)} />
          <Kv k="Financed amount" v={money(c.financed)} />
          <Kv k="Monthly payment" v={money(c.pmt)} />
          <Kv k="Final payment" v={fmtDate(c.lastDate)} />
          <Kv k="Payment this month" v={nowRow ? `#${nowRow.n} of ${loan.term}` : '—'} />
        </div>
        <div className="card panel">
          <h2>Fees to Dinio Capital</h2>
          <Kv k="Origination fee" v={money(c.orig)} />
          <Kv k="Legal/closing fee" v={money(c.legal)} />
          <Kv k="Referral fees, life of loan" v={money(c.refTotal)} />
          <Kv className="total" k="Total fees" v={money(c.totalFees)} />
        </div>
      </div>
    </div>
  );
}
