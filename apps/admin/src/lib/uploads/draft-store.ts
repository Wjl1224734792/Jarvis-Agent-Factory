/**
 * Admin IndexedDB 草稿存储
 *
 * 独立于 Web 端的 IndexedDB 数据库（feijia-admin-drafts），
 * 用于 Admin 文章编辑器自动保存/恢复草稿。
 *
 * 数据库：feijia-admin-drafts
 * Object Store：drafts（keyPath: "key"）
 */

// ============================================================
// 类型定义（遵循 TypeScript 规范：纯对象结构使用 interface）
// ============================================================

export interface DraftFileRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  file: File;
}

export interface DraftSnapshot<T> {
  key: string;
  version: number;
  updatedAt: number;
  data: T;
  filesBySlot: Record<string, DraftFileRecord[]>;
}

// ============================================================
// IndexedDB 工具
// ============================================================

const DB_NAME = "feijia-admin-drafts";
const DB_VERSION = 1;
const STORE_NAME = "drafts";

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open admin draft db"));
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
  runner: (
    store: IDBObjectStore,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void
  ) => void
) {
  return openDraftDb().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        runner(store, resolve, reject);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () =>
          reject(
            transaction.error ?? new Error("Admin draft transaction failed")
          );
      })
  );
}

// ============================================================
// 公开 API
// ============================================================

export function saveDraftSnapshot<T>(snapshot: DraftSnapshot<T>) {
  return withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(snapshot);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export function loadDraftSnapshot<T>(key: string) {
  return withStore<DraftSnapshot<T> | null>(
    "readonly",
    (store, resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () =>
        resolve((request.result as DraftSnapshot<T> | undefined) ?? null);
    }
  );
}

export function clearDraftSnapshot(key: string) {
  return withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
