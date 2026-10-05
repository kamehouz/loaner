import { useState, type FormEvent } from 'react';
import { store } from '../data';
import { Logo } from '../components/ui';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    const res = await store.signIn(email.trim(), password);
    setBusy(false);
    if (res.error) setError(res.error);
  };

  return (
    <div className="login">
      <div className="login-inner">
        <div className="login-brand">
          <Logo size={40} />
          <div className="brand-text"><b>Dinio Capital</b><span>Loan Tracker</span></div>
        </div>
        <form className="login-card" onSubmit={submit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1>Sign in</h1>
            <p>Use the email you were invited with.</p>
          </div>
          <label className="field">Email
            <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@diniocapital.com" />
          </label>
          <label className="field">Password
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          {error && <div className="field-error" style={{ fontSize: 13 }} role="alert">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="login-foot">
          Access is by invitation only. Ask a partner to send you an invite.
          {store.demo && <><br />Demo mode: any email and password will sign you in.</>}
        </p>
      </div>
    </div>
  );
}
