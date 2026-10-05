import { useEffect, useState, type ReactNode } from 'react';
import { ymLabel, type YM } from '../lib/format';
import type { LoanStatus } from '../lib/types';

const MOBILE_QUERY = '(max-width: 759px)';

export function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}

export function Logo({ size }: { size: 30 | 34 | 40 }) {
  const fs = { 30: 14, 34: 16, 40: 18 }[size];
  const radius = { 30: 8, 34: 9, 40: 10 }[size];
  return <div className="logo" style={{ width: size, height: size, fontSize: fs, borderRadius: radius }}>D</div>;
}

export function Chip({ status, large }: { status: LoanStatus; large?: boolean }) {
  return <span className={`chip chip-${status}${large ? ' chip-lg' : ''}`}>{status}</span>;
}

export function PageHead({ title, sub, children }: { title: string; sub: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="page-title"><h1>{title}</h1><p>{sub}</p></div>
      {children}
    </div>
  );
}

export const ChevronLeft = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const Check = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3 10.5V3.8C3 3.36 3.36 3 3.8 3h6.7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);

export function MonthPicker({ ym, currentYm, onChange }: { ym: YM; currentYm: YM; onChange: (ym: YM) => void }) {
  return (
    <div className="month-picker-wrap">
      {ym !== currentYm && <button className="link" onClick={() => onChange(currentYm)}>This month</button>}
      <div className="month-picker">
        <button aria-label="Previous month" onClick={() => onChange(ym - 1)}><ChevronLeft /></button>
        <div>{ymLabel(ym)}</div>
        <button aria-label="Next month" onClick={() => onChange(ym + 1)}><ChevronRight /></button>
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return <div className="toast" role="status"><Check color="#7FD3A6" />{message}</div>;
}

export function Kv({ k, v, className }: { k: ReactNode; v: ReactNode; className?: string }) {
  return <div className={'kv' + (className ? ' ' + className : '')}><span>{k}</span><span>{v}</span></div>;
}
