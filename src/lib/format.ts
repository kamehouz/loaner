export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

/** $38,127.43 */
export const money = (n: number) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 38,127.43 (for editable inputs that already show a $ prefix) */
export const plainAmount = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO yyyy-mm-dd → dd/mm/yyyy */
export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** dd/mm/yyyy → ISO yyyy-mm-dd, or null when invalid */
export const parseDate = (s: string | null | undefined): string | null => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((s || '').trim());
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > new Date(y, mo, 0).getDate()) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
};

/** Add k calendar months, clamping the day to the target month's length. */
export const addMonths = (iso: string, k: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const t = y * 12 + (m - 1) + k;
  const ny = Math.floor(t / 12), nm = t % 12;
  const dim = new Date(ny, nm + 1, 0).getDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, dim))}`;
};

/** A month as a single integer (year * 12 + monthIndex), for easy comparison and arithmetic. */
export type YM = number;
export const ymOf = (iso: string): YM => {
  const [y, m] = iso.split('-').map(Number);
  return y * 12 + m - 1;
};
export const ymLabel = (ym: YM) => `${MONTHS[ym % 12]} ${Math.floor(ym / 12)}`;
/** First day of the month, ISO. Used as the billing period key in the database. */
export const ymToIso = (ym: YM) => `${Math.floor(ym / 12)}-${pad((ym % 12) + 1)}-01`;

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Lenient number parse for typed inputs: "38,127.43" → 38127.43, "" → NaN */
export const num = (s: string | number | null | undefined) => parseFloat(String(s ?? '').replace(/[^0-9.]/g, ''));

export const pct = (n: number) => `${n}%`;
export const rate = (n: number) => n.toFixed(2) + '%';
