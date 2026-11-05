import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "clothesline:note-ids";

function normalizeIds(values: readonly unknown[]): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const value of values) {
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0 || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

/** Synchronous cache used for the first paint of the clothesline window. */
export function readStoredClotheslineIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeIds(parsed) : [];
  } catch {
    return [];
  }
}

export function writeStoredClotheslineIds(ids: readonly number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeIds(ids)));
  } catch {
    // localStorage can be unavailable in hardened or browser-test environments.
  }
}

async function pushIds(ids: readonly number[]): Promise<void> {
  try {
    await invoke("clothesline_set_notes", { noteIds: ids });
  } catch {
    // The local snapshot still drives the window when IPC is unavailable.
  }
}

interface ClotheslineState {
  /** Currently hung note IDs in display order. */
  hungIds: number[];
  /** Replace the full list, persist it, and sync the backend. */
  setIds: (next: number[]) => void;
  /** Toggle a note's hung state. Returns `true` when it was added. */
  toggle: (id: number) => Promise<boolean>;
  /** Add a note without duplicating it. */
  add: (id: number) => Promise<boolean>;
  /** Remove a note from the line. */
  remove: (id: number) => Promise<boolean>;
  /** Whether the clothesline window currently exists. */
  isOpen: boolean;
  refreshOpenState: () => Promise<void>;
}

/**
 * Shared state for the main window and the clothesline board.
 *
 * The backend list is authoritative for a running app. localStorage is only a
 * restart bridge: on a cold start the Rust mirror is empty, so a non-empty
 * local snapshot is pushed back once instead of being clobbered by an empty
 * first render.
 */
export function useClothesline(): ClotheslineState {
  const [hungIds, setHungIds] = useState<number[]>(readStoredClotheslineIds);
  const idsRef = useRef(hungIds);
  const [isOpen, setIsOpen] = useState(false);

  const adopt = useCallback((next: readonly number[], persist = true) => {
    const normalized = normalizeIds(next);
    idsRef.current = normalized;
    setHungIds(normalized);
    if (persist) writeStoredClotheslineIds(normalized);
  }, []);

  const commit = useCallback((next: readonly number[]) => {
    const normalized = normalizeIds(next);
    adopt(normalized);
    void pushIds(normalized);
  }, [adopt]);

  const refreshOpenState = useCallback(async () => {
    try {
      setIsOpen(Boolean(await invoke<boolean>("clothesline_is_open")));
    } catch {
      setIsOpen(false);
    }
  }, []);

  const setIds = useCallback((next: number[]) => {
    commit(next);
  }, [commit]);

  const toggle = useCallback(async (id: number) => {
    const current = idsRef.current;
    if (current.includes(id)) {
      commit(current.filter((value) => value !== id));
      return false;
    }
    commit([...current, id]);
    return true;
  }, [commit]);

  const add = useCallback(async (id: number) => {
    if (idsRef.current.includes(id)) return false;
    commit([...idsRef.current, id]);
    return true;
  }, [commit]);

  const remove = useCallback(async (id: number) => {
    if (!idsRef.current.includes(id)) return false;
    commit(idsRef.current.filter((value) => value !== id));
    return true;
  }, [commit]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const dispose = await listen<number[]>("tidbit://clothesline-changed", (event) => {
        if (disposed) return;
        adopt(Array.isArray(event.payload) ? event.payload : []);
      });
      if (disposed) dispose();
      else unlisten = dispose;
    }).catch(() => {
      // No event bridge in browser tests; the local cache already has the state.
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [adopt]);

  // Reconcile once on mount, after the cross-window listener is installed.
  useEffect(() => {
    let disposed = false;
    const reconcile = async () => {
      const local = readStoredClotheslineIds();
      try {
        const payload = await invoke<unknown>("clothesline_list");
        const remote = Array.isArray(payload) ? normalizeIds(payload) : null;
        if (disposed) return;
        if (!remote) {
          adopt(local);
          return;
        }
        if (remote.length > 0) {
          adopt(remote);
          return;
        }
        if (local.length > 0) {
          // A cold start resets the backend mirror; restore the durable list.
          await invoke("clothesline_set_notes", { noteIds: local });
          if (!disposed) adopt(local);
          return;
        }
        adopt([]);
      } catch {
        if (!disposed) adopt(local);
      }
    };
    void reconcile();
    return () => {
      disposed = true;
    };
  }, [adopt]);

  return {
    hungIds,
    setIds,
    toggle,
    add,
    remove,
    isOpen,
    refreshOpenState,
  };
}
