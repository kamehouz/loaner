import { useEffect, useState } from 'react';
import { billingItems, billingSummary, breakdownText, type BillingItem } from '../lib/billing';
import { fmtDate, money, parseDate, ymLabel, type YM } from '../lib/format';
import type { BillingRecord, Loan, Settings } from '../lib/types';
import { Check, CopyIcon, MonthPicker, PageHead } from '../components/ui';

interface Props {
  loans: Loan[];
  records: Record<string, BillingRecord>;
  settings: Settings;
  today: string;
  ym: YM;
  currentYm: YM;
  mobile: boolean;
  onMonth: (ym: YM) => void;
  onSave: (rec: BillingRecord) => void;
  onCopied: (msg: string) => void;
}

export function Billing({ loans, records, settings, today, ym, currentYm, mobile, onMonth, onSave, onCopied }: Props) {
  const items = billingItems(loans, ym, settings);
  const s = billingSummary(items, records);
  const label = ymLabel(ym);
  const nLoans = new Set(items.map((i) => i.loan.id)).size;
  const pct = s.total ? Math.round((s.billed / s.total) * 100) : 0;

  const copy = () => copyText(breakdownText(items, ym)).then(() => onCopied('Breakdown copied. Paste it into your invoice.'));

  let lastLoan: string | null = null;

  return (
    <div className="screen">
      <PageHead title="Billing" sub="What to invoice the bank for this month.">
        <MonthPicker ym={ym} currentYm={currentYm} onChange={onMonth} />
      </PageHead>

      <div className="card bill-summary">
        <div className="bill-total">
          <span className="label">Total to bill in {label}</span>
          <span className="amount">{money(s.total)}</span>
          <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Share already billed"><div style={{ width: `${pct}%` }} /></div>
          <div className="bill-split">
            <div><span>Already billed</span><span style={{ color: 'var(--green)' }}>{money(s.billed)}</span></div>
            <div><span>Still to bill</span><span>{money(s.remaining)}</span></div>
          </div>
        </div>
        <div className="bill-kinds">
          <div><span>Origination fees</span><span>{money(s.orig)}</span></div>
          <div><span>Legal/closing fees</span><span>{money(s.legal)}</span></div>
          <div><span>Referral fees</span><span>{money(s.ref)}</span></div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="section">
          <div className="section-head">
            <h2>{nLoans} {nLoans === 1 ? 'loan' : 'loans'} to bill</h2>
            <button className="btn btn-soft" onClick={copy}><CopyIcon />Copy breakdown</button>
          </div>
          {mobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((i) => <BillingLine key={i.key} item={i} rec={records[i.key]} today={today} onSave={onSave} mobile />)}
            </div>
          ) : (
            <div className="table scroll">
              <div style={{ minWidth: 940 }}>
                <div className="trow thead bill-cols">
                  <span>Client</span><span>Fee</span><span>Detail</span><span className="r">Amount</span><span style={{ textAlign: 'center' }}>Billed</span><span>Date billed</span><span>Invoice #</span>
                </div>
                {items.map((i) => {
                  const first = lastLoan !== i.loan.id;
                  lastLoan = i.loan.id;
                  return <BillingLine key={i.key} item={i} rec={records[i.key]} today={today} onSave={onSave} showClient={first} />;
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty" style={{ gap: 8 }}>
          <div className="icon green"><Check size={22} /></div>
          <div className="text">
            <b>Nothing to bill in {label}</b>
            <span>No loans close this month and no referral payments fall due. Use the arrows to check another month.</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface LineProps {
  item: BillingItem;
  rec: BillingRecord | undefined;
  today: string;
  onSave: (rec: BillingRecord) => void;
  mobile?: boolean;
  showClient?: boolean;
}

/** One fee line. Date and invoice # are edited locally and saved when the field loses focus. */
function BillingLine({ item, rec, today, onSave, mobile, showClient }: LineProps) {
  const base: BillingRecord = rec ?? { loanId: item.loan.id, kind: item.kind, period: item.period, billed: false, dateBilled: null, invoice: '' };
  const [date, setDate] = useState(rec?.dateBilled ? fmtDate(rec.dateBilled) : '');
  const [invoice, setInvoice] = useState(rec?.invoice ?? '');
  useEffect(() => { setDate(rec?.dateBilled ? fmtDate(rec.dateBilled) : ''); }, [rec?.dateBilled]);
  useEffect(() => { setInvoice(rec?.invoice ?? ''); }, [rec?.invoice]);

  const dateInvalid = date.trim() !== '' && !parseDate(date);
  const billed = base.billed;

  const toggle = (on: boolean) => onSave({ ...base, billed: on, dateBilled: on ? base.dateBilled ?? today : base.dateBilled });
  const commitDate = () => {
    if (dateInvalid) return;
    const iso = date.trim() ? parseDate(date) : null;
    if (iso !== base.dateBilled) onSave({ ...base, dateBilled: iso });
  };
  const commitInvoice = () => {
    if (invoice.trim() !== base.invoice) onSave({ ...base, invoice: invoice.trim() });
  };

  const dateInput = (
    <input className={'input' + (dateInvalid ? ' invalid' : '')} value={date} onChange={(e) => setDate(e.target.value)} onBlur={commitDate}
      placeholder="dd/mm/yyyy" inputMode="numeric" aria-label="Date billed" aria-invalid={dateInvalid} />
  );
  const invoiceInput = (
    <input className="input" value={invoice} onChange={(e) => setInvoice(e.target.value)} onBlur={commitInvoice}
      placeholder={mobile ? 'INV-0142' : 'e.g. INV-0142'} aria-label="Invoice number" />
  );

  if (mobile) {
    return (
      <div className={'bill-card' + (billed ? ' billed' : '')}>
        <div className="bill-card-head">
          <div><b>{item.loan.client}</b><small>{item.type} · {item.detail}</small></div>
          <span>{money(item.amount)}</span>
        </div>
        <label className="check-label"><input type="checkbox" className="checkbox" checked={billed} onChange={(e) => toggle(e.target.checked)} />Billed</label>
        <div className="bill-card-fields">
          <label className="field">Date billed{dateInput}</label>
          <label className="field">Invoice #{invoiceInput}</label>
        </div>
      </div>
    );
  }

  return (
    <div className={'trow tbody-row bill-cols' + (billed ? ' billed' : '')}>
      <div className="client-cell">{showClient && <><b>{item.loan.client}</b><small>{item.loan.num}</small></>}</div>
      <span>{item.type}</span>
      <span className="detail">{item.detail}</span>
      <span className="amount">{money(item.amount)}</span>
      <label className="check"><input type="checkbox" className="checkbox" checked={billed} onChange={(e) => toggle(e.target.checked)} aria-label="Billed" /></label>
      {dateInput}
      {invoiceInput}
    </div>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    try { document.execCommand('copy'); } catch { /* nothing else to try */ }
    t.remove();
  }
}
