import { SAMPLE_LOANS } from '../lib/sample';
import { billingKey, DEFAULT_SETTINGS, type BillingRecord, type Loan, type Settings } from '../lib/types';
import type { DataStore, Session } from './store';

const KEY = 'dinio-tracker-demo-v1';

interface Saved {
  session: Session | null;
  loans: Loan[];
  billing: Record<string, BillingRecord>;
  settings: Settings;
}

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.loans)) return { session: null, billing: {}, settings: DEFAULT_SETTINGS, ...s };
  } catch {
    // Storage unavailable or corrupt: start from the sample data.
  }
  return { session: null, loans: SAMPLE_LOANS, billing: {}, settings: DEFAULT_SETTINGS };
}

/**
 * Demo store: sample data saved in this browser only. Used when no Supabase
 * project is configured, so the app can be tried and developed without a backend.
 */
export function createLocalStore(): DataStore {
  let db = load();
  const listeners = new Set<(s: Session | null) => void>();
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ }
  };

  return {
    demo: true,
    async getSession() { return db.session; },
    onSessionChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    async signIn(email, password) {
      if (!email.trim() || !password) return { error: 'Enter your email and password.' };
      db.session = { email: email.trim() };
      save();
      listeners.forEach((l) => l(db.session));
      return {};
    },
    async signOut() {
      db.session = null;
      save();
      listeners.forEach((l) => l(null));
    },

    async listLoans() { return db.loans; },
    async createLoan(input) {
      const maxN = db.loans.reduce((m, l) => Math.max(m, parseInt(l.num.replace(/\D/g, '')) || 1000), 1000);
      const loan: Loan = { id: 'l' + Date.now(), num: 'DC-' + (maxN + 1), ...input };
      db = { ...db, loans: [...db.loans, loan] };
      save();
      return loan;
    },
    async updateLoan(id, patch) {
      let updated: Loan | undefined;
      db = { ...db, loans: db.loans.map((l) => (l.id === id ? (updated = { ...l, ...patch }) : l)) };
      if (!updated) throw new Error('Loan not found');
      save();
      return updated;
    },

    async listBilling() { return Object.values(db.billing); },
    async saveBilling(rec) {
      db = { ...db, billing: { ...db.billing, [billingKey(rec.loanId, rec.kind, rec.period)]: rec } };
      save();
      return rec;
    },

    async getSettings() { return db.settings; },
    async saveSettings(s) {
      db = { ...db, settings: s };
      save();
      return s;
    },
  };
}
