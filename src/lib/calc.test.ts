import { describe, expect, it } from 'vitest';
import { calc, referralSchedule } from './calc';
import { billingItems, billingSummary, breakdownText } from './billing';
import { parseDate, fmtDate, addMonths, money, ymOf } from './format';
import { SAMPLE_LOANS } from './sample';
import { DEFAULT_SETTINGS } from './types';

const clientA = SAMPLE_LOANS.find((l) => l.client === 'Client A')!;

describe('referral fee (Client A: $38,127.43 over 60 months at 0.5%)', () => {
  const fees = referralSchedule(38127.43, 60, 0.5);

  it('payment 1 referral fee is $15.89', () => {
    expect(fees[0]).toBe(15.89);
  });

  it('lifetime referral fee across all 60 payments is $486.52', () => {
    expect(fees).toHaveLength(60);
    const total = Math.round(fees.reduce((t, f) => t + f, 0) * 100) / 100;
    expect(total).toBe(486.52);
  });

  it('payment 2 referral fee is $15.62', () => {
    expect(fees[1]).toBe(15.62);
  });

  it('uses the referral rate from settings', () => {
    const doubled = referralSchedule(38127.43, 60, 1.0);
    expect(doubled[0]).toBe(31.77);
  });

  it('handles a 0% referral rate', () => {
    expect(referralSchedule(1000, 12, 0).every((f) => f === 0)).toBe(true);
  });
});

describe('loan calculation', () => {
  it('matches Client A from the brief', () => {
    const c = calc(clientA, DEFAULT_SETTINGS);
    expect(c.financed).toBe(38127.43);
    expect(c.pmt).toBe(791.28);
    expect(c.orig).toBe(381.27);
    expect(c.legal).toBe(381.27);
    expect(c.refTotal).toBe(486.52);
    expect(c.rows[0].referral).toBe(15.89);
    expect(c.rows[59].balance).toBe(0);
  });

  it('works for any whole-number term', () => {
    for (const term of [1, 12, 50]) {
      const c = calc({ ...clientA, term }, DEFAULT_SETTINGS);
      expect(c.rows).toHaveLength(term);
      expect(c.rows[term - 1].balance).toBe(0);
    }
  });

  it('applies deposit before financing', () => {
    const b = SAMPLE_LOANS.find((l) => l.client === 'Client B')!;
    const c = calc(b, DEFAULT_SETTINGS);
    expect(c.deposit).toBe(5800);
    expect(c.financed).toBe(52200);
    expect(c.orig).toBe(580);
  });
});

describe('billing', () => {
  it('October 2026 matches the brief: total $1,175.62', () => {
    const items = billingItems(SAMPLE_LOANS, ymOf('2026-10-01'), DEFAULT_SETTINGS);
    const a = items.filter((i) => i.loan.client === 'Client A');
    expect(a).toHaveLength(1);
    expect(a[0].kind).toBe('ref');
    expect(a[0].pmtN).toBe(2);
    expect(a[0].amount).toBe(15.62);
    const b = items.filter((i) => i.loan.client === 'Client B');
    expect(b.map((i) => [i.kind, i.amount])).toEqual([['orig', 580], ['legal', 580]]);
    expect(billingSummary(items, {}).total).toBe(1175.62);
    expect(breakdownText(items, ymOf('2026-10-01'))).toContain('Total to bill: $1,175.62');
  });

  it('skips dead loans and only bills referral fees for closed loans', () => {
    const items = billingItems(SAMPLE_LOANS, ymOf('2026-07-01'), DEFAULT_SETTINGS);
    expect(items).toHaveLength(0);
  });

  it('counts billed amounts', () => {
    const items = billingItems(SAMPLE_LOANS, ymOf('2026-10-01'), DEFAULT_SETTINGS);
    const orig = items.find((i) => i.kind === 'orig')!;
    const s = billingSummary(items, { [orig.key]: { loanId: orig.loan.id, kind: 'orig', period: orig.period, billed: true, dateBilled: null, invoice: '' } });
    expect(s.billed).toBe(580);
    expect(s.remaining).toBe(595.62);
  });
});

describe('formatting', () => {
  it('formats money with a dollar sign and commas', () => {
    expect(money(38127.43)).toBe('$38,127.43');
  });
  it('round-trips day/month/year dates', () => {
    expect(parseDate('20/10/2026')).toBe('2026-10-20');
    expect(fmtDate('2026-10-20')).toBe('20/10/2026');
    expect(parseDate('31/02/2026')).toBeNull();
  });
  it('adds months clamping to the end of the month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });
});
