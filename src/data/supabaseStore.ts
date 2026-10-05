import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BillingRecord, FeeKind, Loan, LoanInput, LoanStatus, Settings } from '../lib/types';
import type { DataStore, Session } from './store';

interface LoanRow {
  id: string;
  loan_number: string;
  client: string;
  status: LoanStatus;
  closing_date: string;
  first_payment_date: string;
  equipment_cost: number | string;
  deposit_pct: number | string;
  interest_rate: number | string;
  term_months: number;
}

interface BillingRow {
  loan_id: string;
  fee_type: FeeKind;
  period: string;
  billed: boolean;
  date_billed: string | null;
  invoice_number: string;
}

interface SettingsRow {
  referral_rate_pct: number | string;
  origination_pct: number | string;
  legal_pct: number | string;
}

const LOAN_COLS = 'id, loan_number, client, status, closing_date, first_payment_date, equipment_cost, deposit_pct, interest_rate, term_months';

// Postgres numeric comes back as a string; convert once here.
const toLoan = (r: LoanRow): Loan => ({
  id: r.id, num: r.loan_number, client: r.client, status: r.status,
  closingDate: r.closing_date, firstPaymentDate: r.first_payment_date,
  cost: Number(r.equipment_cost), depositPct: Number(r.deposit_pct), rate: Number(r.interest_rate), term: r.term_months,
});

const fromLoan = (l: Partial<LoanInput>) => {
  const row: Record<string, unknown> = {};
  if (l.client !== undefined) row.client = l.client;
  if (l.status !== undefined) row.status = l.status;
  if (l.closingDate !== undefined) row.closing_date = l.closingDate;
  if (l.firstPaymentDate !== undefined) row.first_payment_date = l.firstPaymentDate;
  if (l.cost !== undefined) row.equipment_cost = l.cost;
  if (l.depositPct !== undefined) row.deposit_pct = l.depositPct;
  if (l.rate !== undefined) row.interest_rate = l.rate;
  if (l.term !== undefined) row.term_months = l.term;
  return row;
};

const toBilling = (r: BillingRow): BillingRecord => ({
  loanId: r.loan_id, kind: r.fee_type, period: r.period, billed: r.billed, dateBilled: r.date_billed, invoice: r.invoice_number,
});

const toSettings = (r: SettingsRow): Settings => ({
  referralRatePct: Number(r.referral_rate_pct), originationPct: Number(r.origination_pct), legalPct: Number(r.legal_pct),
});

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function createSupabaseStore(url: string, anonKey: string): DataStore {
  const sb: SupabaseClient = createClient(url, anonKey);
  const toSession = (email: string | undefined): Session | null => (email ? { email } : null);

  return {
    demo: false,
    async getSession() {
      const { data } = await sb.auth.getSession();
      return toSession(data.session?.user.email);
    },
    onSessionChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(toSession(s?.user.email)));
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      return error ? { error: 'That email and password don’t match an invited account.' } : {};
    },
    async signOut() {
      await sb.auth.signOut();
    },

    async listLoans() {
      return must(await sb.from('loans').select(LOAN_COLS).order('loan_number')).map((r) => toLoan(r as LoanRow));
    },
    async createLoan(input) {
      return toLoan(must(await sb.from('loans').insert(fromLoan(input)).select(LOAN_COLS).single()) as LoanRow);
    },
    async updateLoan(id, patch) {
      return toLoan(must(await sb.from('loans').update(fromLoan(patch)).eq('id', id).select(LOAN_COLS).single()) as LoanRow);
    },

    async listBilling() {
      return must(await sb.from('billing_records').select('loan_id, fee_type, period, billed, date_billed, invoice_number')).map((r) => toBilling(r as BillingRow));
    },
    async saveBilling(rec) {
      const row = { loan_id: rec.loanId, fee_type: rec.kind, period: rec.period, billed: rec.billed, date_billed: rec.dateBilled, invoice_number: rec.invoice };
      return toBilling(must(await sb.from('billing_records').upsert(row, { onConflict: 'loan_id,fee_type,period' }).select().single()) as BillingRow);
    },

    async getSettings() {
      return toSettings(must(await sb.from('settings').select('referral_rate_pct, origination_pct, legal_pct').eq('id', 1).single()) as SettingsRow);
    },
    async saveSettings(s) {
      const row = { referral_rate_pct: s.referralRatePct, origination_pct: s.originationPct, legal_pct: s.legalPct };
      return toSettings(must(await sb.from('settings').update(row).eq('id', 1).select('referral_rate_pct, origination_pct, legal_pct').single()) as SettingsRow);
    },
  };
}
