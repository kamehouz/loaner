import type { BillingRecord, Loan, LoanInput, Settings } from '../lib/types';

export interface Session {
  email: string;
}

/** Everything the app reads and writes. Backed by Supabase, or by the browser in demo mode. */
export interface DataStore {
  /** True when running without a backend (sample data kept in this browser). */
  demo: boolean;
  getSession(): Promise<Session | null>;
  onSessionChange(cb: (s: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<{ error?: string }>;
  signOut(): Promise<void>;

  listLoans(): Promise<Loan[]>;
  createLoan(input: LoanInput): Promise<Loan>;
  updateLoan(id: string, patch: Partial<LoanInput>): Promise<Loan>;

  listBilling(): Promise<BillingRecord[]>;
  saveBilling(rec: BillingRecord): Promise<BillingRecord>;

  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<Settings>;
}
