import { DEFAULT_CALIBRATION_PROFILE } from '../../constants';
import { ApparelType, CalibrationProfile, CalculationResult, LocationInfo, LocationPosition, LoggedJob, MachineDetails } from '../../types';
import { DstMetadata } from '../dstParser';
import { calculateRuntime } from '../embroideryService';

export const SCHEMA_VERSION = 3;
export const FORMULA_VERSION = '3.0.0';
export const STORE_KEY = 'embroidery.production.v3';
export type Status = 'draft' | 'ready' | 'running' | 'paused' | 'complete';
export interface Design extends LocationInfo { file?: DstMetadata; }
export interface Rates { blank: number; consumables: number; laborHourly: number; machineHourly: number; overheadHourly: number; setupCost: number; margin: number; taxPercent: number; }
export interface Quote { cost: number; subtotal: number; tax: number; total: number; perItem: number; profit: number; margin: number; lines: { label: string; amount: number }[]; }
export interface Run { startedAt: string; completedAt?: string; pauses: { startedAt: string; endedAt?: string; reason: string }[]; actualMinutes?: number; }
export interface Job {
  id: string; name: string; createdAt: string; updatedAt: string; revision: number;
  status: Status; quantity: number; machine: MachineDetails; calibration: CalibrationProfile;
  designs: Design[]; rates: Rates; estimate?: CalculationResult; quote?: Quote;
  formulaVersion: string; plannedStart: string; run?: Run;
}
export interface Profile { id: string; name: string; machine: MachineDetails; calibration: CalibrationProfile; rates: Rates; }
export interface Store { schemaVersion: 3; revision: number; jobs: Job[]; profiles: Profile[]; activeId: string; defaultProfileId: string; shopName: string; }
export const id = () => crypto.randomUUID();
export const starterRates: Rates = { blank: 0, consumables: 0.35, laborHourly: 25, machineHourly: 0, overheadHourly: 5, setupCost: 0, margin: 30, taxPercent: 0 };
export const newDesign = (quantity: number): Design => ({ id: id(), designNumber: '', stitches: 0, quantity, colors: 1, position: LocationPosition.LeftChest, trims: 0, manualStops: 0, speedFactor: 1, handlingFactor: 1, downtimeFactor: 1 });
export const defaultProfile = (): Profile => ({ id: 'default', name: 'My machine', machine: { heads: 1, rpm: 800, apparelType: ApparelType.Tshirt, backingInfo: 'None / Direct' }, calibration: { ...DEFAULT_CALIBRATION_PROFILE }, rates: { ...starterRates } });
export function newJob(profile: Profile): Job {
  const now = new Date().toISOString();
  return { id: id(), name: '', createdAt: now, updatedAt: now, revision: 1, status: 'draft', quantity: 1, machine: { ...profile.machine }, calibration: { ...profile.calibration }, rates: { ...profile.rates }, designs: [newDesign(1)], formulaVersion: FORMULA_VERSION, plannedStart: now };
}
export function emptyStore(): Store {
  const profile = defaultProfile(); const job = newJob(profile);
  return { schemaVersion: 3, revision: 0, jobs: [job], profiles: [profile], activeId: job.id, defaultProfileId: profile.id, shopName: '' };
}
export function priceJob(quantity: number, result: CalculationResult, rates: Rates): Quote {
  if (!Number.isInteger(quantity) || quantity < 1 || Object.values(rates).some(v => !Number.isFinite(v) || v < 0) || rates.margin >= 95 || rates.taxPercent > 100) throw new Error('Enter valid costs, a margin below 95%, and tax from 0–100%.');
  const lines = [
    { label: 'Garments', amount: quantity * rates.blank },
    { label: 'Thread & consumables', amount: quantity * rates.consumables },
    { label: 'Hands-on labor', amount: result.operatorMinutes / 60 * rates.laborHourly },
    { label: 'Machine use', amount: result.machineMinutes / 60 * rates.machineHourly },
    { label: 'Shop overhead', amount: result.netMinutes / 60 * rates.overheadHourly },
    { label: 'Additional job cost', amount: rates.setupCost },
  ];
  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const cost = round(lines.reduce((n, l) => n + l.amount, 0));
  const subtotal = round(cost / (1 - rates.margin / 100));
  const tax = round(subtotal * rates.taxPercent / 100);
  const total = round(subtotal + tax);
  if (![cost, subtotal, total].every(Number.isFinite)) throw new Error('These costs exceed the supported range.');
  return { cost, subtotal, tax, total, perItem: round(total / quantity), profit: round(subtotal - cost), margin: subtotal ? (subtotal - cost) / subtotal * 100 : 0, lines: lines.map(l => ({ ...l, amount: round(l.amount) })) };
}
export function estimateJob(job: Job): Job {
  const estimate = calculateRuntime({ apparelType: job.machine.apparelType, rpm: job.machine.rpm, heads: job.machine.heads, jobQuantity: job.quantity, locations: job.designs, calibration: job.calibration, startDateTime: new Date(job.plannedStart), mode: 'batch-aware' });
  estimate.warnings = [...new Set([...estimate.warnings, ...job.designs.flatMap(d => d.file?.warnings.map(w => `${d.designNumber || 'Design'}: ${w}`) ?? [])])];
  return { ...job, estimate, quote: priceJob(job.quantity, estimate, job.rates), formulaVersion: FORMULA_VERSION };
}
export function editJob(job: Job, update: Partial<Job>): Job {
  if (job.status === 'running' || job.status === 'paused' || job.status === 'complete') throw new Error('Duplicate this job to change its production inputs.');
  return { ...job, ...update, estimate: undefined, quote: undefined, status: 'draft', revision: job.revision + 1, updatedAt: new Date().toISOString() };
}
export function transition(job: Job, action: 'start' | 'pause' | 'resume' | 'complete', at = new Date().toISOString(), reason = 'Off-shift / excluded time'): Job {
  const time = Date.parse(at); if (time > Date.now() + 60000) throw new Error('Production events cannot be in the future.'); if (!Number.isFinite(time)) throw new Error('Enter a valid date and time.');
  const copy: Job = structuredClone(job); copy.updatedAt = at; copy.revision++;
  if (action === 'start') {
    if (job.status !== 'ready' || !job.estimate || job.formulaVersion !== FORMULA_VERSION) throw new Error('Save a current estimate before starting.');
    copy.status = 'running'; copy.run = { startedAt: at, pauses: [] }; return copy;
  }
  if (!copy.run || time < Date.parse(copy.run.startedAt)) throw new Error('The finish must follow the start.');
  const last = copy.run.pauses.at(-1);
  if (last && time < Date.parse(last.endedAt ?? last.startedAt)) throw new Error('This time precedes the latest production event.');
  if (action === 'pause' && job.status === 'running') { copy.status = 'paused'; copy.run.pauses.push({ startedAt: at, reason }); return copy; }
  if (action === 'resume' && job.status === 'paused' && last) { last.endedAt = at; copy.status = 'running'; return copy; }
  if (action === 'complete' && (job.status === 'running' || job.status === 'paused')) {
    if (last && !last.endedAt) last.endedAt = at;
    const paused = copy.run.pauses.reduce((n, p) => n + (Date.parse(p.endedAt!) - Date.parse(p.startedAt)), 0);
    const actualMinutes = (time - Date.parse(copy.run.startedAt) - paused) / 60000;
    if (actualMinutes <= 0) throw new Error('The run must contain some production time.');
    copy.run.completedAt = at; copy.run.actualMinutes = actualMinutes; copy.status = 'complete'; return copy;
  }
  throw new Error('That action is not available for this job.');
}
export function duplicateJob(job: Job): Job {
  const now = new Date().toISOString();
  return { ...structuredClone(job), id: id(), name: `${job.name || 'Untitled job'} — copy`, status: 'draft', revision: 1, createdAt: now, updatedAt: now, plannedStart: now, estimate: undefined, quote: undefined, run: undefined, designs: job.designs.map(d => ({ ...structuredClone(d), id: id() })) };
}
export const duration = (minutes: number) => { const m = Math.max(0, Math.round(minutes)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`; };
export const jobName = (job: Job) => job.name.trim() || `${job.quantity} embroidered ${job.machine.apparelType === ApparelType.Hat ? 'hats' : job.machine.apparelType === ApparelType.Polo ? 'polos' : job.machine.apparelType === ApparelType.Bag ? 'bags' : 'items'}`;
export const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

// Read-only migration: legacy keys remain untouched. Old results are not treated as
// valid estimates, and all migrated jobs require recalculation with the new engine.
export function migrateLegacy(raw: string | null, store: Store): Store {
  if (!raw) return store;
  const events: LoggedJob[] = JSON.parse(raw);
  if (!Array.isArray(events)) throw new Error('Legacy history is not a list.');
  const migrated = events.filter(e => e.eventType === 'CALC').map(e => {
    const job = newJob(store.profiles[0]);
    return { ...job, id: `legacy-${e.id}`, name: e.jobDetails.jobNumber || 'Imported legacy job', quantity: Math.max(e.jobDetails.quantity || 1, ...e.locations.map(l => l.quantity)), machine: { ...e.machineDetails }, designs: e.locations.map(l => ({ ...newDesign(l.quantity), ...l })), createdAt: e.timestamp, updatedAt: e.timestamp };
  });
  return { ...store, jobs: [...store.jobs, ...migrated] };
}
