import { Capacitor } from "@capacitor/core";
import { emptyStore, Store } from "./model";
import { loadStore, persistStore, validateStore } from "./storage";
const pointerKey = "production-store-pointer";
export async function readRepository(): Promise<Store> {
  if (!Capacitor.isNativePlatform()) return loadStore(localStorage);
  const [{ Preferences }, { Filesystem, Directory, Encoding }] =
    await Promise.all([
      import("@capacitor/preferences"),
      import("@capacitor/filesystem"),
    ]);
  const { value } = await Preferences.get({ key: pointerKey });
  if (!value) {
    const previous = await Preferences.get({
      key: "production-store-previous",
    });
    if (previous.value)
      throw new Error(
        "The current snapshot pointer is missing. Restore the previous save.",
      );
    return emptyStore();
  }
  const content = await Filesystem.readFile({
    path: value,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
  return validateStore(JSON.parse(content.data as string));
}
export async function writeRepository(store: Store): Promise<Store> {
  validateStore(store);
  if (new TextEncoder().encode(JSON.stringify(store)).length > 25 * 1024 * 1024)
    throw new Error(
      "Saved data exceeds 25 MB. Export your work before continuing.",
    );
  if (!Capacitor.isNativePlatform()) {
    if (navigator.locks)
      return navigator.locks.request("embroidery-jobs", () =>
        persistStore(localStorage, store),
      );
    return persistStore(localStorage, store);
  }
  const [{ Preferences }, { Filesystem, Directory, Encoding }] =
    await Promise.all([
      import("@capacitor/preferences"),
      import("@capacitor/filesystem"),
    ]);
  const { value: oldPointer } = await Preferences.get({ key: pointerKey });
  if (!oldPointer && store.revision !== 0)
    throw new Error(
      "The saved jobs changed. Export and reload before continuing.",
    );
  if (oldPointer) {
    const old = await Filesystem.readFile({
      path: oldPointer,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    if (JSON.parse(old.data as string).revision !== store.revision)
      throw new Error(
        "The saved jobs changed. Export this draft and reload before continuing.",
      );
  }
  const next = { ...store, revision: store.revision + 1 };
  const path = `production/state-${next.revision}-${crypto.randomUUID()}.json`;
  // Write a new immutable snapshot before atomically switching the small pointer.
  await Filesystem.writeFile({
    path,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    data: JSON.stringify(next),
    recursive: true,
  });
  const { value: previous } = await Preferences.get({
    key: "production-store-previous",
  });
  if (oldPointer)
    await Preferences.set({
      key: "production-store-previous",
      value: oldPointer,
    });
  await Preferences.set({ key: pointerKey, value: path });
  if (previous && previous !== oldPointer)
    await Filesystem.deleteFile({
      path: previous,
      directory: Directory.Data,
    }).catch(() => undefined);
  return next;
}

/** A recovery bundle preserves exact bytes; it is not a normal merge backup. */
export async function recoveryBundle() {
  if (!Capacitor.isNativePlatform())
    return {
      format: "embroidery-recovery-1",
      current: localStorage.getItem("embroidery.production.v3"),
      legacy: localStorage.getItem("embroidery_calc_history"),
    };
  const [{ Preferences }, { Filesystem, Directory, Encoding }] =
    await Promise.all([
      import("@capacitor/preferences"),
      import("@capacitor/filesystem"),
    ]);
  const entries: Record<string, unknown> = {};
  for (const key of [pointerKey, "production-store-previous"]) {
    const { value } = await Preferences.get({ key });
    entries[key] = value
      ? {
          path: value,
          ...(await Filesystem.readFile({
            path: value,
            directory: Directory.Data,
            encoding: Encoding.UTF8,
          }).catch((e) => ({ error: String(e) }))),
        }
      : null;
  }
  return { format: "embroidery-recovery-1", entries };
}

/** Explicit recovery only. Archive the broken state before selecting replacement. */
export async function recoverRepository(incoming?: Store): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    if (!incoming)
      throw new Error("Choose an exported backup to restore browser data.");
    const safe = validateStore(incoming),
      raw = JSON.stringify(await recoveryBundle());
    localStorage.setItem("embroidery.recovery." + crypto.randomUUID(), raw);
    localStorage.setItem(
      "embroidery.production.v3",
      JSON.stringify({ ...safe, revision: 0 }),
    );
    return;
  }
  const [{ Preferences }, { Filesystem, Directory, Encoding }] =
    await Promise.all([
      import("@capacitor/preferences"),
      import("@capacitor/filesystem"),
    ]);
  let safe: Store;
  if (incoming) safe = validateStore(incoming);
  else {
    const { value } = await Preferences.get({
      key: "production-store-previous",
    });
    if (!value)
      throw new Error(
        "No previous snapshot is available. Choose an exported backup.",
      );
    const content = await Filesystem.readFile({
      path: value,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    safe = validateStore(JSON.parse(content.data as string));
  }
  const stamp = crypto.randomUUID();
  await Filesystem.writeFile({
    path: "production/recovery-" + stamp + ".json",
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    data: JSON.stringify(await recoveryBundle()),
    recursive: true,
  });
  const path = "production/restored-" + stamp + ".json";
  await Filesystem.writeFile({
    path,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    data: JSON.stringify(safe),
    recursive: true,
  });
  await Preferences.set({ key: pointerKey, value: path });
}
