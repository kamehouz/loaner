import { useState } from 'react';
import { num } from '../lib/format';
import type { Settings } from '../lib/types';
import { PageHead } from '../components/ui';

interface Props {
  settings: Settings;
  onSave: (s: Settings) => Promise<void>;
}

const FIELDS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'referralRatePct', label: 'Referral rate', hint: 'Yearly rate the bank uses to work out the monthly referral fee on the full equipment cost.' },
  { key: 'originationPct', label: 'Origination fee', hint: 'Percent of equipment cost, billed once in the month the loan closes.' },
  { key: 'legalPct', label: 'Legal/closing fee', hint: 'Percent of equipment cost, billed once in the month the loan closes.' },
];

/** Fee rates shared by all partners. Changes apply to every loan's calculations. */
export function SettingsScreen({ settings, onSave }: Props) {
  const [draft, setDraft] = useState(() => Object.fromEntries(FIELDS.map((f) => [f.key, String(settings[f.key])])) as Record<keyof Settings, string>);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const invalid = (k: keyof Settings) => draft[k].trim() === '' || !(num(draft[k]) >= 0);

  const save = async () => {
    if (FIELDS.some((f) => invalid(f.key))) { setError('Enter a percent of 0 or more for each fee.'); return; }
    setBusy(true);
    setError('');
    try {
      await onSave({ referralRatePct: num(draft.referralRatePct), originationPct: num(draft.originationPct), legalPct: num(draft.legalPct) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save settings.');
    }
    setBusy(false);
  };

  return (
    <div className="screen">
      <PageHead title="Settings" sub="Fee rates used across every loan." />
      <div className="card panel" style={{ maxWidth: 580, gap: 18, padding: 24 }}>
        {FIELDS.map((f) => (
          <label key={f.key} className="field">{f.label}
            <span className="affix" style={{ maxWidth: 200, borderColor: invalid(f.key) ? 'var(--red)' : undefined }}>
              <input value={draft[f.key]} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} inputMode="decimal" /><span>%</span>
            </span>
            <span className="field-hint">{f.hint}</span>
          </label>
        ))}
        <div className="note" style={{ background: 'var(--calc-bg)', color: 'var(--calc-ink)' }}>Changes update fees on every loan, including months already billed.</div>
        {error && <div className="error-note" role="alert">{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={save} disabled={busy}>Save settings</button>
        </div>
      </div>
    </div>
  );
}
