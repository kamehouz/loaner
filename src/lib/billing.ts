import { calc } from './calc';
import { fmtDate, money, r2, ymLabel, ymOf, ymToIso, type YM } from './format';
import { billingKey, type BillingRecord, type FeeKind, type Loan, type Settings } from './types';

export interface BillingItem {
  key: string;
  loan: Loan;
  kind: FeeKind;
  period: string;
  type: string;
  /** Label used in the copied breakdown */
  short: string;
  detail: string;
  amount: number;
  pmtN?: number;
}

/**
 * Every fee line to bill in a month, grouped by loan (sorted by loan number).
 * - Origination and legal/closing fees: once, in the month the loan closes (Dead loans excluded).
 * - Referral fee: every month a payment falls due, Closed loans only.
 */
export function billingItems(loans: Loan[], ym: YM, settings: Settings): BillingItem[] {
  const items: BillingItem[] = [];
  const period = ymToIso(ym);
  const sorted = [...loans].sort((x, y) => x.num.localeCompare(y.num));
  for (const l of sorted) {
    if (l.status === 'Dead') continue;
    const c = calc(l, settings);
    if (l.status === 'Closed') {
      const row = c.rows.find((r) => r.ym === ym);
      if (row) {
        items.push({
          key: billingKey(l.id, 'ref', period), loan: l, kind: 'ref', period, type: 'Referral fee',
          short: `Referral fee (payment #${row.n} of ${l.term})`, detail: `Payment #${row.n} of ${l.term}`, amount: row.referral, pmtN: row.n,
        });
      }
    }
    if (l.closingDate && ymOf(l.closingDate) === ym) {
      const detail = `Closes ${fmtDate(l.closingDate)}`;
      items.push({ key: billingKey(l.id, 'orig', period), loan: l, kind: 'orig', period, type: 'Origination fee', short: 'Origination fee', detail, amount: c.orig });
      items.push({ key: billingKey(l.id, 'legal', period), loan: l, kind: 'legal', period, type: 'Legal/closing fee', short: 'Legal/closing fee', detail, amount: c.legal });
    }
  }
  return items;
}

export function billingSummary(items: BillingItem[], records: Record<string, BillingRecord>) {
  const sum = (k: FeeKind) => r2(items.filter((i) => i.kind === k).reduce((t, i) => t + i.amount, 0));
  const total = r2(items.reduce((t, i) => t + i.amount, 0));
  const billed = r2(items.filter((i) => records[i.key]?.billed).reduce((t, i) => t + i.amount, 0));
  return { orig: sum('orig'), legal: sum('legal'), ref: sum('ref'), total, billed, remaining: r2(total - billed) };
}

/** Plain-text per-loan breakdown for pasting into an invoice. */
export function breakdownText(items: BillingItem[], ym: YM) {
  const lines = [`Dinio Capital — billing for ${ymLabel(ym)}`, ''];
  let cur: string | null = null;
  for (const i of items) {
    if (cur !== i.loan.id) {
      if (cur) lines.push('');
      lines.push(`${i.loan.client} (${i.loan.num})`);
      cur = i.loan.id;
    }
    lines.push(`  ${i.short}: ${money(i.amount)}`);
  }
  const total = r2(items.reduce((t, i) => t + i.amount, 0));
  lines.push('', `Total to bill: ${money(total)}`);
  return lines.join('\n');
}
