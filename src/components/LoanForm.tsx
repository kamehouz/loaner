import { useState } from 'react';
import { calc, dealSplit } from '../lib/calc';
import { addMonths, fmtDate, money, num, parseDate, plainAmount, r2, todayIso } from '../lib/format';
import type { Loan, LoanInput, LoanStatus, Settings } from '../lib/types';

interface FormState {
  /** The bank's loan number */
  loanNumber: string;
  client: string;
  status: LoanStatus;
  closing: string;
  first: string;
  /** Once the first payment date is typed, stop deriving it from the closing date. */
  firstTouched: boolean;
  cost: string;
  depositPct: string;
  rate: string;
  term: string;
}

const fromLoan = (l: Loan | null): FormState => l
  ? {
    loanNumber: l.num ?? '', client: l.client, status: l.status,
    closing: l.closingDate ? fmtDate(l.closingDate) : '', first: l.firstPaymentDate ? fmtDate(l.firstPaymentDate) : '', firstTouched: !!l.firstPaymentDate,
    cost: l.cost != null ? plainAmount(l.cost) : '', depositPct: String(l.depositPct), rate: l.rate != null ? String(l.rate) : '', term: l.term != null ? String(l.term) : '',
  }
  : { loanNumber: '', client: '', status: 'Pipeline', closing: '', first: '', firstTouched: false, cost: '', depositPct: '0', rate: '', term: '' };

const validTerm = (s: string) => { const t = Number(s); return Number.isInteger(t) && t >= 1 && t <= 600; };

/**
 * Pipeline and dead loans only need a client: the bank hasn't confirmed the rest yet, so a
 * detail can be left blank, but one that is typed must still make sense.
 * A closed loan needs every detail.
 */
function validate(f: FormState) {
  const closed = f.status === 'Closed';
  const bad = (value: string, valid: boolean) => (closed || value.trim() !== '') && !valid;
  return {
    client: !f.client.trim(),
    loanNumber: closed && !f.loanNumber.trim(),
    closing: bad(f.closing, !!parseDate(f.closing)),
    first: bad(f.first, !!parseDate(f.first)),
    cost: bad(f.cost, num(f.cost) > 0),
    rate: bad(f.rate, num(f.rate) >= 0),
    term: bad(f.term, validTerm(f.term)),
  };
}

interface Props {
  loan: Loan | null;
  settings: Settings;
  onClose: () => void;
  onSave: (input: LoanInput) => Promise<void>;
}

export function LoanForm({ loan, settings, onClose, onSave }: Props) {
  const [f, setF] = useState<FormState>(() => fromLoan(loan));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const set = (patch: Partial<FormState>) => setF((s) => ({ ...s, ...patch }));
  const err = tried ? validate(f) : null;
  const closed = f.status === 'Closed';

  const statuses: LoanStatus[] = loan ? ['Pipeline', 'Closed', 'Dead'] : ['Pipeline', 'Closed'];

  const onClosing = (v: string) => {
    const iso = parseDate(v);
    set(iso && !f.firstTouched ? { closing: v, first: fmtDate(addMonths(iso, 1)) } : { closing: v });
  };

  // The preview shows whatever can be worked out so far.
  const cost = num(f.cost), rate = num(f.rate), term = Number(f.term);
  const split = cost > 0 ? dealSplit(cost, num(f.depositPct) || 0) : null;
  const payment = cost > 0 && rate >= 0 && validTerm(f.term)
    ? calc({ cost, depositPct: num(f.depositPct) || 0, rate, term, firstPaymentDate: todayIso() }, settings).pmt
    : null;

  const save = async () => {
    setTried(true);
    if (Object.values(validate(f)).some(Boolean)) return;
    setBusy(true);
    setSaveError('');
    const filled = (s: string) => s.trim() !== '';
    try {
      await onSave({
        num: f.loanNumber.trim() || null,
        client: f.client.trim(), status: f.status,
        closingDate: parseDate(f.closing), firstPaymentDate: parseDate(f.first),
        cost: filled(f.cost) ? r2(cost) : null, depositPct: num(f.depositPct) || 0,
        rate: filled(f.rate) ? rate : null, term: filled(f.term) ? term : null,
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the loan.');
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="loan-form-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><h2 id="loan-form-title">{loan ? 'Edit loan' : 'Add a loan'}</h2><p>Just the basics. We'll work out the rest.</p></div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label className="field">Client or company
            <input className="input" autoFocus value={f.client} onChange={(e) => set({ client: e.target.value })} placeholder="e.g. Harbor Logistics Ltd" />
            {err?.client && <span className="field-error">Add a client or company name.</span>}
          </label>

          <div className="field">Status
            <div className="seg seg-form" role="radiogroup" aria-label="Status">
              {statuses.map((s) => <button key={s} type="button" role="radio" aria-checked={f.status === s} className={f.status === s ? 'on' : ''} onClick={() => set({ status: s })}>{s}</button>)}
            </div>
            <span className="field-hint">
              {closed ? 'A closed loan needs every detail below.' : 'Only the client is needed for now. Add the rest as the bank confirms it.'}
            </span>
          </div>

          <label className="field">Loan number
            <input className="input" value={f.loanNumber} onChange={(e) => set({ loanNumber: e.target.value })} placeholder="The bank's loan number" />
            {err?.loanNumber
              ? <span className="field-error">Add the bank's loan number to close this loan.</span>
              : <span className="field-hint">{closed ? 'As issued by the bank.' : 'Add it once the bank assigns one.'}</span>}
          </label>

          <div className="form-row">
            <label className="field">Closing date
              <input className="input num" value={f.closing} onChange={(e) => onClosing(e.target.value)} placeholder="dd/mm/yyyy" inputMode="numeric" />
              {err?.closing
                ? <span className="field-error">Use day/month/year, e.g. 20/10/2026.</span>
                : <span className="field-hint">{closed ? 'Day/month/year' : 'Optional. An expected date is fine.'}</span>}
            </label>
            <label className="field">First payment date
              <input className="input num" value={f.first} onChange={(e) => set({ first: e.target.value, firstTouched: true })} placeholder="dd/mm/yyyy" inputMode="numeric" />
              {err?.first
                ? <span className="field-error">Use day/month/year.</span>
                : <span className="field-hint">One month after closing, unless you change it.</span>}
            </label>
          </div>

          <div className="form-row three">
            <label className="field">Equipment cost
              <span className="affix"><span>$</span><input value={f.cost} onChange={(e) => set({ cost: e.target.value })} onBlur={() => cost > 0 && set({ cost: plainAmount(cost) })} inputMode="decimal" placeholder="0.00" /></span>
              {err?.cost && <span className="field-error">Enter the equipment cost.</span>}
            </label>
            <label className="field">Deposit
              <span className="affix"><input value={f.depositPct} onChange={(e) => set({ depositPct: e.target.value })} inputMode="decimal" placeholder="0" /><span>%</span></span>
            </label>
            <label className="field">Interest rate
              <span className="affix"><input value={f.rate} onChange={(e) => set({ rate: e.target.value })} inputMode="decimal" placeholder="8.99" /><span>%</span></span>
              {err?.rate && <span className="field-error">Enter the interest rate.</span>}
            </label>
          </div>

          <label className="field" style={{ maxWidth: 200 }}>Term
            <span className="affix"><input value={f.term} onChange={(e) => set({ term: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" placeholder="60" /><span>months</span></span>
            {err?.term && <span className="field-error">Enter a whole number of months, from 1 to 600.</span>}
          </label>

          <div className="preview">
            <div><span>Deposit</span><span>{split ? money(split.deposit) : '—'}</span></div>
            <div><span>Financed</span><span>{split ? money(split.financed) : '—'}</span></div>
            <div><span>Monthly payment</span><span>{payment != null ? money(payment) : '—'}</span></div>
          </div>
          {saveError && <div className="error-note" role="alert">{saveError}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" style={{ fontSize: 14.5, padding: '0 18px' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ padding: '0 20px' }} onClick={save} disabled={busy}>{loan ? 'Save changes' : 'Add loan'}</button>
        </div>
      </div>
    </div>
  );
}
