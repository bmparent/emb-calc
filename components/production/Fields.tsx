import { ReactNode, useId } from 'react';
export function NumberField({ label, value, onChange, min = 0, max, step = 'any', hint, suffix }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number | 'any'; hint?: string; suffix?: string }) {
  const id = useId();
  return <label className="p-field" htmlFor={id}><span>{label}</span><div className="p-number"><input id={id} type="number" inputMode={step === 1 ? 'numeric' : 'decimal'} min={min} max={max} step={step} value={Number.isFinite(value) ? value : ''} onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))} aria-describedby={hint ? `${id}-hint` : undefined} />{suffix && <span>{suffix}</span>}</div>{hint && <small id={`${id}-hint`}>{hint}</small>}</label>;
}
export function TextField({ label, value, onChange, type = 'text', hint }: { label: string; value: string; onChange: (s: string) => void; type?: string; hint?: string }) { return <label className="p-field"><span>{label}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} />{hint && <small>{hint}</small>}</label>; }
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`p-panel ${className}`}>{children}</section>; }
export const localDateTime = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
