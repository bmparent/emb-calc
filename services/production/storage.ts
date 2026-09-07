import { emptyStore, FORMULA_VERSION, migrateLegacy, SCHEMA_VERSION, STORE_KEY, Store } from './model';
import { calculateRuntime } from '../embroideryService';
import { defaultProfile, estimateJob, priceJob } from './model';
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export function validateStore(value: unknown): Store {
  const store = structuredClone(value) as Store;
  if (!store || store.schemaVersion !== SCHEMA_VERSION || !Number.isInteger(store.revision) || store.revision < 0 || !Array.isArray(store.jobs) || !Array.isArray(store.profiles) || !store.profiles.length || typeof store.shopName !== 'string') throw new Error('This backup has an unsupported format. Your current data has not been changed.');
  if (store.jobs.length > 10000 || store.profiles.length > 100) throw new Error('This backup is too large.');
  const numericShape = (v: any, template: any) => v && Object.entries(template).every(([k, val]) => typeof val !== 'number' || (typeof v[k] === 'number' && Number.isFinite(v[k])));
  const profileShape = (p: any) => p && numericShape(p.machine, defaultProfile().machine) && numericShape(p.calibration, defaultProfile().calibration) && numericShape(p.rates, defaultProfile().rates) && typeof p.machine.apparelType === 'string';
  if (store.profiles.some(p => !profileShape(p) || typeof p.id !== 'string' || typeof p.name !== 'string')) throw new Error('A machine profile is invalid.');
  const ids = new Set<string>();
  for (const job of store.jobs) {
    if (!job || typeof job.id !== 'string' || ids.has(job.id) || typeof job.name !== 'string' || !Number.isFinite(job.quantity) || !Array.isArray(job.designs) || !job.designs.length || job.designs.length > 100 || !['draft','ready','running','paused','complete'].includes(job.status) || !job.machine || !job.calibration || !job.rates || !Number.isFinite(Date.parse(job.plannedStart))) throw new Error('A job in this backup is invalid.');
    if (!profileShape(job) || !Number.isInteger(job.revision) || !Number.isFinite(Date.parse(job.createdAt)) || !Number.isFinite(Date.parse(job.updatedAt))) throw new Error('A job record is invalid.');
    for (const d of job.designs) {
      if (!d || typeof d.id !== 'string' || typeof d.designNumber !== 'string' || typeof d.position !== 'string' || !['quantity','stitches','colors','trims','manualStops','speedFactor','handlingFactor','downtimeFactor'].every(k => Number.isFinite((d as any)[k]))) throw new Error('A design record is invalid.');
      if (d.file && (!['widthMm','heightMm','decodedStitches','jumpCount'].every(k => Number.isFinite((d.file as any)[k])) || !Array.isArray(d.file.warnings) || d.file.warnings.some(w => typeof w !== 'string') || !Array.isArray(d.file.preview) || d.file.preview.length > 50000 || d.file.preview.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isInteger(p.color)))) throw new Error('A stitch preview is invalid.');
    }
    ids.add(job.id);
    if (job.status !== 'draft') {
      const result = calculateRuntime({ apparelType: job.machine.apparelType, rpm: job.machine.rpm, heads: job.machine.heads, jobQuantity: job.quantity, locations: job.designs, startDateTime: new Date(job.plannedStart), calibration: job.calibration });
      priceJob(job.quantity, result, job.rates);
      if (!job.estimate || job.formulaVersion !== FORMULA_VERSION) throw new Error('A saved job uses an unsupported formula version.');
      Object.assign(job, estimateJob(job));
    }
    if (['running','paused','complete'].includes(job.status)) {
      if (!job.run || !Number.isFinite(Date.parse(job.run.startedAt)) || !Array.isArray(job.run.pauses)) throw new Error('A production run is invalid.');
      let last = Date.parse(job.run.startedAt);
      for (const pause of job.run.pauses) {
        if (!Number.isFinite(Date.parse(pause.startedAt)) || Date.parse(pause.startedAt) < last || (pause.endedAt && (!Number.isFinite(Date.parse(pause.endedAt)) || Date.parse(pause.endedAt) < Date.parse(pause.startedAt)))) throw new Error('A pause record is invalid.');
        last = Date.parse(pause.endedAt ?? pause.startedAt);
      }
      if (job.status === 'complete' && (!job.run.completedAt || !Number.isFinite(job.run.actualMinutes) || job.run.actualMinutes! <= 0)) throw new Error('A completed run is invalid.');
    }
  }
  if (!ids.has(store.activeId) || !store.profiles.some(p => p.id === store.defaultProfileId)) throw new Error('This backup is missing its active job or machine profile.');
  return store;
}
export function loadStore(port: StoragePort): Store {
  const raw = port.getItem(STORE_KEY);
  if (raw) return validateStore(JSON.parse(raw));
  return migrateLegacy(port.getItem('embroidery_calc_history'), emptyStore());
}
export function persistStore(port: StoragePort, store: Store): Store {
  const current = port.getItem(STORE_KEY);
  if (current && JSON.parse(current).revision !== store.revision) throw new Error('Another window changed your jobs. Export your unsaved work, then reload to use the latest version.');
  const next = { ...store, revision: store.revision + 1 };
  port.setItem(STORE_KEY, JSON.stringify(next));
  return next;
}
export function mergeBackup(current: Store, incoming: Store): Store {
  validateStore(incoming);
  const jobs = [...current.jobs];
  for (const job of incoming.jobs) {
    const existing = jobs.find(j => j.id === job.id);
    if (!existing) jobs.push(job);
    else if (JSON.stringify(existing) !== JSON.stringify(job)) jobs.push({ ...job, id: crypto.randomUUID(), name: `${job.name || 'Job'} (restored copy)` });
  }
  return { ...current, jobs, profiles: [...current.profiles, ...incoming.profiles.filter(p => !current.profiles.some(c => c.id === p.id))] };
}
