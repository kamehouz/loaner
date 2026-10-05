import { addMonths, r2, ymOf, type YM } from './format';
import type { Loan, Settings } from './types';

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

/** Everything derived from a loan's typed fields: deposit, payment, schedule, fees. */
export function calc(l: Pick<Loan, 'cost' | 'depositPct' | 'rate' | 'term' | 'firstPaymentDate'>, settings: Settings): LoanCalc {
  const deposit = r2((l.cost * l.depositPct) / 100);
  const financed = r2(l.cost - deposit);
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
  const orig = r2((l.cost * settings.originationPct) / 100);
  const legal = r2((l.cost * settings.legalPct) / 100);
  const refTotal = r2(tref);
  return {
    deposit, financed, pmt: monthly, rows, orig, legal, refTotal,
    totals: { principal: r2(tp), interest: r2(ti), payment: r2(tpay), referral: refTotal },
    totalFees: r2(orig + legal + refTotal),
    lastDate: rows[T - 1].date,
  };
}
