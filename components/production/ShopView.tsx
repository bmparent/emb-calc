import { useState } from "react";
import { Plus, Download, Upload } from "lucide-react";
import {
  Store,
  Profile,
  newJob,
  estimateJob,
  id,
} from "../../services/production/model";
import { CalibrationProfile } from "../../types";
import { NumberField, TextField } from "./Fields";
const timingFields: [keyof CalibrationProfile, string][] = [
  ["loadDstSeconds", "Load design (seconds)"],
  ["inputSettingsSeconds", "Input settings (seconds)"],
  ["markSecondsPerPlacement", "Mark placement (seconds)"],
  ["hoopShirtSecondsPerPlacement", "Hoop flat (seconds)"],
  ["hoopHatSecondsPerPlacement", "Hoop hat / visor (seconds)"],
  ["removeHoopSecondsPerPlacement", "Remove hoop (seconds)"],
  ["foldSteamSecondsPerGarment", "Fold / steam (seconds)"],
  ["packSecondsPerGarment", "Pack (seconds)"],
  ["colorChangeSeconds", "Color change (seconds)"],
  ["trimSeconds", "Trim (seconds)"],
  ["manualStopSeconds", "Manual stop (seconds)"],
  [
    "downtimeSecondsPer1000Stitches",
    "Break downtime / 1,000 stitches (seconds)",
  ],
  ["bobbinChangeSeconds", "Bobbin change (seconds)"],
  ["bobbinCapacityStitches", "Bobbin capacity (stitches)"],
];
export function ShopView({
  store,
  onSave,
  onBackup,
  onRestore,
  onError,
}: {
  store: Store;
  onSave: (s: Store) => Promise<boolean>;
  onBackup: () => void;
  onRestore: () => void;
  onError: (s: string) => void;
}) {
  const [profile, setProfile] = useState<Profile>(() =>
    structuredClone(
      store.profiles.find((p) => p.id === store.defaultProfileId)!,
    ),
  );
  const [shopName, setShopName] = useState(store.shopName);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const original = store.profiles.find((p) => p.id === profile.id);
  const dirty =
    shopName !== store.shopName ||
    JSON.stringify(profile) !== JSON.stringify(original);
  const cal = (key: keyof CalibrationProfile, n: number) =>
    setProfile({
      ...profile,
      calibration: { ...profile.calibration, [key]: n },
    });
  async function save() {
    setSaving(true);
    try {
      const example = newJob(profile);
      example.designs[0].stitches = 1000;
      estimateJob(example);
      if (!profile.name.trim()) throw new Error("Name this machine profile.");
      const profiles = store.profiles.some((p) => p.id === profile.id)
        ? store.profiles.map((p) => (p.id === profile.id ? profile : p))
        : [...store.profiles, profile];
      const success = await onSave({
        ...store,
        shopName,
        profiles,
        defaultProfileId: profile.id,
      });
      if (success)
        setNotice("Shop settings saved. New jobs will use this profile.");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const completed = store.jobs.filter(
    (j) =>
      j.status === "complete" &&
      j.run?.actualMinutes &&
      j.estimate &&
      j.machine.heads === profile.machine.heads &&
      j.machine.rpm === profile.machine.rpm &&
      j.machine.apparelType === profile.machine.apparelType,
  );
  const ratios = completed
    .map((j) => j.run!.actualMinutes! / j.estimate!.netMinutes)
    .sort((a, b) => a - b);
  const median = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0;
  return (
    <>
      <fieldset disabled={saving} className="p-workflow-fields">
        <h1>Your shop, your defaults</h1>
        <p className="p-intro">
          Set this once. Every new estimate starts with your machine and rates.
        </p>
        <TextField
          label="Shop name on quotes"
          value={shopName}
          onChange={setShopName}
        />
        <div className="p-section-head">
          <label className="p-field p-grow">
            <span>Machine profile</span>
            <select
              disabled={dirty}
              value={profile.id}
              onChange={(e) =>
                setProfile(
                  structuredClone(
                    store.profiles.find((p) => p.id === e.target.value)!,
                  ),
                )
              }
            >
              {!store.profiles.some((p) => p.id === profile.id) && (
                <option value={profile.id}>New machine</option>
              )}
              {store.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="p-icon-button"
            disabled={dirty}
            aria-label="Add machine profile"
            onClick={() =>
              setProfile({
                ...structuredClone(profile),
                id: id(),
                name: "New machine",
              })
            }
          >
            <Plus />
          </button>
        </div>
        <TextField
          label="Profile name"
          value={profile.name}
          onChange={(name) => setProfile({ ...profile, name })}
        />
        <div className="p-grid-2">
          <NumberField
            label="Usable heads"
            value={profile.machine.heads}
            min={1}
            step={1}
            onChange={(heads) =>
              setProfile({ ...profile, machine: { ...profile.machine, heads } })
            }
          />
          <NumberField
            label="Machine RPM"
            value={profile.machine.rpm}
            min={1}
            step={1}
            onChange={(rpm) =>
              setProfile({ ...profile, machine: { ...profile.machine, rpm } })
            }
          />
          <NumberField
            label="Operators"
            value={profile.calibration.operatorCount}
            min={1}
            step={1}
            onChange={(n) => cal("operatorCount", n)}
          />
          <NumberField
            label="Machine efficiency"
            suffix="%"
            value={Math.round(profile.calibration.machineEfficiency * 100)}
            min={1}
            max={100}
            onChange={(n) => cal("machineEfficiency", n / 100)}
          />
          <NumberField
            label="Contingency"
            suffix="%"
            value={Math.round(profile.calibration.contingencyPercent * 100)}
            max={200}
            onChange={(n) => cal("contingencyPercent", n / 100)}
          />
          <NumberField
            label="Handling overlap"
            suffix="%"
            value={Math.round(profile.calibration.operatorOverlapPercent * 100)}
            max={100}
            onChange={(n) => cal("operatorOverlapPercent", n / 100)}
          />
        </div>
        <p className="p-hint">
          Overlap assumes spare hoops and an operator able to prepare the next
          batch while sewing. First loading, final unloading, setup, and
          finishing remain included.
        </p>
        <details className="p-details">
          <summary>Measured operation times</summary>
          <div className="p-grid-2">
            {timingFields.map(([key, label]) => (
              <NumberField
                key={key}
                label={label}
                value={Number(profile.calibration[key])}
                onChange={(n) => cal(key, n)}
              />
            ))}
          </div>
          <p className="p-hint">
            DG defaults are a starting point. A bobbin capacity of zero excludes
            bobbin changes.
          </p>
        </details>
        <details className="p-details">
          <summary>Default quote rates</summary>
          <div className="p-grid-2">
            {(Object.keys(profile.rates) as (keyof Profile["rates"])[]).map(
              (key) => (
                <NumberField
                  key={key}
                  label={
                    {
                      blank: "Blank / item",
                      consumables: "Consumables / item",
                      laborHourly: "Labor / hour",
                      machineHourly: "Machine / hour",
                      overheadHourly: "Overhead / hour",
                      setupCost: "Additional job cost",
                      margin: "Target margin %",
                      taxPercent: "Tax %",
                    }[key]
                  }
                  value={profile.rates[key]}
                  onChange={(n) =>
                    setProfile({
                      ...profile,
                      rates: { ...profile.rates, [key]: n },
                    })
                  }
                />
              ),
            )}
          </div>
        </details>
        <button className="p-button p-primary p-full" onClick={save}>
          Save shop settings
        </button>
        {notice && !dirty && (
          <p className="p-success" role="status">
            {notice}
          </p>
        )}
        {dirty && (
          <p className="p-hint" role="status">
            Shop edits are not saved yet. They stay here while you use other
            tabs. Save before switching profiles or restarting.
          </p>
        )}
        {dirty && (
          <button
            className="p-text-button"
            onClick={() => {
              setProfile(
                structuredClone(
                  store.profiles.find((p) => p.id === store.defaultProfileId)!,
                ),
              );
              setShopName(store.shopName);
            }}
          >
            Discard shop edits
          </button>
        )}
      </fieldset>
      <section className="p-panel">
        <h2>Learn from completed jobs</h2>
        <p>
          {completed.length} completed {completed.length === 1 ? "job" : "jobs"}{" "}
          with matching garment, heads, and RPM.
        </p>
        {ratios.length ? (
          <p className="p-hint">
            Median actual time was {Math.round(median * 100)}% of the estimate.{" "}
            {ratios.length < 5
              ? "Record at least five comparable jobs before adjusting settings."
              : "Review measured handling and downtime before changing efficiency or contingency."}{" "}
            This comparison does not automatically change your settings.
          </p>
        ) : (
          <p className="p-hint">
            Complete a production run to compare it with your estimate here.
          </p>
        )}
      </section>
      <section className="p-panel">
        <h2>Your data stays with you</h2>
        <p className="p-hint">
          Back up jobs and shop profiles before switching devices. Import merges
          jobs; conflicting versions become separate copies.
        </p>
        <div className="p-grid-2">
          <button className="p-button p-secondary" onClick={onBackup}>
            <Download size={18} />
            Export backup
          </button>
          <button className="p-button p-secondary" onClick={onRestore}>
            <Upload size={18} />
            Import backup
          </button>
        </div>
        <p className="p-hint">
          Backups include jobs and profiles. Keep source images, DST files and
          custom color CSVs separately. Device storage is not a cloud backup.
          Removing the app or clearing browser data can remove saved jobs.
        </p>
      </section>
      <div className="p-footer-links">
        <a href="/privacy/">Privacy</a>
        <a href="/methodology/">Methodology</a>
        <a href="/support/">Support</a>
      </div>
    </>
  );
}
