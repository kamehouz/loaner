import type { Loan } from './types';

/** Sample loans from the design brief. Used to seed demo mode. */
export const SAMPLE_LOANS: Loan[] = [
  { id: 'a', num: 'DC-1001', client: 'Client A', status: 'Closed', closingDate: '2026-08-14', firstPaymentDate: '2026-09-14', cost: 38127.43, depositPct: 0, rate: 8.99, term: 60 },
  { id: 'b', num: 'DC-1002', client: 'Client B', status: 'Pipeline', closingDate: '2026-10-20', firstPaymentDate: '2026-11-20', cost: 58000, depositPct: 10, rate: 9.49, term: 48 },
  { id: 'c', num: 'DC-1003', client: 'Client C', status: 'Pipeline', closingDate: '2026-11-16', firstPaymentDate: '2026-12-16', cost: 17500, depositPct: 0, rate: 9.99, term: 36 },
  { id: 'd', num: 'DC-1000', client: 'Client D', status: 'Dead', closingDate: '2026-07-10', firstPaymentDate: '2026-08-10', cost: 24600, depositPct: 5, rate: 9.25, term: 48 },
];
