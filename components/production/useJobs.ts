import { useEffect, useRef, useState } from "react";
import { Store, STORE_KEY } from "../../services/production/model";
import {
  readRepository,
  writeRepository,
} from "../../services/production/repository";
export function useJobs() {
  const [store, setStore] = useState<Store | null>(null);
  const ref = useRef<Store | null>(null);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"saving" | "saved" | "failed">(
    "saving",
  );
  const revision = useRef(0),
    serial = useRef(0),
    blocked = useRef(false),
    queue = useRef(Promise.resolve(true));
  useEffect(() => {
    let mounted = true;
    readRepository()
      .then((data) => {
        if (mounted) {
          revision.current = data.revision;
          ref.current = data;
          setStore(data);
          setSaveState("saved");
        }
      })
      .catch((e) => {
        if (mounted) {
          blocked.current = true;
          setError(
            `Saved data could not be opened: ${e.message}. Existing data has been preserved.`,
          );
          setSaveState("failed");
        }
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === STORE_KEY || event.key === null) {
        blocked.current = true;
        setError(
          "Jobs changed in another window. Export unsaved work, then reload.",
        );
        setSaveState("failed");
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  function commit(next: Store, durable = false): Promise<boolean> {
    const token = ++serial.current;
    if (!durable) {
      ref.current = next;
      setStore(next);
    }
    setSaveState("saving");
    queue.current = queue.current.then(async () => {
      if (blocked.current) {
        setSaveState("failed");
        setError(
          "Saving is blocked. Export your unsaved work, then reload saved jobs.",
        );
        return false;
      }
      try {
        const saved = await writeRepository({
          ...next,
          revision: revision.current,
        });
        revision.current = saved.revision;
        if (token === serial.current) {
          ref.current = saved;
          setStore(saved);
          setSaveState("saved");
        }
        return true;
      } catch (e) {
        blocked.current = true;
        setError(
          `Could not save: ${(e as Error).message}. Export a backup to keep this work.`,
        );
        setSaveState("failed");
        return false;
      }
    });
    return queue.current;
  }
  return {
    store,
    ref,
    commit,
    error,
    setError,
    saveState,
    flush: () => queue.current,
  };
}
