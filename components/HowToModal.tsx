import React from 'react';
import { Calculator, FileCode, FlaskConical, HelpCircle, Palette, Play, Target, X } from 'lucide-react';

interface HowToModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    title: '1. Define the production run',
    icon: Calculator,
    text: 'Enter the physical job quantity, active heads, planned RPM, garment type, and start time. A location quantity can be lower than the job quantity when only part of the order receives that design.',
  },
  {
    title: '2. Read DST files locally',
    icon: FileCode,
    text: 'Drop one or more Tajima DST files into the reader to populate stitches, colors, dimensions, and inferred trims. The reader also checks jumps, thread travel, long stitches, header mismatches, and missing end records. Files are never uploaded.',
  },
  {
    title: '3. Find artwork colors',
    icon: Palette,
    text: 'Upload artwork or take a photo to extract a screen palette. Click the image to sample a precise spot. For PMS and Madeira estimates, import a licensed CSV reference; always approve production color against a physical thread card.',
  },
  {
    title: '4. Add production events',
    icon: Target,
    text: 'Open Advanced production factors for trims per run, manual stops, design slowdown, handling, and break risk. These events can materially change runtime even when stitch counts match.',
  },
  {
    title: '5. Choose a calibration model',
    icon: FlaskConical,
    text: 'DG verified preserves the formula tested at Data Graphics. Batch-aware rounds quantities into whole multi-head runs and separates machine time from operator work. Both estimates are shown after every calculation.',
  },
  {
    title: '6. Calculate and track',
    icon: Play,
    text: 'Calculate production time, review partial-run and file warnings, then use Pause during production. Calculations, catalogs, and templates stay in this browser.',
  },
];

export const HowToModal: React.FC<HowToModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-xl">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl md:rounded-[3rem]">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 p-6 md:p-9">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-600/20">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 md:text-3xl">Calculator guide</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">Verified baseline + batch-aware comparison</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close guide" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 transition hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-8 overflow-y-auto p-6 md:p-10">
          <div className="space-y-7">
            {steps.map(({ title, icon: Icon, text }) => (
              <section key={title} className="flex gap-4 md:gap-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">{title}</h3>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500 md:text-sm">{text}</p>
                </div>
              </section>
            ))}
          </div>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 md:p-6">
            <h3 className="text-xs font-black uppercase tracking-[0.12em] text-amber-800">Calibration rule</h3>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-amber-900/80">
              Keep DG verified as the quoting baseline until the batch-aware model has enough completed-job comparisons. Generic industry values are starting points, not a substitute for your shop measurements.
            </p>
          </section>
        </div>

        <footer className="border-t border-slate-100 bg-white p-6 md:p-8">
          <button onClick={onClose} className="min-h-12 w-full rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
            Start calculating
          </button>
        </footer>
      </div>
    </div>
  );
};
