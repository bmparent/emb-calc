import React, { useRef, useState } from 'react';
import { AlertTriangle, ChevronRight, FileCode, Loader2, Palette, Upload, X } from 'lucide-react';
import { ApparelType, DesignAnalysisResult, LocationPosition } from '../types';
import { parseDstFile } from '../services/dstParser';
import { ColorAnalyzer } from './ColorAnalyzer';

interface PendingDesign extends DesignAnalysisResult {
  id: string;
  fileName: string;
  isAnalyzing: boolean;
  assignedPosition: LocationPosition;
  error?: string;
}

interface DesignAnalyzerProps {
  onAnalysisComplete: (results: PendingDesign[]) => void;
}

export const DesignAnalyzer: React.FC<DesignAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [activeTool, setActiveTool] = useState<'dst' | 'color'>('dst');
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingDesigns, setPendingDesigns] = useState<PendingDesign[]>([]);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updatePendingDesign = (id: string, updates: Partial<PendingDesign>) => {
    setPendingDesigns((current) => current.map((design) => design.id === id ? { ...design, ...updates } : design));
  };

  const handleFiles = async (files: FileList) => {
    const allFiles = Array.from(files);
    const dstFiles = allFiles.filter((file) => file.name.toLowerCase().endsWith('.dst'));
    setUploadError(dstFiles.length === allFiles.length ? '' : 'Only Tajima .dst files were added. Other file types were skipped.');
    if (!dstFiles.length) return;

    const newPending: PendingDesign[] = dstFiles.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      stitches: 0,
      colors: 1,
      apparel: ApparelType.Tshirt,
      isAnalyzing: true,
      assignedPosition: LocationPosition.LeftChest,
    }));
    setPendingDesigns((current) => [...current, ...newPending]);

    for (let index = 0; index < dstFiles.length; index += 1) {
      const file = dstFiles[index];
      const pending = newPending[index];
      try {
        const data = await parseDstFile(file);
        updatePendingDesign(pending.id, {
          isAnalyzing: false,
          stitches: data.stitches,
          colors: data.colors,
          widthMm: data.widthMm,
          heightMm: data.heightMm,
          trims: data.trimCount,
          jumps: data.jumpCount,
          stitchDistanceMm: data.stitchDistanceMm,
          travelDistanceMm: data.travelDistanceMm,
          estimatedTopThreadM: data.estimatedTopThreadM,
          estimatedBobbinThreadM: data.estimatedBobbinThreadM,
          maxStitchMm: data.maxStitchMm,
          maxJumpMm: data.maxJumpMm,
          hasEndCommand: data.hasEndCommand,
          warnings: data.warnings,
        });
      } catch (error) {
        updatePendingDesign(pending.id, {
          isAnalyzing: false,
          error: error instanceof Error ? error.message : 'This DST file could not be read.',
        });
      }
    }
  };

  const readyDesigns = pendingDesigns.filter((design) => !design.isAnalyzing && !design.error);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:rounded-3xl">
      <div className="bg-slate-950 px-5 py-5 text-white sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black tracking-tight">Add design information</h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">Read production data from a DST or find colors from artwork and photos.</p>
          </div>
          {activeTool === 'dst' && readyDesigns.length > 0 && (
            <button type="button" onClick={() => { onAnalysisComplete(readyDesigns); setPendingDesigns([]); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-black text-white hover:bg-indigo-500">
              Add {readyDesigns.length} to calculation <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-900 p-1" role="tablist" aria-label="Design tools">
          <button type="button" role="tab" aria-selected={activeTool === 'dst'} onClick={() => setActiveTool('dst')} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black transition-colors ${activeTool === 'dst' ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}>
            <FileCode className="h-4 w-4" /> DST file
          </button>
          <button type="button" role="tab" aria-selected={activeTool === 'color'} onClick={() => setActiveTool('color')} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black transition-colors ${activeTool === 'color' ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'}`}>
            <Palette className="h-4 w-4" /> Photo / color match
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {activeTool === 'color' ? <ColorAnalyzer /> : (
          <div className="space-y-5">
            <div
              role="button"
              tabIndex={0}
              aria-label="Choose DST files"
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click(); }}
              onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(event) => { event.preventDefault(); setIsDragOver(false); handleFiles(event.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 text-center outline-none transition-colors focus-visible:ring-4 focus-visible:ring-indigo-200 ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40'}`}
            >
              <Upload className="mb-3 h-7 w-7 text-indigo-600" />
              <p className="text-sm font-black text-slate-900">Drop DST files here or choose files</p>
              <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-slate-500">Reads the full stitch stream locally: stitch and color counts, size, jumps, inferred trims, thread travel, thread-use estimate, and file-health warnings.</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".dst,application/octet-stream" className="hidden" onChange={(event) => event.target.files && handleFiles(event.target.files)} />

            {uploadError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">{uploadError}</p>}

            {pendingDesigns.map((design) => (
              <article key={design.id} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <button type="button" aria-label={`Remove ${design.fileName}`} onClick={() => setPendingDesigns((current) => current.filter((item) => item.id !== design.id))} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-start gap-3 pr-10">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    {design.isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileCode className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-slate-900">{design.fileName}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{design.isAnalyzing ? 'Reading stitch records…' : design.error ? 'Could not read this file' : `${design.stitches.toLocaleString()} stitches · ${design.colors} colors · ${design.widthMm?.toFixed(1)} × ${design.heightMm?.toFixed(1)} mm`}</p>
                  </div>
                </div>

                {design.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800">{design.error}</p>}

                {!design.isAnalyzing && !design.error && (
                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Metric label="Jumps" value={design.jumps?.toLocaleString() ?? '0'} />
                      <Metric label="Inferred trims" value={design.trims?.toLocaleString() ?? '0'} />
                      <Metric label="Top thread" value={`~${design.estimatedTopThreadM?.toFixed(1)} m`} />
                      <Metric label="Bobbin" value={`~${design.estimatedBobbinThreadM?.toFixed(1)} m`} />
                    </div>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-black text-slate-700">Placement</span>
                      <select value={design.assignedPosition} onChange={(event) => updatePendingDesign(design.id, { assignedPosition: event.target.value as LocationPosition })} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-indigo-500">
                        {Object.values(LocationPosition).map((position) => <option key={position} value={position}>{position}</option>)}
                      </select>
                    </label>
                    {!!design.warnings?.length && (
                      <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        {design.warnings.map((warning) => <p key={warning} className="flex gap-2 text-xs font-semibold leading-relaxed text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{warning}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <p className="text-[11px] font-bold text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
  </div>
);
