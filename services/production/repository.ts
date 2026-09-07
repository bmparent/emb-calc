import { Capacitor } from '@capacitor/core';
import { emptyStore, Store } from './model';
import { loadStore, persistStore, validateStore } from './storage';
const pointerKey = 'production-store-pointer';
export async function readRepository(): Promise<Store> {
  if (!Capacitor.isNativePlatform()) return loadStore(localStorage);
  const [{ Preferences }, { Filesystem, Directory, Encoding }] = await Promise.all([import('@capacitor/preferences'),import('@capacitor/filesystem')]);
  const { value } = await Preferences.get({ key: pointerKey });
  if (!value) return emptyStore();
  const content = await Filesystem.readFile({ path: value, directory: Directory.Data, encoding: Encoding.UTF8 });
  return validateStore(JSON.parse(content.data as string));
}
export async function writeRepository(store: Store): Promise<Store> {
  if (!Capacitor.isNativePlatform()) {
    if (navigator.locks) return navigator.locks.request('embroidery-jobs', () => persistStore(localStorage, store));
    return persistStore(localStorage,store);
  }
  const [{ Preferences }, { Filesystem, Directory, Encoding }] = await Promise.all([import('@capacitor/preferences'),import('@capacitor/filesystem')]);
  const { value: oldPointer } = await Preferences.get({ key: pointerKey });
  if (oldPointer) {
    const old = await Filesystem.readFile({ path: oldPointer, directory: Directory.Data, encoding: Encoding.UTF8 });
    if (JSON.parse(old.data as string).revision !== store.revision) throw new Error('The saved jobs changed. Export this draft and reload before continuing.');
  }
  const next = { ...store, revision: store.revision + 1 };
  const path = `production/state-${next.revision}-${crypto.randomUUID()}.json`;
  // Write a new immutable snapshot before atomically switching the small pointer.
  await Filesystem.writeFile({ path, directory: Directory.Data, encoding: Encoding.UTF8, data: JSON.stringify(next), recursive: true });
  const { value: previous } = await Preferences.get({ key: 'production-store-previous' });
  if(oldPointer) await Preferences.set({key:'production-store-previous',value:oldPointer});
  await Preferences.set({ key: pointerKey, value: path });
  if(previous && previous !== oldPointer) await Filesystem.deleteFile({path:previous,directory:Directory.Data}).catch(()=>undefined);
  return next;
}
