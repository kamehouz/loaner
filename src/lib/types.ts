export type LoanStatus = 'Pipeline' | 'Closed' | 'Dead';

/**
 * Pipeline loans are still being underwritten, so everything except the client
 * can be unknown (null) until the bank confirms it. Closed loans are always complete.
 */
export interface Loan {
  id: string;
  /** The bank's loan number, e.g. 20260412-A. Null until the bank assigns one. */
  num: string | null;
  client: string;
  status: LoanStatus;
  /** ISO yyyy-mm-dd */
  closingDate: string | null;
  /** ISO yyyy-mm-dd */
  firstPaymentDate: string | null;
  /** Equipment cost in dollars */
  cost: number | null;
  /** Deposit as a percent of equipment cost, e.g. 10 for 10%. Counts as 0 until known. */
  depositPct: number;
  /** Yearly interest rate in percent, e.g. 8.99 */
  rate: number | null;
  /** Term in months */
  term: number | null;
}

export type LoanInput = Omit<Loan, 'id'>;

/** What the bank still has to tell us about a loan, in plain words. Empty when nothing is missing. */
export function missingInfo(l: Loan): string[] {
  const missing: string[] = [];
  if (!l.num) missing.push('loan number');
  if (!l.closingDate) missing.push('closing date');
  if (!l.firstPaymentDate) missing.push('first payment date');
  if (l.cost == null) missing.push('equipment cost');
  if (l.rate == null) missing.push('interest rate');
  if (l.term == null) missing.push('term');
  return missing;
}

export type FeeKind = 'orig' | 'legal' | 'ref';

/** Billing state for one fee line in one month. */
export interface BillingRecord {
  loanId: string;
  kind: FeeKind;
  /** Billing month, ISO first-of-month (yyyy-mm-01) */
  period: string;
  billed: boolean;
  /** ISO yyyy-mm-dd, or null */
  dateBilled: string | null;
  invoice: string;
}

export interface Settings {
  /** Yearly rate (percent) used for the referral fee schedule, e.g. 0.5 */
  referralRatePct: number;
  /** Origination fee as a percent of equipment cost */
  originationPct: number;
  /** Legal/closing fee as a percent of equipment cost */
  legalPct: number;
}

export const DEFAULT_SETTINGS: Settings = { referralRatePct: 0.5, originationPct: 1, legalPct: 1 };

export const billingKey = (loanId: string, kind: FeeKind, period: string) => `${loanId}|${kind}|${period}`;
