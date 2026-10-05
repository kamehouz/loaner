export type LoanStatus = 'Pipeline' | 'Closed' | 'Dead';

export interface Loan {
  id: string;
  /** Display number, e.g. DC-1001 */
  num: string;
  client: string;
  status: LoanStatus;
  /** ISO yyyy-mm-dd */
  closingDate: string;
  /** ISO yyyy-mm-dd */
  firstPaymentDate: string;
  /** Equipment cost in dollars */
  cost: number;
  /** Deposit as a percent of equipment cost, e.g. 10 for 10% */
  depositPct: number;
  /** Yearly interest rate in percent, e.g. 8.99 */
  rate: number;
  /** Term in months */
  term: number;
}

export type LoanInput = Omit<Loan, 'id' | 'num'>;

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
