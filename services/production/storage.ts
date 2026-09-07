import {
  emptyStore,
  FORMULA_VERSION,
  migrateLegacy,
  SCHEMA_VERSION,
  STORE_KEY,
  Store,
  defaultProfile,
  estimateJob,
  newJob,
} from "./model";
import { ApparelType, LocationPosition } from "../../types";
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const invalid = (message: string): never => {
  throw new Error(message);
};
const date = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const text = (value: unknown) =>
  typeof value === "string" && value.length <= 10000;
const unique = (values: string[]) =>
  values.every((v) => typeof v === "string" && v.length > 0) &&
  new Set(values).size === values.length;

export function validateStore(value: unknown): Store {
  const store = structuredClone(value) as Store;
  if (
    !store ||
    store.schemaVersion !== SCHEMA_VERSION ||
    !Number.isSafeInteger(store.revision) ||
    store.revision < 0 ||
    !Array.isArray(store.jobs) ||
    !Array.isArray(store.profiles) ||
    !store.profiles.length ||
    !text(store.shopName)
  )
    invalid(
      "This backup has an unsupported format. Current data has not changed.",
    );
  if (store.jobs.length > 10000 || store.profiles.length > 100)
    invalid("This backup is too large.");
  const numericShape = (v: any, template: any) =>
    v &&
    Object.entries(template).every(
      ([k, val]) =>
        typeof val !== "number" ||
        (typeof v[k] === "number" && Number.isFinite(v[k])),
    );
  const profileShape = (p: any) =>
    p &&
    numericShape(p.machine, defaultProfile().machine) &&
    numericShape(p.calibration, defaultProfile().calibration) &&
    numericShape(p.rates, defaultProfile().rates) &&
    Object.values(ApparelType).includes(p.machine.apparelType) &&
    text(p.machine.backingInfo) &&
    ["verified", "batch-aware"].includes(p.calibration.mode);
  for (const p of store.profiles) {
    if (!profileShape(p) || !text(p.id) || !text(p.name))
      invalid("A machine profile is invalid.");
    const probe = newJob(p);
    probe.designs[0].stitches = 1000;
    estimateJob(probe);
  }
  if (!unique(store.profiles.map((p) => p.id)))
    invalid("Machine profile IDs must be unique.");
  for (const job of store.jobs) {
    if (
      !job ||
      !text(job.id) ||
      !text(job.name) ||
      !Number.isFinite(job.quantity) ||
      !Array.isArray(job.designs) ||
      !job.designs.length ||
      job.designs.length > 100 ||
      !["draft", "ready", "running", "paused", "complete"].includes(
        job.status,
      ) ||
      !date(job.plannedStart)
    )
      invalid("A job in this backup is invalid.");
    if (
      !profileShape(job) ||
      !Number.isSafeInteger(job.revision) ||
      job.revision < 1 ||
      !date(job.createdAt) ||
      !date(job.updatedAt)
    )
      invalid("A job record is invalid.");
    for (const d of job.designs) {
      if (
        !d ||
        !text(d.id) ||
        !text(d.designNumber) ||
        !Object.values(LocationPosition).includes(d.position) ||
        ![
          "quantity",
          "stitches",
          "colors",
          "trims",
          "manualStops",
          "speedFactor",
          "handlingFactor",
          "downtimeFactor",
        ].every((k) => Number.isFinite((d as any)[k]))
      )
        invalid("A design record is invalid.");
      if (
        d.file &&
        (!["widthMm", "heightMm", "decodedStitches", "jumpCount"].every(
          (k) => Number.isFinite((d.file as any)[k]) && (d.file as any)[k] >= 0,
        ) ||
          !Array.isArray(d.file.warnings) ||
          d.file.warnings.some((w) => !text(w)) ||
          !Array.isArray(d.file.preview) ||
          d.file.preview.length > 50000 ||
          d.file.preview.some(
            (p) =>
              !p ||
              !Number.isFinite(p.x) ||
              !Number.isFinite(p.y) ||
              !Number.isInteger(p.color) ||
              p.color < 0 ||
              typeof p.jump !== "boolean",
          ))
      )
        invalid("A stitch preview is invalid.");
    }
    if (!unique(job.designs.map((d) => d.id)))
      invalid("Design IDs must be unique within a job.");
    const locked = ["running", "paused", "complete"].includes(job.status);
    if (job.status === "draft") {
      // Incomplete numeric input remains a recoverable draft, never a valid quote.
      delete job.estimate;
      delete job.quote;
      delete job.run;
    } else {
      if (!["3.0.0", FORMULA_VERSION].includes(job.formulaVersion))
        invalid("A saved job uses an unsupported formula version.");
      if (!locked && job.formulaVersion !== FORMULA_VERSION) {
        job.status = "draft";
        delete job.estimate;
        delete job.quote;
        delete job.run;
      } else {
        // Recompute source inputs, preserving the formula of existing production.
        Object.assign(
          job,
          estimateJob(job, job.formulaVersion as "3.0.0" | "3.1.0"),
        );
      }
    }
    if (locked) {
      const run = job.run;
      if (
        !run ||
        !date(run.startedAt) ||
        !Array.isArray(run.pauses) ||
        run.pauses.length > 10000
      )
        invalid("A production run is invalid.");
      let last = Date.parse(run!.startedAt),
        paused = 0,
        open = 0;
      for (const [i, pause] of run!.pauses.entries()) {
        if (
          !pause ||
          !date(pause.startedAt) ||
          !text(pause.reason) ||
          Date.parse(pause.startedAt) < last
        )
          invalid("A pause record is invalid.");
        if (pause.endedAt !== undefined) {
          if (
            !date(pause.endedAt) ||
            Date.parse(pause.endedAt) < Date.parse(pause.startedAt)
          )
            invalid("A pause end is invalid.");
          paused += Date.parse(pause.endedAt) - Date.parse(pause.startedAt);
        } else {
          open++;
          if (i !== run!.pauses.length - 1)
            invalid("Only the last pause can be open.");
        }
        last = Date.parse(pause.endedAt ?? pause.startedAt);
      }
      if (open !== (job.status === "paused" ? 1 : 0))
        invalid("Production status and pauses disagree.");
      if (job.status === "complete") {
        if (!date(run!.completedAt) || Date.parse(run!.completedAt!) < last)
          invalid("A completion time is invalid.");
        const actual =
          (Date.parse(run!.completedAt!) -
            Date.parse(run!.startedAt) -
            paused) /
          60000;
        if (
          actual <= 0 ||
          !Number.isFinite(run!.actualMinutes) ||
          Math.abs(actual - run!.actualMinutes!) > 1e-7
        )
          invalid("Actual production time disagrees with event history.");
      } else if (
        run!.completedAt !== undefined ||
        run!.actualMinutes !== undefined
      )
        invalid("An unfinished run contains completion data.");
      if (
        last > Date.now() + 60000 ||
        (run!.completedAt && Date.parse(run!.completedAt) > Date.now() + 60000)
      )
        invalid("Production events cannot be in the future.");
    } else if (job.run) invalid("An unstarted job contains a production run.");
  }
  if (!unique(store.jobs.map((j) => j.id))) invalid("Job IDs must be unique.");
  if (
    !store.jobs.some((j) => j.id === store.activeId) ||
    !store.profiles.some((p) => p.id === store.defaultProfileId)
  )
    invalid("This backup is missing its active job or machine profile.");
  return store;
}
export function loadStore(port: StoragePort): Store {
  const raw = port.getItem(STORE_KEY);
  if (raw) return validateStore(JSON.parse(raw));
  return validateStore(
    migrateLegacy(port.getItem("embroidery_calc_history"), emptyStore()),
  );
}
export function persistStore(port: StoragePort, store: Store): Store {
  const current = port.getItem(STORE_KEY);
  if ((current ? JSON.parse(current).revision : 0) !== store.revision)
    throw new Error(
      "Another window changed your jobs. Export your unsaved work, then reload to use the latest version.",
    );
  validateStore(store); // Retain an in-session draft estimate in B.
  const next = { ...store, revision: store.revision + 1 },
    raw = JSON.stringify(next);
  if (new TextEncoder().encode(raw).length > 25 * 1024 * 1024)
    invalid("Saved data exceeds 25 MB. Export your work before continuing.");
  port.setItem(STORE_KEY, raw);
  return next;
}
export function mergeBackup(current: Store, incoming: Store): Store {
  const safe = validateStore(incoming),
    jobs = [...current.jobs],
    profiles = [...current.profiles];
  for (const job of safe.jobs) {
    const existing = jobs.find((j) => j.id === job.id);
    if (!existing) jobs.push(job);
    else if (JSON.stringify(existing) !== JSON.stringify(job))
      jobs.push({
        ...job,
        id: crypto.randomUUID(),
        name: (job.name || "Job") + " (restored copy)",
      });
  }
  for (const profile of safe.profiles) {
    const existing = profiles.find((p) => p.id === profile.id);
    if (!existing) profiles.push(profile);
    else if (JSON.stringify(existing) !== JSON.stringify(profile))
      profiles.push({
        ...profile,
        id: crypto.randomUUID(),
        name: profile.name + " (restored copy)",
      });
  }
  const merged = { ...current, jobs, profiles };
  validateStore(merged);
  return merged;
}
