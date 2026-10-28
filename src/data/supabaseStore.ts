import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BillingRecord, FeeKind, Loan, LoanInput, LoanStatus, Note, Settings } from '../lib/types';
import type { DataStore, Session } from './store';

interface LoanRow {
  id: string;
  loan_number: string | null;
  client: string;
  status: LoanStatus;
  closing_date: string | null;
  first_payment_date: string | null;
  equipment_cost: number | string | null;
  deposit_pct: number | string;
  interest_rate: number | string | null;
  term_months: number | null;
  rimco_contact_name: string | null;
  rimco_contact_email: string | null;
  tucoop_contact_name: string | null;
  tucoop_contact_email: string | null;
}

interface BillingRow {
  loan_id: string;
  fee_type: FeeKind;
  period: string;
  billed: boolean;
  date_billed: string | null;
  invoice_number: string;
}

interface NoteRow {
  id: string;
  loan_id: string;
  body: string;
  author: string;
  created_at: string;
}

interface SettingsRow {
  referral_rate_pct: number | string;
  origination_pct: number | string;
  legal_pct: number | string;
}

// Select every column: a column that doesn't exist yet (a migration not run) then reads as blank instead of breaking the whole list.
const LOAN_COLS = '*';

// Postgres numeric comes back as a string (and null when unknown); convert once here.
const numOrNull = (v: number | string | null) => (v == null ? null : Number(v));
const toLoan = (r: LoanRow): Loan => ({
  id: r.id, num: r.loan_number, client: r.client, status: r.status,
  closingDate: r.closing_date, firstPaymentDate: r.first_payment_date,
  cost: numOrNull(r.equipment_cost), depositPct: Number(r.deposit_pct), rate: numOrNull(r.interest_rate), term: r.term_months,
  rimcoName: r.rimco_contact_name ?? null, rimcoEmail: r.rimco_contact_email ?? null,
  tucoopName: r.tucoop_contact_name ?? null, tucoopEmail: r.tucoop_contact_email ?? null,
});

const fromLoan = (l: Partial<LoanInput>) => {
  const row: Record<string, unknown> = {};
  if (l.num !== undefined) row.loan_number = l.num;
  if (l.client !== undefined) row.client = l.client;
  if (l.status !== undefined) row.status = l.status;
  if (l.closingDate !== undefined) row.closing_date = l.closingDate;
  if (l.firstPaymentDate !== undefined) row.first_payment_date = l.firstPaymentDate;
  if (l.cost !== undefined) row.equipment_cost = l.cost;
  if (l.depositPct !== undefined) row.deposit_pct = l.depositPct;
  if (l.rate !== undefined) row.interest_rate = l.rate;
  if (l.term !== undefined) row.term_months = l.term;
  if (l.rimcoName !== undefined) row.rimco_contact_name = l.rimcoName;
  if (l.rimcoEmail !== undefined) row.rimco_contact_email = l.rimcoEmail;
  if (l.tucoopName !== undefined) row.tucoop_contact_name = l.tucoopName;
  if (l.tucoopEmail !== undefined) row.tucoop_contact_email = l.tucoopEmail;
  return row;
};

const toBilling = (r: BillingRow): BillingRecord => ({
  loanId: r.loan_id, kind: r.fee_type, period: r.period, billed: r.billed, dateBilled: r.date_billed, invoice: r.invoice_number,
});

const toNote = (r: NoteRow): Note => ({ id: r.id, loanId: r.loan_id, body: r.body, author: r.author, createdAt: r.created_at });

const toSettings = (r: SettingsRow): Settings => ({
  referralRatePct: Number(r.referral_rate_pct), originationPct: Number(r.origination_pct), legalPct: Number(r.legal_pct),
});

// The notes table comes from a separate one-time database update. Say so plainly if it is missing.
function mustNotes<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error && (res.error.code === 'PGRST205' || res.error.code === '42P01' || /schema cache/i.test(res.error.message))) {
    throw new Error('Notes need a one-time database update first.');
  }
  return must(res);
}

function must<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error?.code === '23505') throw new Error('Another loan already has that loan number.');
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
      if (!error) return {};
      if (error.code === 'email_not_confirmed') return { error: 'This account hasn’t been confirmed yet. Ask a partner to confirm it in Supabase.' };
      if (error.code === 'invalid_credentials') return { error: 'That email and password don’t match an invited account.' };
      return { error: `Couldn’t sign in: ${error.message}` };
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async requestPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (!error) return {};
      if (error.status === 429) return { error: 'Too many emails sent recently. Wait an hour and try again.' };
      return { error: `Couldn’t send the email: ${error.message}` };
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      return error ? { error: error.message } : {};
    },
    onPasswordRecovery(cb) {
      const { data } = sb.auth.onAuthStateChange((e) => { if (e === 'PASSWORD_RECOVERY') cb(); });
      return () => data.subscription.unsubscribe();
    },

    async listLoans() {
      return must(await sb.from('tracker_loans').select(LOAN_COLS).order('loan_number')).map((r) => toLoan(r as LoanRow));
    },
    async createLoan(input) {
      return toLoan(must(await sb.from('tracker_loans').insert(fromLoan(input)).select(LOAN_COLS).single()) as LoanRow);
    },
    async updateLoan(id, patch) {
      return toLoan(must(await sb.from('tracker_loans').update(fromLoan(patch)).eq('id', id).select(LOAN_COLS).single()) as LoanRow);
    },

    async listNotes() {
      return mustNotes(await sb.from('tracker_loan_notes').select('*').order('created_at', { ascending: false })).map((r) => toNote(r as NoteRow));
    },
    async addNote(loanId, body) {
      return toNote(mustNotes(await sb.from('tracker_loan_notes').insert({ loan_id: loanId, body }).select('*').single()) as NoteRow);
    },
    async deleteNote(id) {
      mustNotes(await sb.from('tracker_loan_notes').delete().eq('id', id).select('id'));
    },

    async listBilling() {
      return must(await sb.from('tracker_billing').select('loan_id, fee_type, period, billed, date_billed, invoice_number')).map((r) => toBilling(r as BillingRow));
    },
    async saveBilling(rec) {
      const row = { loan_id: rec.loanId, fee_type: rec.kind, period: rec.period, billed: rec.billed, date_billed: rec.dateBilled, invoice_number: rec.invoice };
      return toBilling(must(await sb.from('tracker_billing').upsert(row, { onConflict: 'loan_id,fee_type,period' }).select().single()) as BillingRow);
    },

    async getSettings() {
      return toSettings(must(await sb.from('tracker_settings').select('referral_rate_pct, origination_pct, legal_pct').eq('id', 1).single()) as SettingsRow);
    },
    async saveSettings(s) {
      const row = { referral_rate_pct: s.referralRatePct, origination_pct: s.originationPct, legal_pct: s.legalPct };
      return toSettings(must(await sb.from('tracker_settings').update(row).eq('id', 1).select('referral_rate_pct, origination_pct, legal_pct').single()) as SettingsRow);
    },
  };
}
