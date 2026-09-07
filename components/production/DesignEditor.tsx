import { useRef, useState } from 'react';
import { Upload, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { Design, Job, newDesign } from '../../services/production/model';
import { parseDstFile } from '../../services/dstParser';
import { LocationPosition } from '../../types';
import { NumberField } from './Fields';
const palette = ['#4f46e5','#0f9b7a','#d97706','#db2777','#0284c7','#7c3aed'];
export function StitchPreview({ design }: { design: Design }) {
  const file = design.file;
  if (!file?.preview?.length) return null;
  const points = file.preview;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) { minX = Math.min(minX,p.x); minY = Math.min(minY,p.y); maxX = Math.max(maxX,p.x); maxY = Math.max(maxY,p.y); }
  const width = Math.max(1,maxX-minX), height = Math.max(1,maxY-minY), pad = Math.max(width,height)*.08;
  const paths: { color: number; d: string }[] = []; let previous = -1;
  for (const p of points) { if (p.color !== previous) { paths.push({ color: p.color, d: '' }); previous = p.color; } const path = paths[paths.length-1]; path.d += `${p.jump || !path.d ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)} `; }
  return <figure className="p-stitch"><svg role="img" aria-label={`Stitch path for ${design.designNumber}. Display colors indicate sequence, not actual thread colors.`} viewBox={`${minX-pad} ${minY-pad} ${width+2*pad} ${height+2*pad}`}><g>{paths.map((p,i) => <path key={i} d={p.d} fill="none" stroke={palette[p.color % palette.length]} strokeWidth={Math.max(width,height)/420} />)}</g></svg><figcaption>{file.widthMm.toFixed(1)} × {file.heightMm.toFixed(1)} mm · Sequence colors are illustrative{file.preview.length >= 11990 ? ' · Preview simplified' : ''}</figcaption></figure>;
}
export function DesignEditor({ job, onChange, onError, onBusy }: { job: Job; onBusy: (busy: boolean) => void; onChange: (designs: Design[]) => void; onError: (s: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null); const [busy,setBusy] = useState(false);
  const update = (index: number, patch: Partial<Design>) => onChange(job.designs.map((d,i) => i === index ? {...d,...patch} : d));
  async function importFiles(files: FileList | null) {
    if (!files?.length) return; setBusy(true); onBusy(true);
    try {
      if (files.length + job.designs.length > 100) throw new Error('Add at most 100 designs to a job.');
      const imported: Design[] = [];
      for (const file of Array.from(files)) { const meta = await parseDstFile(file); if (meta.decodedStitches <= 0) throw new Error(`${file.name} contains no sewing records.`); imported.push({ ...newDesign(job.quantity), designNumber: file.name.replace(/\.dst$/i,''), stitches: meta.stitches, colors: meta.colors, trims: meta.trimCount, file: meta }); }
      onChange(job.designs.length === 1 && !job.designs[0].stitches && !job.designs[0].designNumber ? imported : [...job.designs,...imported]);
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); onBusy(false); if(fileRef.current) fileRef.current.value = ''; }
  }
  return <section className="p-designs"><div className="p-section-head"><h2>Design</h2><button className="p-text-button" type="button" disabled={busy} onClick={() => onChange([...job.designs,newDesign(job.quantity)])}><Plus size={18}/> Add location</button></div>
    <input type="file" accept=".dst" multiple ref={fileRef} hidden onChange={e => importFiles(e.target.files)}/>
    <button className="p-button p-secondary p-full" type="button" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={18}/>{busy ? 'Reading stitch data…' : 'Import DST'}</button><p className="p-hint">No DST? Enter the stitch count below. Files are read on this device.</p>
    {job.designs.map((d,index) => <div className="p-design" key={d.id}><div className="p-section-head"><h3>{job.designs.length > 1 ? `Location ${index+1}` : 'Placement'}</h3>{job.designs.length > 1 && <button className="p-icon-button" aria-label={`Remove location ${index+1}`} onClick={() => onChange(job.designs.filter(x => x.id !== d.id))}><Trash2 size={18}/></button>}</div>
      <label className="p-field"><span className="sr-only">Placement {index+1}</span><select value={d.position} onChange={e => update(index,{position:e.target.value as LocationPosition})}>{Object.values(LocationPosition).map(p => <option key={p}>{p}</option>)}</select></label>
      {d.file && <><StitchPreview design={d}/><p className="p-hint">{d.designNumber} · {d.file.decodedStitches.toLocaleString()} sewing records · {d.file.jumpCount.toLocaleString()} jumps</p></>}
      <div className="p-grid-2"><NumberField label={`Stitches${job.designs.length>1 ? ` ${index+1}` : ''}`} value={d.stitches} min={1} step={1} onChange={stitches => update(index,{stitches})}/><NumberField label={`Color blocks${job.designs.length>1 ? ` ${index+1}` : ''}`} value={d.colors} min={1} step={1} onChange={colors => update(index,{colors})}/></div>
      {job.designs.length > 1 && <NumberField label={`Items at location ${index+1}`} value={d.quantity} min={1} max={job.quantity} step={1} onChange={quantity => update(index,{quantity})} hint="Use fewer only if part of this order receives this design."/>}
      {!!d.file?.warnings.length && <div className="p-warning"><AlertTriangle size={18}/><div>{d.file.warnings.map((w,i) => <p key={i}>{w}</p>)}</div></div>}
      <details className="p-details"><summary>Advanced details <span>(optional)</span></summary><div className="p-grid-2"><NumberField label="Trims per run" value={d.trims} step={1} onChange={trims => update(index,{trims})}/><NumberField label="Manual stops per run" value={d.manualStops} step={1} onChange={manualStops => update(index,{manualStops})}/><NumberField label="Design speed" value={Math.round(d.speedFactor*100)} suffix="%" min={1} max={100} onChange={n => update(index,{speedFactor:n/100})}/><NumberField label="Handling factor" value={Math.round(d.handlingFactor*100)} suffix="%" min={25} max={500} onChange={n => update(index,{handlingFactor:n/100})}/><NumberField label="Break risk factor" value={Math.round(d.downtimeFactor*100)} suffix="%" max={500} onChange={n => update(index,{downtimeFactor:n/100})}/></div><p className="p-hint">Trims are inferred from DST jumps. Confirm machine behavior before production.</p></details>
    </div>)}
  </section>;
}
