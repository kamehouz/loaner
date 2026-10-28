import type { Loan, Note } from './types';

/** Sample loans from the design brief. Used to seed demo mode. */
export const SAMPLE_LOANS: Loan[] = [
  { id: 'a', num: 'DC-1001', client: 'Client A', status: 'Closed', closingDate: '2026-08-14', firstPaymentDate: '2026-09-14', cost: 38127.43, depositPct: 0, rate: 8.99, term: 60, rimcoName: 'Alex Morgan', rimcoEmail: 'alex.morgan@example.com', tucoopName: 'Sam Rivera', tucoopEmail: null },
  { id: 'b', num: 'DC-1002', client: 'Client B', status: 'Pipeline', closingDate: '2026-10-20', firstPaymentDate: '2026-11-20', cost: 58000, depositPct: 10, rate: 9.49, term: 48, rimcoName: null, rimcoEmail: null, tucoopName: null, tucoopEmail: null },
  { id: 'c', num: 'DC-1003', client: 'Client C', status: 'Pipeline', closingDate: '2026-11-16', firstPaymentDate: '2026-12-16', cost: 17500, depositPct: 0, rate: 9.99, term: 36, rimcoName: null, rimcoEmail: null, tucoopName: null, tucoopEmail: null },
  { id: 'd', num: 'DC-1000', client: 'Client D', status: 'Dead', closingDate: '2026-07-10', firstPaymentDate: '2026-08-10', cost: 24600, depositPct: 5, rate: 9.25, term: 48, rimcoName: null, rimcoEmail: null, tucoopName: null, tucoopEmail: null },
];

/** Example notes so the demo shows how the log reads. Times are fixed so the demo looks the same every day. */
export const SAMPLE_NOTES: Note[] = [
  { id: 'n3', loanId: 'b', body: 'Turned in personal information to TuCoop', author: 'Demo partner', createdAt: '2026-10-28T16:05:00Z' },
  { id: 'n2', loanId: 'b', body: 'Waiting for customer to deliver financial info', author: 'Demo partner', createdAt: '2026-10-21T14:30:00Z' },
  { id: 'n1', loanId: 'c', body: 'In closing. Waiting for customer', author: 'Demo partner', createdAt: '2026-10-26T18:10:00Z' },
];
