import React, { useEffect, useState } from 'react';
import { FlaskConical, RotateCcw, Save, Settings2, X } from 'lucide-react';
import { CalibrationProfile } from '../types';

interface CalibrationModalProps {
  isOpen: boolean;
  profile: CalibrationProfile;
  onClose: () => void;
  onSave: (profile: CalibrationProfile) => void;
  onReset: () => void;
}

interface NumberFieldProps {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  suffix = 'sec',
  hint,
  min = 0,
  max,
  step = 1,
  onChange,
}) => (
  <label className="block space-y-2">
    <span className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
      {label}
      <span className="text-[9px] text-slate-300">{suffix}</span>
    </span>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
    />
    {hint && <span className="block text-[10px] font-medium leading-relaxed text-slate-400">{hint}</span>}
  </label>
);

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  profile,
  onClose,
  onSave,
  onReset,
}) => {
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    if (isOpen) setDraft(profile);
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const update = <K extends keyof CalibrationProfile>(key: K, value: CalibrationProfile[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-lg">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl md:rounded-[2.5rem]">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 p-5 md:p-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-600/20">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 md:text-2xl">Shop Calibration</h2>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Local profile · saved on this device</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close calibration" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 transition hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 md:p-8">
          <section className="mb-8 grid gap-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 md:grid-cols-2 md:p-6">
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Profile name</span>
              <input
                value={draft.name}
                onChange={(event) => update('name', event.target.value)}
                className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500"
              />
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Calculation model</span>
              <select
                value={draft.mode}
                onChange={(event) => update('mode', event.target.value as CalibrationProfile['mode'])}
                className="w-full rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500"
              >
                <option value="verified">DG verified baseline</option>
                <option value="batch-aware">Batch-aware research model</option>
              </select>
              <p className="text-[10px] leading-relaxed text-indigo-700/70">Both are calculated every time. This setting selects the primary finish estimate.</p>
            </label>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <Settings2 className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">Job setup and handling</h3>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <NumberField label="Load DST" value={draft.loadDstSeconds} onChange={(value) => update('loadDstSeconds', value)} />
                <NumberField label="Input settings" value={draft.inputSettingsSeconds} onChange={(value) => update('inputSettingsSeconds', value)} />
                <NumberField label="Mark placement" value={draft.markSecondsPerPlacement} onChange={(value) => update('markSecondsPerPlacement', value)} />
                <NumberField label="Hoop flat" value={draft.hoopShirtSecondsPerPlacement} onChange={(value) => update('hoopShirtSecondsPerPlacement', value)} />
                <NumberField label="Hoop cap / visor" value={draft.hoopHatSecondsPerPlacement} onChange={(value) => update('hoopHatSecondsPerPlacement', value)} />
                <NumberField label="Remove hoop" value={draft.removeHoopSecondsPerPlacement} onChange={(value) => update('removeHoopSecondsPerPlacement', value)} />
                <NumberField label="Fold / steam" value={draft.foldSteamSecondsPerGarment} onChange={(value) => update('foldSteamSecondsPerGarment', value)} />
                <NumberField label="Pack" value={draft.packSecondsPerGarment} onChange={(value) => update('packSecondsPerGarment', value)} />
              </div>
            </section>

            <section className="space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <Settings2 className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">Machine events and reliability</h3>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <NumberField label="Color change" value={draft.colorChangeSeconds} hint="Wilcom example range: 6-9 seconds. DG baseline: 5." onChange={(value) => update('colorChangeSeconds', value)} />
                <NumberField label="Trim" value={draft.trimSeconds} hint="Wilcom examples commonly report about 3-4 seconds." onChange={(value) => update('trimSeconds', value)} />
                <NumberField label="Manual stop" value={draft.manualStopSeconds} hint="Leave at 0 until measured for your process." onChange={(value) => update('manualStopSeconds', value)} />
                <NumberField label="Downtime / 1k stitches" value={draft.downtimeSecondsPer1000Stitches} onChange={(value) => update('downtimeSecondsPer1000Stitches', value)} />
                <NumberField label="Bobbin change" value={draft.bobbinChangeSeconds} hint="Disabled when capacity is 0." onChange={(value) => update('bobbinChangeSeconds', value)} />
                <NumberField label="Bobbin capacity" value={draft.bobbinCapacityStitches} suffix="stitches" step={100} hint="Set 0 to exclude bobbin changes." onChange={(value) => update('bobbinCapacityStitches', value)} />
                <NumberField label="Machine efficiency" value={Math.round(draft.machineEfficiency * 100)} suffix="%" min={1} max={100} onChange={(value) => update('machineEfficiency', value / 100)} />
                <NumberField label="Contingency" value={Math.round(draft.contingencyPercent * 100)} suffix="%" min={0} max={200} onChange={(value) => update('contingencyPercent', value / 100)} />
                <NumberField label="Operators" value={draft.operatorCount} suffix="people" min={1} step={1} onChange={(value) => update('operatorCount', value)} />
                <NumberField label="Operator overlap" value={Math.round(draft.operatorOverlapPercent * 100)} suffix="%" min={0} max={100} hint="Manual work completed while the machine is sewing." onChange={(value) => update('operatorOverlapPercent', value / 100)} />
              </div>
            </section>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between md:p-7">
          <button
            onClick={() => {
              onReset();
              onClose();
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:text-slate-900"
          >
            <RotateCcw className="h-4 w-4" /> Reset DG baseline
          </button>
          <button onClick={save} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
            <Save className="h-4 w-4" /> Save calibration
          </button>
        </footer>
      </div>
    </div>
  );
};
