import { useCallback, useEffect, useRef, useState } from 'react';
import { store, type Session } from './data';
import { todayIso, ymOf, type YM } from './lib/format';
import { billingKey, type BillingRecord, type Loan, type LoanInput, type Settings } from './lib/types';
import { LoanForm } from './components/LoanForm';
import { Logo, Toast, useIsMobile } from './components/ui';
import { Billing } from './screens/Billing';
import { LoanDetail } from './screens/LoanDetail';
import { Loans } from './screens/Loans';
import { Login } from './screens/Login';
import { Overview } from './screens/Overview';
import { Projection } from './screens/Projection';
import { SettingsScreen } from './screens/SettingsScreen';

type Screen = 'overview' | 'loans' | 'detail' | 'projection' | 'billing' | 'settings';
const NAV: { key: Screen; label: string; short: string }[] = [
  { key: 'overview', label: 'Overview', short: 'Overview' },
  { key: 'loans', label: 'Loans', short: 'Loans' },
  { key: 'projection', label: 'Loan Projection', short: 'Projection' },
  { key: 'billing', label: 'Billing', short: 'Billing' },
];

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    store.getSession().then(setSession);
    return store.onSessionChange(setSession);
  }, []);

  if (session === undefined) return <div className="loading">Loading…</div>;
  if (!session) return <Login />;
  return <Tracker session={session} />;
}

interface Data {
  loans: Loan[];
  records: Record<string, BillingRecord>;
  settings: Settings;
}

function Tracker({ session }: { session: Session }) {
  const mobile = useIsMobile();
  const today = todayIso();
  const currentYm = ymOf(today);

  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState('');
  const [screen, setScreen] = useState<Screen>('overview');
  const [ym, setYm] = useState<YM>(currentYm);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [projId, setProjId] = useState<string | null>(null);
  const [form, setForm] = useState<{ loan: Loan | null } | null>(null);
  const [confirmDead, setConfirmDead] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const [loans, billing, settings] = await Promise.all([store.listLoans(), store.listBilling(), store.getSettings()]);
      const records = Object.fromEntries(billing.map((r) => [billingKey(r.loanId, r.kind, r.period), r]));
      setData({ loans, records, settings });
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const flash = (msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  };
  const go = (s: Screen) => { setScreen(s); window.scrollTo(0, 0); };
  const openLoan = (id: string) => { setDetailId(id); go('detail'); };

  const replaceLoan = (loan: Loan) => setData((d) => d && { ...d, loans: d.loans.map((l) => (l.id === loan.id ? loan : l)) });
  const updateLoan = async (id: string, patch: Partial<LoanInput>) => replaceLoan(await store.updateLoan(id, patch));

  const saveLoan = async (input: LoanInput) => {
    const editing = form?.loan;
    if (editing) {
      await updateLoan(editing.id, input);
      flash('Loan updated');
    } else {
      const loan = await store.createLoan(input);
      setData((d) => d && { ...d, loans: [...d.loans, loan] });
      if (!projId) setProjId(loan.id);
      flash(`${loan.client} added`);
    }
    setForm(null);
  };

  const saveBilling = async (rec: BillingRecord) => {
    const key = billingKey(rec.loanId, rec.kind, rec.period);
    const prev = data?.records[key];
    // Optimistic: billed rows turn green straight away; roll back if the save fails.
    setData((d) => d && { ...d, records: { ...d.records, [key]: rec } });
    try {
      await store.saveBilling(rec);
    } catch (e) {
      setData((d) => {
        if (!d) return d;
        const records = { ...d.records };
        if (prev) records[key] = prev; else delete records[key];
        return { ...d, records };
      });
      flash(`Couldn't save: ${e instanceof Error ? e.message : e}`);
    }
  };

  const saveSettings = async (s: Settings) => {
    const settings = await store.saveSettings(s);
    setData((d) => d && { ...d, settings });
    flash('Settings saved');
  };

  const navScreen = screen === 'detail' ? 'loans' : screen;
  const loans = data?.loans ?? [];
  const detailLoan = loans.find((l) => l.id === detailId);
  const projLoan = loans.find((l) => l.id === projId) ?? loans.find((l) => l.status !== 'Dead') ?? loans[0];

  let body;
  if (loadError) {
    body = (
      <div className="error-note" role="alert">
        Couldn't load your data: {loadError}{' '}
        <button className="link" onClick={load}>Try again</button>
      </div>
    );
  } else if (!data) {
    body = <div className="loading">Loading…</div>;
  } else if (screen === 'overview') {
    body = <Overview loans={loans} settings={data.settings} today={today} ym={ym} currentYm={currentYm} onMonth={setYm} onOpenLoan={openLoan} mobile={mobile} />;
  } else if (screen === 'loans' || (screen === 'detail' && !detailLoan)) {
    body = <Loans loans={loans} settings={data.settings} mobile={mobile} onAdd={() => setForm({ loan: null })} onOpenLoan={openLoan} />;
  } else if (screen === 'detail' && detailLoan) {
    body = (
      <LoanDetail
        loan={detailLoan} settings={data.settings} today={today}
        onBack={() => go('loans')}
        onProjection={() => { setProjId(detailLoan.id); go('projection'); }}
        onEdit={() => setForm({ loan: detailLoan })}
        onMarkDead={() => setConfirmDead(true)}
        onRestore={() => updateLoan(detailLoan.id, { status: 'Pipeline' }).then(() => flash(`${detailLoan.client} moved back to pipeline`), (e) => flash(`Couldn't save: ${e.message}`))}
      />
    );
  } else if (screen === 'projection') {
    body = <Projection loans={loans} loan={projLoan} settings={data.settings} today={today} onSelect={setProjId} onAdd={() => setForm({ loan: null })} />;
  } else if (screen === 'billing') {
    body = <Billing loans={loans} records={data.records} settings={data.settings} today={today} ym={ym} currentYm={currentYm} mobile={mobile} onMonth={setYm} onSave={saveBilling} onCopied={flash} />;
  } else {
    body = <SettingsScreen settings={data.settings} onSave={saveSettings} />;
  }

  return (
    <div className={mobile ? 'mobile' : undefined}>
      {store.demo && <div className="demo-banner">Demo mode: sample data saved in this browser only. Connect Supabase to share data between partners.</div>}
      <div className="shell">
        {!mobile && (
          <aside className="sidebar">
            <div className="brand"><Logo size={34} /><div className="brand-text"><b>Dinio Capital</b><span>Loan Tracker</span></div></div>
            <nav className="side-nav">
              {NAV.map((n) => <button key={n.key} className={navScreen === n.key ? 'on' : ''} aria-current={navScreen === n.key ? 'page' : undefined} onClick={() => go(n.key)}>{n.label}</button>)}
            </nav>
            <div className="side-foot">
              <span className="who" title={session.email}>{session.email}</span>
              <button className="link" onClick={() => go('settings')} style={screen === 'settings' ? { fontWeight: 600 } : undefined}>Settings</button>
              <button className="link" onClick={() => store.signOut()}>Sign out</button>
            </div>
          </aside>
        )}
        <div className="content">
          {mobile && (
            <header className="topbar">
              <Logo size={30} />
              <b>Dinio Capital</b>
              <button className="link" onClick={() => go('settings')}>Settings</button>
              <button className="link" onClick={() => store.signOut()}>Sign out</button>
            </header>
          )}
          <main className="main">{body}</main>
        </div>
        {mobile && (
          <nav className="tabbar">
            {NAV.map((n) => <button key={n.key} className={navScreen === n.key ? 'on' : ''} aria-current={navScreen === n.key ? 'page' : undefined} onClick={() => go(n.key)}><i />{n.short}</button>)}
          </nav>
        )}
      </div>

      {form && data && <LoanForm loan={form.loan} settings={data.settings} onClose={() => setForm(null)} onSave={saveLoan} />}

      {confirmDead && detailLoan && (
        <div className="overlay">
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dead-title">
            <h2 id="dead-title">Mark {detailLoan.client} as dead?</h2>
            <p>The loan stays in your records but is left out of billing and totals. You can move it back to pipeline later.</p>
            <div className="dialog-actions">
              <button className="btn btn-secondary" style={{ fontSize: 14.5, padding: '0 18px' }} onClick={() => setConfirmDead(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => {
                setConfirmDead(false);
                updateLoan(detailLoan.id, { status: 'Dead' }).then(() => flash(`${detailLoan.client} marked dead`), (e) => flash(`Couldn't save: ${e.message}`));
              }}>Mark as dead</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}
