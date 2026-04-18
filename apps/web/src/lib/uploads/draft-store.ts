import type { DraftSnapshot } from "./types";

const DB_NAME = "feijia-publish-drafts";
const DB_VERSION = 1;
const STORE_NAME = "drafts";

function openDraftDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open draft db"));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
) {
  return openDraftDb().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        runner(store, resolve, reject);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => reject(transaction.error ?? new Error("Draft transaction failed"));
      })
  );
}

export function saveDraftSnapshot<T>(snapshot: DraftSnapshot<T>) {
  return withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(snapshot);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export function loadDraftSnapshot<T>(key: string) {
  return withStore<DraftSnapshot<T> | null>("readonly", (store, resolve, reject) => {
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as DraftSnapshot<T> | undefined) ?? null);
  });
}

export function clearDraftSnapshot(key: string) {
  return withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
