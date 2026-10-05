import { useState } from 'react';
import { calc } from '../lib/calc';
import { addMonths, fmtDate, money, num, parseDate, plainAmount, r2, todayIso } from '../lib/format';
import type { Loan, LoanInput, LoanStatus, Settings } from '../lib/types';

interface FormState {
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
  ? { client: l.client, status: l.status, closing: fmtDate(l.closingDate), first: fmtDate(l.firstPaymentDate), firstTouched: true, cost: plainAmount(l.cost), depositPct: String(l.depositPct), rate: String(l.rate), term: String(l.term) }
  : { client: '', status: 'Pipeline', closing: '', first: '', firstTouched: false, cost: '', depositPct: '0', rate: '', term: '' };

function validate(f: FormState) {
  const t = Number(f.term);
  return {
    client: !f.client.trim(),
    closing: !parseDate(f.closing),
    first: !parseDate(f.first),
    cost: !(num(f.cost) > 0),
    rate: f.rate.trim() === '' || !(num(f.rate) >= 0),
    term: !Number.isInteger(t) || t < 1 || t > 600,
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

  const statuses: LoanStatus[] = loan ? ['Pipeline', 'Closed', 'Dead'] : ['Pipeline', 'Closed'];

  const onClosing = (v: string) => {
    const iso = parseDate(v);
    set(iso && !f.firstTouched ? { closing: v, first: fmtDate(addMonths(iso, 1)) } : { closing: v });
  };

  const cost = num(f.cost), rate = num(f.rate), term = Number(f.term);
  const preview = cost > 0 && rate >= 0 && Number.isInteger(term) && term >= 1 && term <= 600
    ? calc({ cost, depositPct: num(f.depositPct) || 0, rate, term, firstPaymentDate: todayIso() }, settings)
    : null;

  const save = async () => {
    setTried(true);
    if (Object.values(validate(f)).some(Boolean)) return;
    setBusy(true);
    setSaveError('');
    try {
      await onSave({
        client: f.client.trim(), status: f.status,
        closingDate: parseDate(f.closing)!, firstPaymentDate: parseDate(f.first)!,
        cost: r2(cost), depositPct: num(f.depositPct) || 0, rate, term,
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
          </div>

          <div className="form-row">
            <label className="field">Closing date
              <input className="input num" value={f.closing} onChange={(e) => onClosing(e.target.value)} placeholder="dd/mm/yyyy" inputMode="numeric" />
              {err?.closing
                ? <span className="field-error">Use day/month/year, e.g. 20/10/2026.</span>
                : <span className="field-hint">{f.status === 'Pipeline' ? 'Expected date is fine for pipeline loans.' : 'Day/month/year'}</span>}
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
            {err?.term && <span className="field-error">Enter a whole number of months.</span>}
          </label>

          <div className="preview">
            <div><span>Deposit</span><span>{preview ? money(preview.deposit) : '—'}</span></div>
            <div><span>Financed</span><span>{preview ? money(preview.financed) : '—'}</span></div>
            <div><span>Monthly payment</span><span>{preview ? money(preview.pmt) : '—'}</span></div>
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
