import { addMonths, r2, ymOf, type YM } from './format';
import type { Loan, Settings } from './types';

/** The loan fields a payment schedule needs. */
export interface CalcInput {
  cost: number;
  depositPct: number;
  rate: number;
  term: number;
  firstPaymentDate: string;
}

export interface ScheduleRow {
  n: number;
  /** ISO payment date */
  date: string;
  ym: YM;
  principal: number;
  interest: number;
  payment: number;
  balance: number;
  referral: number;
}

export interface LoanCalc {
  deposit: number;
  financed: number;
  pmt: number;
  rows: ScheduleRow[];
  orig: number;
  legal: number;
  refTotal: number;
  totals: { principal: number; interest: number; payment: number; referral: number };
  totalFees: number;
  lastDate: string;
}

/** Excel-style PMT for a fully amortizing loan (monthly rate, number of months, principal). */
export function pmt(monthlyRate: number, term: number, principal: number) {
  if (monthlyRate === 0) return principal / term;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));
}

/**
 * Referral fee per payment, as the bank pays it.
 *
 * The fee for payment n is the interest portion of payment n on a hypothetical
 * loan of the full equipment cost (not the financed amount), at the referral
 * rate (yearly, from Settings), over the same term as the real loan.
 *
 * The exact interest is computed at full precision; each payment's fee is then
 * rounded so that the running total always rounds correctly. That keeps every
 * monthly amount to the cent while the fees still add up exactly to the
 * lifetime total.
 */
export function referralSchedule(equipmentCost: number, term: number, referralRatePct: number): number[] {
  const r = referralRatePct / 1200;
  const payment = pmt(r, term, equipmentCost);
  const fees: number[] = [];
  let balance = equipmentCost;
  let cumulative = 0;
  for (let n = 1; n <= term; n++) {
    const interest = balance * r;
    balance -= payment - interest;
    const before = r2(cumulative);
    cumulative += interest;
    fees.push(r2(r2(cumulative) - before));
  }
  return fees;
}

/** Deposit in dollars and the amount left to finance. */
export function dealSplit(cost: number, depositPct: number) {
  const deposit = r2((cost * depositPct) / 100);
  return { deposit, financed: r2(cost - deposit) };
}

/** Origination and legal/closing fees depend only on the equipment cost. */
export function upfrontFees(cost: number, settings: Settings) {
  return { orig: r2((cost * settings.originationPct) / 100), legal: r2((cost * settings.legalPct) / 100) };
}

/** Everything derived from a loan's typed fields: deposit, payment, schedule, fees. */
export function calc(l: CalcInput, settings: Settings): LoanCalc {
  const { deposit, financed } = dealSplit(l.cost, l.depositPct);
  const T = l.term, r = l.rate / 1200;
  const monthly = r2(pmt(r, T, financed));
  const referral = referralSchedule(l.cost, T, settings.referralRatePct);

  let bal = financed;
  const rows: ScheduleRow[] = [];
  let tp = 0, ti = 0, tpay = 0, tref = 0;
  for (let n = 1; n <= T; n++) {
    const int = r2(bal * r);
    let pr = r2(monthly - int);
    if (n === T || pr > bal) pr = bal;
    bal = r2(bal - pr);
    const date = addMonths(l.firstPaymentDate, n - 1);
    rows.push({ n, date, ym: ymOf(date), principal: pr, interest: int, payment: r2(pr + int), balance: bal, referral: referral[n - 1] });
    tp += pr; ti += int; tpay += pr + int; tref += referral[n - 1];
  }
  const { orig, legal } = upfrontFees(l.cost, settings);
  const refTotal = r2(tref);
  return {
    deposit, financed, pmt: monthly, rows, orig, legal, refTotal,
    totals: { principal: r2(tp), interest: r2(ti), payment: r2(tpay), referral: refTotal },
    totalFees: r2(orig + legal + refTotal),
    lastDate: rows[T - 1].date,
  };
}

/** Like calc, but null while the loan is missing something the schedule needs (pipeline loans). */
export function calcLoan(l: Loan, settings: Settings): LoanCalc | null {
  if (l.cost == null || l.rate == null || l.term == null || l.firstPaymentDate == null) return null;
  return calc({ cost: l.cost, depositPct: l.depositPct, rate: l.rate, term: l.term, firstPaymentDate: l.firstPaymentDate }, settings);
}
