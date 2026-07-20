import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Crop,
  Database,
  ExternalLink,
  Image as ImageIcon,
  Info,
  MousePointer2,
  PackageCheck,
  Palette,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { MADEIRA_THREAD_INVENTORY } from '../constants';
import {
  BUILT_IN_PMS_REFERENCES,
  BUILT_IN_THREAD_REFERENCES,
  ImageColorSample,
  ImportedReferenceCatalog,
  PaletteColor,
  PmsReferenceEntry,
  ThreadReferenceEntry,
  extractPalette,
  parseReferenceCatalogCsv,
  rankColorMatches,
  sampleCircle,
  sampleRectangle,
} from '../services/colorAnalysis';

const CATALOG_STORAGE_KEY = 'embroidery_calc_color_catalog_v2';
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const EMPTY_IMPORT: ImportedReferenceCatalog = { pms: [], threads: [] };

type SelectionMode = 'point' | 'area';
type ThreadLineFilter = 'all' | 'polyneon' | 'classic';
type ImageSource = 'upload' | 'camera';

interface CanvasPoint {
  x: number;
  y: number;
}

interface CircleSelection extends CanvasPoint {
  type: 'circle';
  radius: number;
}

interface RectangleSelection {
  type: 'rectangle';
  start: CanvasPoint;
  end: CanvasPoint;
}

type CanvasSelection = CircleSelection | RectangleSelection;

const inventoryCodes = new Set(
  Object.values(MADEIRA_THREAD_INVENTORY)
    .flat()
    .map((value) => value.match(/\d{4}/)?.[0])
    .filter((value): value is string => Boolean(value)),
);

const dedupeReferences = <T extends { code: string; hex: string }>(
  base: T[],
  imported: T[],
  getKey: (entry: T) => string,
) => {
  const entries = new Map<string, T>();
  for (const entry of base) entries.set(getKey(entry), entry);
  for (const entry of imported) entries.set(getKey(entry), entry);
  return [...entries.values()];
};

const qualityLabel = (sample: ImageColorSample | null, source: ImageSource) => {
  if (!sample) return source === 'camera' ? 'Photo estimate' : 'Auto detected';
  if (source === 'camera' && sample.quality === 'high') return 'Medium confidence';
  return sample.quality === 'high'
    ? 'High confidence'
    : sample.quality === 'medium'
      ? 'Medium confidence'
      : 'Low confidence';
};

export const ColorAnalyzer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const catalogInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<CanvasPoint | null>(null);
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [selectedHex, setSelectedHex] = useState('');
  const [sampleDetails, setSampleDetails] = useState<ImageColorSample | null>(null);
  const [importedCatalog, setImportedCatalog] = useState<ImportedReferenceCatalog>(EMPTY_IMPORT);
  const [fileName, setFileName] = useState('');
  const [imageRevision, setImageRevision] = useState(0);
  const [imageSource, setImageSource] = useState<ImageSource>('upload');
  const [status, setStatus] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('point');
  const [selection, setSelection] = useState<CanvasSelection | null>(null);
  const [sampleRadius, setSampleRadius] = useState(12);
  const [inventoryOnly, setInventoryOnly] = useState(true);
  const [lineFilter, setLineFilter] = useState<ThreadLineFilter>('all');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
      if (stored) setImportedCatalog(JSON.parse(stored));
    } catch {
      localStorage.removeItem(CATALOG_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const imageData = imageDataRef.current;
    if (!canvas || !imageData || !fileName) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext('2d', { willReadFrequently: true })?.putImageData(imageData, 0, 0);
  }, [fileName, imageRevision]);

  const pmsCatalog = useMemo(
    () => dedupeReferences<PmsReferenceEntry>(
      BUILT_IN_PMS_REFERENCES,
      importedCatalog.pms,
      (entry) => entry.code.toLowerCase(),
    ),
    [importedCatalog.pms],
  );

  const threadCatalog = useMemo(() => {
    const importedThreads = importedCatalog.threads.map((entry) => ({ ...entry, inInventory: true }));
    return dedupeReferences<ThreadReferenceEntry>(
      BUILT_IN_THREAD_REFERENCES,
      importedThreads,
      (entry) => `${entry.line.toLowerCase()}-${entry.code}`,
    ).map((entry) => ({
      ...entry,
      inInventory: entry.inInventory || inventoryCodes.has(entry.code),
    }));
  }, [importedCatalog.threads]);

  const selectedColor = palette.find((color) => color.hex === selectedHex) ?? palette[0] ?? null;
  const filteredThreads = useMemo(() => threadCatalog.filter((thread) => {
    if (inventoryOnly && !thread.inInventory) return false;
    if (lineFilter === 'classic') return thread.line.toLowerCase().includes('classic');
    if (lineFilter === 'polyneon') return thread.line.toLowerCase().includes('polyneon');
    return true;
  }), [inventoryOnly, lineFilter, threadCatalog]);
  const threadMatches = useMemo(
    () => selectedColor ? rankColorMatches(selectedColor, filteredThreads, 5) : [],
    [filteredThreads, selectedColor],
  );
  const pmsMatches = useMemo(
    () => selectedColor ? rankColorMatches(selectedColor, pmsCatalog, 3) : [],
    [pmsCatalog, selectedColor],
  );

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>): CanvasPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rectangle = canvas.getBoundingClientRect();
    return {
      x: Math.min(canvas.width - 1, Math.max(0, (event.clientX - rectangle.left) * canvas.width / rectangle.width)),
      y: Math.min(canvas.height - 1, Math.max(0, (event.clientY - rectangle.top) * canvas.height / rectangle.height)),
    };
  };

  const applySample = (sample: ImageColorSample, nextSelection: CanvasSelection) => {
    setPalette((current) => [
      sample.color,
      ...current.filter((color) => color.hex !== sample.color.hex),
    ].slice(0, 7));
    setSelectedHex(sample.color.hex);
    setSampleDetails(sample);
    setSelection(nextSelection);
    setStatus(sample.notes[0] ?? 'Color sampled. Compare the ranked thread options below.');
  };

  const sampleAtPoint = (point: CanvasPoint) => {
    const imageData = imageDataRef.current;
    if (!imageData) return;
    const sample = sampleCircle(imageData, point.x, point.y, sampleRadius);
    if (!sample) {
      setStatus('No visible pixels were found at that point.');
      return;
    }
    applySample(sample, { type: 'circle', ...point, radius: sampleRadius });
  };

  const sampleArea = (start: CanvasPoint, end: CanvasPoint) => {
    const imageData = imageDataRef.current;
    if (!imageData) return;
    const sample = sampleRectangle(imageData, start.x, start.y, end.x, end.y);
    if (!sample) {
      setStatus('No visible pixels were found in that area.');
      return;
    }
    applySample(sample, { type: 'rectangle', start, end });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (selectionMode === 'point') {
      sampleAtPoint(point);
      return;
    }
    dragStartRef.current = point;
    setSelection({ type: 'rectangle', start: point, end: point });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (selectionMode !== 'area' || !dragStartRef.current) return;
    const point = canvasPoint(event);
    if (point) setSelection({ type: 'rectangle', start: dragStartRef.current, end: point });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (selectionMode !== 'area' || !dragStartRef.current) return;
    const end = canvasPoint(event);
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!end) return;
    if (Math.abs(end.x - start.x) < 3 || Math.abs(end.y - start.y) < 3) {
      sampleAtPoint(end);
      return;
    }
    sampleArea(start, end);
  };

  const analyzeImage = async (file: File, source: ImageSource) => {
    if (!file.type.startsWith('image/')) {
      setStatus('Choose a JPG, PNG, HEIC, or another image your browser can open.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setStatus('That image is larger than the 15 MB safety limit.');
      return;
    }

    try {
      setStatus('Reading colors locally…');
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
      const processingCanvas = document.createElement('canvas');
      processingCanvas.width = Math.max(1, Math.round(bitmap.width * scale));
      processingCanvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = processingCanvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas is unavailable in this browser.');
      context.drawImage(bitmap, 0, 0, processingCanvas.width, processingCanvas.height);
      const imageData = context.getImageData(0, 0, processingCanvas.width, processingCanvas.height);
      imageDataRef.current = imageData;
      setImageRevision((current) => current + 1);
      const colors = extractPalette(imageData);
      setPalette(colors);
      setSelectedHex(colors[0]?.hex ?? '');
      setSampleDetails(null);
      setSelection(null);
      setFileName(file.name || (source === 'camera' ? 'Camera photo' : 'Image'));
      setImageSource(source);
      setStatus(colors.length
        ? `Found ${colors.length} prominent colors. Choose one, or sample the exact area you care about.`
        : 'No visible colors could be read from this image.');
      bitmap.close();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The image could not be analyzed.');
    }
  };

  const importCatalog = async (file: File) => {
    try {
      const parsed = parseReferenceCatalogCsv(await file.text());
      setImportedCatalog(parsed);
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(parsed));
      setStatus(`Loaded ${(parsed.pms.length + parsed.threads.length).toLocaleString()} custom color references on this device.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The color catalog could not be read.');
    }
  };

  const clearImportedCatalog = () => {
    setImportedCatalog(EMPTY_IMPORT);
    localStorage.removeItem(CATALOG_STORAGE_KEY);
    setStatus('Custom references removed. Built-in approximate references are still available.');
  };

  const choosePaletteColor = (color: PaletteColor) => {
    setSelectedHex(color.hex);
    setSampleDetails(null);
    setStatus('Color selected. Review the ranked matches below.');
  };

  const selectionStyle = useMemo<React.CSSProperties | null>(() => {
    const canvas = canvasRef.current;
    if (!selection || !canvas?.width || !canvas.height) return null;
    if (selection.type === 'circle') {
      return {
        left: `${(selection.x - selection.radius) / canvas.width * 100}%`,
        top: `${(selection.y - selection.radius) / canvas.height * 100}%`,
        width: `${selection.radius * 2 / canvas.width * 100}%`,
        height: `${selection.radius * 2 / canvas.height * 100}%`,
        borderRadius: '9999px',
      };
    }
    const left = Math.min(selection.start.x, selection.end.x);
    const top = Math.min(selection.start.y, selection.end.y);
    return {
      left: `${left / canvas.width * 100}%`,
      top: `${top / canvas.height * 100}%`,
      width: `${Math.abs(selection.end.x - selection.start.x) / canvas.width * 100}%`,
      height: `${Math.abs(selection.end.y - selection.start.y) / canvas.height * 100}%`,
      borderRadius: '0.5rem',
    };
  }, [selection]);

  const importedCount = importedCatalog.pms.length + importedCatalog.threads.length;
  const sampleLabel = qualityLabel(sampleDetails, imageSource);

  return (
    <section aria-labelledby="color-tool-title" className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 id="color-tool-title" className="text-base font-black text-slate-950">Find the closest Madeira thread</h3>
            <p className="mt-1 max-w-2xl text-xs font-semibold leading-relaxed text-slate-600">Your image stays in this browser. Choose a color from the automatic palette or sample a specific spot; the closest thread options are ranked directly from that color.</p>
          </div>
        </div>

        <ol className="mt-5 grid gap-2 sm:grid-cols-3" aria-label="How color matching works">
          {[
            ['1', 'Add an image', 'Upload artwork or take a well-lit photo.'],
            ['2', 'Choose the color', 'Pick an automatic color, a point, or an area.'],
            ['3', 'Review matches', 'Compare Madeira options and verify the final choice.'],
          ].map(([number, title, description]) => (
            <li key={number} className="flex gap-3 rounded-xl border border-white bg-white/80 p-3 shadow-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">{number}</span>
              <div>
                <p className="text-xs font-black text-slate-900">{title}</p>
                <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500">{description}</p>
              </div>
            </li>
          ))}
        </ol>

        <details className="mt-3 rounded-xl border border-indigo-100 bg-white/70 px-4 py-3">
          <summary className="cursor-pointer text-xs font-black text-indigo-900">Tips for a better photo match</summary>
          <ul className="mt-3 grid gap-2 text-xs font-medium leading-relaxed text-slate-600 sm:grid-cols-2">
            <li>Use soft, neutral light and avoid flash, glare, and deep shadows.</li>
            <li>Sample a flat, evenly lit part of the color—not an edge or highlight.</li>
            <li>Use the area tool for textured fabric; it finds the dominant color inside the box.</li>
            <li>Use a physical Madeira shade card before production when color approval matters.</li>
          </ul>
        </details>
      </div>

      {!fileName ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose an artwork or photo"
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') imageInputRef.current?.click();
          }}
          onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragOver(false);
            const file = event.dataTransfer.files[0];
            if (file) analyzeImage(file, 'upload');
          }}
          onClick={() => imageInputRef.current?.click()}
          className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 text-center outline-none transition-colors focus-visible:ring-4 focus-visible:ring-indigo-200 ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'}`}
        >
          <Upload className="mb-3 h-8 w-8 text-indigo-600" />
          <span className="text-sm font-black text-slate-900">Drop artwork or a photo here</span>
          <span className="mt-1 text-xs font-medium text-slate-500">JPG, PNG, HEIC, or another browser-supported image · up to 15 MB</span>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white">
              <ImageIcon className="h-4 w-4" /> Choose image
            </span>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); cameraInputRef.current?.click(); }}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700"
            >
              <Camera className="h-4 w-4" /> Take photo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-900">{fileName}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Select the color you want the thread to reproduce.</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:border-indigo-300">
                  <ImageIcon className="h-4 w-4" /> Replace
                </button>
                <button type="button" onClick={() => cameraInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:border-indigo-300">
                  <Camera className="h-4 w-4" /> New photo
                </button>
              </div>
            </div>

            <div className="relative">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={selectionMode === 'point'
                  ? 'Uploaded image. Tap a color to sample a small area.'
                  : 'Uploaded image. Drag a box around the color to sample.'}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="block h-auto max-h-[34rem] w-full touch-none cursor-crosshair object-contain"
              />
              {selectionStyle && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute border-2 border-white bg-indigo-500/10 shadow-[0_0_0_2px_rgba(79,70,229,0.95)]"
                  style={selectionStyle}
                />
              )}
            </div>

            <div className="space-y-3 border-t border-slate-200 bg-white p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="grid flex-1 grid-cols-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="Image selection mode">
                  <button
                    type="button"
                    aria-pressed={selectionMode === 'point'}
                    onClick={() => setSelectionMode('point')}
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black ${selectionMode === 'point' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                  >
                    <MousePointer2 className="h-4 w-4" /> Sample a point
                  </button>
                  <button
                    type="button"
                    aria-pressed={selectionMode === 'area'}
                    onClick={() => setSelectionMode('area')}
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black ${selectionMode === 'area' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                  >
                    <Crop className="h-4 w-4" /> Sample an area
                  </button>
                </div>
                {selectionMode === 'point' && (
                  <label className="flex min-h-10 items-center gap-3 rounded-xl border border-slate-200 px-3">
                    <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                    <span className="text-[11px] font-black text-slate-600">Sample size</span>
                    <input
                      type="range"
                      min="2"
                      max="40"
                      value={sampleRadius}
                      onChange={(event) => setSampleRadius(Number(event.target.value))}
                      aria-label="Point sample size"
                      className="h-2 min-h-0 w-24 accent-indigo-600"
                    />
                  </label>
                )}
              </div>
              <p className="flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-slate-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                {selectionMode === 'point'
                  ? 'Tap the center of a flat color. Increase sample size for textured photos.'
                  : 'Drag a box around only the part you care about. The dominant color inside the box will be used.'}
              </p>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-900">Detected colors</h4>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Choose one to match.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">{palette.length} colors</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {palette.map((color, index) => {
                const isSelected = selectedColor?.hex === color.hex;
                return (
                  <button
                    type="button"
                    key={`${color.hex}-${index}`}
                    aria-pressed={isSelected}
                    onClick={() => choosePaletteColor(color)}
                    className={`relative flex min-h-16 items-center gap-2 rounded-xl border p-2 text-left transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'}`}
                  >
                    <span className="h-10 w-10 shrink-0 rounded-lg border border-black/10 shadow-inner" style={{ backgroundColor: color.hex }} />
                    <span className="min-w-0">
                      <span className="block font-mono text-[11px] font-black text-slate-800">{color.hex}</span>
                      <span className="mt-0.5 block text-[10px] font-bold text-slate-400">{color.share > 0 ? `${Math.round(color.share * 100)}% of image` : 'Manual sample'}</span>
                    </span>
                    {isSelected && <CheckCircle2 className="absolute right-1.5 top-1.5 h-4 w-4 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-black text-slate-700">Selection confidence</p>
              <p className={`mt-1 text-xs font-black ${sampleLabel.startsWith('Low') ? 'text-amber-700' : sampleLabel.startsWith('High') ? 'text-emerald-700' : 'text-indigo-700'}`}>{sampleLabel}</p>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">
                {sampleDetails?.notes[0] ?? (imageSource === 'camera'
                  ? 'Camera lighting and white balance can shift the result.'
                  : 'Automatic colors are taken from the most common screen colors in the image.')}
              </p>
            </div>
          </aside>
        </div>
      )}

      <input ref={imageInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) analyzeImage(file, 'upload');
        event.currentTarget.value = '';
      }} />
      <input ref={cameraInputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) analyzeImage(file, 'camera');
        event.currentTarget.value = '';
      }} />

      {status && <p role="status" aria-live="polite" className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-900">{status}</p>}

      {selectedColor && (
        <section aria-labelledby="match-results-title" className="space-y-4">
          <div className="flex flex-col gap-4 rounded-2xl bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white/20 shadow-inner" style={{ backgroundColor: selectedColor.hex }} />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-300">Selected screen color</p>
                <h3 id="match-results-title" className="mt-1 font-mono text-xl font-black">{selectedColor.hex}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-400">RGB {selectedColor.r}, {selectedColor.g}, {selectedColor.b}</p>
              </div>
            </div>
            <p className="max-w-sm text-xs font-semibold leading-relaxed text-slate-400">Madeira matches are calculated directly from this color. PMS is shown separately as an approximate reference.</p>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-4 sm:flex sm:items-center sm:justify-between">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-black text-slate-900">
                    <PackageCheck className="h-4 w-4 text-indigo-600" /> Closest Madeira threads
                  </h4>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Ranked with CIEDE2000 against Madeira electronic-card colors.</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
                  <select aria-label="Thread line" value={lineFilter} onChange={(event) => setLineFilter(event.target.value as ThreadLineFilter)} className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700">
                    <option value="all">All thread lines</option>
                    <option value="polyneon">Polyneon</option>
                    <option value="classic">Classic Rayon</option>
                  </select>
                  <button type="button" aria-pressed={inventoryOnly} onClick={() => setInventoryOnly((current) => !current)} className={`min-h-10 rounded-xl border px-3 text-xs font-black ${inventoryOnly ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                    {inventoryOnly ? 'Shop inventory' : 'All Madeira'}
                  </button>
                </div>
              </div>

              {threadMatches.length ? (
                <ol className="divide-y divide-slate-100">
                  {threadMatches.map((match, index) => (
                    <li key={`${match.entry.line}-${match.entry.code}`} className="flex items-center gap-3 p-4">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-500">{index + 1}</span>
                      <span className="h-12 w-12 shrink-0 rounded-xl border border-black/10 shadow-inner" style={{ backgroundColor: match.entry.hex }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-slate-900">Madeira {match.entry.code}</p>
                          {match.entry.inInventory && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-800">In inventory</span>}
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{match.entry.name || 'Color name unavailable'} · {match.entry.line}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-black text-slate-800">ΔE {match.deltaE.toFixed(1)}</p>
                        <p className="mt-0.5 hidden text-[10px] font-bold text-slate-400 sm:block">{match.confidence}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="p-5 text-xs font-semibold text-slate-600">No threads match the selected filters. Switch to “All Madeira” or another thread line.</div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-black text-slate-900">Approximate PMS references</h4>
              <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500">Community screen values—not an official Pantone conversion.</p>
              <ol className="mt-4 space-y-2">
                {pmsMatches.map((match, index) => (
                  <li key={match.entry.code} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="h-9 w-9 shrink-0 rounded-lg border border-black/10" style={{ backgroundColor: match.entry.hex }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900">{index === 0 ? 'Closest: ' : ''}PMS {match.entry.code}</p>
                      <p className="mt-0.5 text-[10px] font-bold text-slate-500">ΔE {match.deltaE.toFixed(1)} · {match.confidence}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] font-black text-amber-950">Use as a starting point</p>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-800">Photos, monitors, fabric, and thread sheen all shift color. Approve production with physical references.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <details className="rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <span className="flex items-center gap-2 text-xs font-black text-slate-800">
            <Database className="h-4 w-4 text-indigo-600" /> Reference library & custom catalog
          </span>
          <span className="text-[10px] font-bold text-slate-400">{BUILT_IN_THREAD_REFERENCES.length.toLocaleString()} threads · {BUILT_IN_PMS_REFERENCES.length.toLocaleString()} PMS refs</span>
        </summary>
        <div className="border-t border-slate-100 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black text-slate-900">{importedCount ? `${importedCount.toLocaleString()} custom references loaded` : 'Built-in approximate references active'}</p>
              <p className="mt-1 max-w-2xl text-[11px] font-medium leading-relaxed text-slate-500">Optional CSV columns: hex plus pms/pantone and/or madeira/thread. Add name and line if available. Imported values stay only in this browser and override matching codes.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={() => catalogInputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700">
                <Database className="h-4 w-4" /> {importedCount ? 'Replace CSV' : 'Import CSV'}
              </button>
              {importedCount > 0 && <button type="button" onClick={clearImportedCatalog} className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-600">Remove custom</button>}
              <a href="https://www.madeirausa.com/pantone-color-match/" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700">
                Madeira matcher <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <input ref={catalogInputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) importCatalog(file);
            event.currentTarget.value = '';
          }} />
        </div>
      </details>
    </section>
  );
};
