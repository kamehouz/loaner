import { useState } from 'react';
import { calcLoan, dealSplit } from '../lib/calc';
import { fmtDate, fmtDateTime, money, pct, rate } from '../lib/format';
import { missingInfo, type Loan, type LoanStatus, type Note, type Settings } from '../lib/types';
import { latestNoteByLoan } from '../lib/notes';
import { Chip, PageHead } from '../components/ui';

type Filter = 'All' | LoanStatus;
const FILTERS: Filter[] = ['All', 'Pipeline', 'Closed', 'Dead'];

interface Props {
  loans: Loan[];
  notes: Note[];
  settings: Settings;
  mobile: boolean;
  onAdd: () => void;
  onOpenLoan: (id: string) => void;
}

export function Loans({ loans, notes, settings, mobile, onAdd, onOpenLoan }: Props) {
  const [filter, setFilter] = useState<Filter>('All');
  const nActive = loans.filter((l) => l.status !== 'Dead').length;
  const filtered = filter === 'All' ? loans : loans.filter((l) => l.status === filter);
  // Loans still waiting on a bank number come first, then newest number first.
  const byNumber = (x: Loan, y: Loan) => (x.num === null ? 0 : 1) - (y.num === null ? 0 : 1) || (y.num ?? '').localeCompare(x.num ?? '');
  const rows = [...filtered].sort(byNumber).map((l) => {
    const c = calcLoan(l, settings);
    const split = l.cost != null ? dealSplit(l.cost, l.depositPct) : null;
    const missing = l.status === 'Pipeline' ? missingInfo(l) : [];
    return { l, c, split, missing };
  });
  const latest = latestNoteByLoan(notes);
  const latestLine = (l: Loan) => {
    const n = latest[l.id];
    return n && <small className="latest" title={n.body}><b>{fmtDateTime(n.createdAt).split(',')[0]}</b>{n.body}</small>;
  };
  const dash = '—';
  const amount = (n: number | null | undefined) => (n == null ? dash : money(n));
  const needs = (missing: string[]) => missing.length > 0 && (
    <small className="needs" title={`Still needed: ${missing.join(', ')}`}>Missing {missing.length} {missing.length === 1 ? 'detail' : 'details'}</small>
  );

  return (
    <div className="screen">
      <PageHead title="Loans" sub={loans.length ? `${nActive} active · ${loans.length - nActive} dead` : 'Every referral, in one place.'}>
        <button className="btn btn-primary" onClick={onAdd}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span>Add loan</button>
      </PageHead>

      {loans.length === 0 ? (
        <div className="empty">
          <div className="icon">+</div>
          <div className="text">
            <b>No loans yet</b>
            <span>Add your first referral. Fees, payment schedules and billing are worked out automatically.</span>
          </div>
          <button className="btn btn-primary" onClick={onAdd}>Add loan</button>
        </div>
      ) : (
        <>
          <div className="page-head" style={{ alignItems: 'center', gap: 12 }}>
            <div className="seg" role="tablist" aria-label="Filter by status">
              {FILTERS.map((k) => {
                const n = k === 'All' ? loans.length : loans.filter((l) => l.status === k).length;
                return <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{k} {n}</button>;
              })}
            </div>
            {!mobile && (
              <div className="legend"><i style={{ background: 'var(--calc-head)', border: '1px solid #D3E4EF' }} />Shaded columns are calculated for you</div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="card no-match">No loans with this status.</div>
          ) : mobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rows.map(({ l, c, missing }) => (
                <div key={l.id} className={'card loan-card' + (l.status === 'Dead' ? ' dead' : '')} onClick={() => onOpenLoan(l.id)}>
                  <div className="loan-card-head">
                    <div><b>{l.client}</b><span className="mono" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{l.num ?? 'No loan number yet'}</span>{needs(missing)}{latestLine(l)}</div>
                    <Chip status={l.status} />
                  </div>
                  <div className="loan-card-grid">
                    <div><span>Equipment cost</span><span>{amount(l.cost)}</span></div>
                    <div><span>Monthly payment</span><span style={{ fontWeight: 500 }}>{amount(c?.pmt)}</span></div>
                    <div><span>Closing date</span><span>{fmtDate(l.closingDate)}</span></div>
                    <div><span>Term · Interest</span><span>{l.term == null ? dash : `${l.term} mo`} · {l.rate == null ? dash : rate(l.rate)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table scroll">
              <div style={{ minWidth: 1380 }}>
                <div className="trow thead loan-cols">
                  <span>Loan #</span><span>Client or company</span><span>Status</span><span>Closing date</span><span>First payment</span>
                  <span className="r">Equipment cost</span><span className="r">Deposit %</span><span className="r">Interest</span><span className="r">Term</span>
                  <span className="r calc-col">Deposit $</span><span className="r calc-col">Financed</span><span className="r calc-col">Monthly payment</span>
                </div>
                {rows.map(({ l, c, split, missing }) => (
                  <div key={l.id} className={'trow tbody-row loan-cols clickable' + (l.status === 'Dead' ? ' dead' : '')} onClick={() => onOpenLoan(l.id)}>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{l.num ?? dash}</span>
                    <span><span style={{ fontWeight: 500 }}>{l.client}</span>{needs(missing)}{latestLine(l)}</span>
                    <span className="status-cell"><Chip status={l.status} /></span>
                    <span>{fmtDate(l.closingDate)}</span>
                    <span>{fmtDate(l.firstPaymentDate)}</span>
                    <span className="r">{amount(l.cost)}</span>
                    <span className="r">{l.cost == null ? dash : pct(l.depositPct)}</span>
                    <span className="r">{l.rate == null ? dash : rate(l.rate)}</span>
                    <span className="r">{l.term ?? dash}</span>
                    <span className="r calc-col">{amount(split?.deposit)}</span>
                    <span className="r calc-col">{amount(split?.financed)}</span>
                    <span className="r calc-col" style={{ fontWeight: 500 }}>{amount(c?.pmt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
