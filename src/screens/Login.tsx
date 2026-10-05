import { useState, type FormEvent, type ReactNode } from 'react';
import { authLinkError, store } from '../data';
import { Logo } from '../components/ui';

export function AuthCard({ children, foot }: { children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="login">
      <div className="login-inner">
        <div className="login-brand">
          <Logo size={40} />
          <div className="brand-text"><b>Dinio Capital</b><span>Loan Tracker</span></div>
        </div>
        {children}
        {foot && <p className="login-foot">{foot}</p>}
      </div>
    </div>
  );
}

const linkProblem = authLinkError ? 'That link has expired or was already used. Use “Forgot password?” to get a new one.' : '';

export function Login() {
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(linkProblem);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const switchTo = (m: 'signin' | 'forgot') => { setMode(m); setError(''); setSent(false); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot') {
      if (!email.trim()) { setError('Enter your email.'); return; }
      setBusy(true);
      const res = await store.requestPasswordReset(email.trim());
      setBusy(false);
      if (res.error) setError(res.error); else { setError(''); setSent(true); }
      return;
    }
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    const res = await store.signIn(email.trim(), password);
    setBusy(false);
    if (res.error) setError(res.error);
  };

  const emailField = (
    <label className="field">Email
      <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@diniocapital.com" />
    </label>
  );

  return (
    <AuthCard foot={<>
      Access is by invitation only. Ask a partner to send you an invite.
      {store.demo && <><br />Demo mode: any email and password will sign you in.</>}
    </>}>
      <form className="login-card" onSubmit={submit} noValidate>
        {mode === 'signin' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1>Sign in</h1>
              <p>Use the email you were invited with.</p>
            </div>
            {emailField}
            <label className="field">
              <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                Password
                {!store.demo && <button type="button" className="link" style={{ fontSize: 13 }} onClick={() => switchTo('forgot')}>Forgot password?</button>}
              </span>
              <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </label>
            {error && <div className="field-error" style={{ fontSize: 13 }} role="alert">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1>Reset your password</h1>
              <p>We'll email you a link to choose a new one.</p>
            </div>
            {sent ? (
              <div className="note" style={{ background: 'var(--green-wash)', color: 'var(--green-deep)' }} role="status">
                If {email.trim()} has an account, a reset link is on its way. Open it on this device.
              </div>
            ) : (
              <>
                {emailField}
                {error && <div className="field-error" style={{ fontSize: 13 }} role="alert">{error}</div>}
                <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
              </>
            )}
            <button type="button" className="link" style={{ alignSelf: 'center' }} onClick={() => switchTo('signin')}>Back to sign in</button>
          </>
        )}
      </form>
    </AuthCard>
  );
}

/** Shown after following a password reset link: the user is signed in and picks a new password. */
export function SetPassword({ email, onDone }: { email: string; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords don’t match.'); return; }
    setBusy(true);
    const res = await store.updatePassword(password);
    setBusy(false);
    if (res.error) setError(res.error); else onDone();
  };

  return (
    <AuthCard>
      <form className="login-card" onSubmit={submit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1>Choose a new password</h1>
          <p>For {email}. You'll use it to sign in from now on.</p>
        </div>
        <label className="field">New password
          <input className="input" type="password" autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          <span className="field-hint">At least 8 characters.</span>
        </label>
        <label className="field">Repeat new password
          <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error && <div className="field-error" style={{ fontSize: 13 }} role="alert">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </AuthCard>
  );
}
