/**
 * MediaManager — 媒体文件管理器
 *
 * 职责：
 * - 将本地 File 对象注册为 blob URL（供编辑器预览）
 * - 跟踪 blob URL → File 的映射（内存 Map）
 * - 通过 IndexedDB 持久化/恢复文件（跨会话草稿）
 * - 清除 IndexedDB 记录并释放所有 blob URL
 *
 * IndexedDB 数据库：feijia-media-cache
 * Object Store：media-files
 * 单文件上限：50MB
 */

export interface MediaFileEntry {
  fileId: string;
  blobUrl: string;
  file: File;
}

export interface MediaManager {
  /**
   * 注册本地媒体文件，生成 blob URL。
   * @param file 待注册的 File 对象
   * @returns blobUrl（编辑器预览用）和唯一 fileId
   * @throws 文件超过 50MB 时抛出 Error
   */
  register(file: File): { blobUrl: string; fileId: string };

  /**
   * 根据 blob URL 查找原始 File。
   * @param blobUrl 由 `register()` 返回的 blob URL
   * @returns 对应的 File 对象；未找到则返回 undefined
   */
  getFile(blobUrl: string): File | undefined;

  /**
   * 获取当前内存中所有已注册文件。
   * @returns blobUrl → File 的只读映射副本
   */
  getAllFiles(): Map<string, File>;

  /**
   * 将当前文件列表持久化到 IndexedDB。
   * 同一 draftKey 重复调用会覆盖旧数据。
   * @param draftKey 草稿标识键（由调用方定义，如 "feijia:article-draft"）
   * @throws IndexedDB 写入失败时抛出 Error
   */
  persist(draftKey: string): Promise<void>;

  /**
   * 从 IndexedDB 恢复文件列表，并为每个文件重新生成 blob URL。
   * @param draftKey 草稿标识键
   * @returns blobUrl → File 的映射；不存在时返回空 Map
   * @throws IndexedDB 读取失败时抛出 Error
   */
  restore(draftKey: string): Promise<Map<string, File>>;

  /**
   * 清除 IndexedDB 记录并释放所有已注册的 blob URL。
   * 调用后内存 Map 和 blob URL 均被清空。
   * @param draftKey 草稿标识键
   * @throws IndexedDB 删除失败时抛出 Error（blob URL 仍会释放）
   */
  clear(draftKey: string): Promise<void>;
}

/** 单文件最大字节数 (50MB) */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** IndexedDB 数据库名 */
const DB_NAME = "feijia-media-cache";

/** IndexedDB Object Store 名 */
const STORE_NAME = "media-files";

// ============================================================
// IndexedDB 工具
// ============================================================

/**
 * 打开 IndexedDB 数据库，必要时创建/升级。
 * @throws 数据库打开失败时抛出带上下文的 Error
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        new Error(
          `无法打开 IndexedDB 数据库 "${DB_NAME}": ${request.error?.message ?? "未知错误"}`
        )
      );
    };
  });
}

/**
 * 在 object store 上执行单一操作并返回 Promise。
 * @param store   IDBObjectStore 实例
 * @param operation 返回 IDBRequest 的回调
 * @returns 操作结果的值
 * @throws 操作失败时抛出 Error
 */
function storeRequest<T>(
  store: IDBObjectStore,
  operation: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const request = operation(store);
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(
        new Error(`IndexedDB 操作失败: ${request.error?.message ?? "未知错误"}`)
      );
    };
  });
}

/**
 * 安全关闭数据库连接，捕获并记录关闭异常。
 */
function safeCloseDB(db: IDBDatabase): void {
  try {
    db.close();
  } catch (error) {
    console.error("关闭 IndexedDB 连接失败:", error);
  }
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建 MediaManager 实例。
 *
 * 每个实例独立维护自己的 blobUrl → File 内存映射。
 * 不同实例之间不共享状态。
 *
 * @returns 全新的 MediaManager 实例
 *
 * @example
 * ```ts
 * const manager = createMediaManager();
 * const { blobUrl } = manager.register(file);       // 注册
 * await manager.persist("my-draft");                 // 持久化
 * const files = await manager.restore("my-draft");   // 恢复
 * await manager.clear("my-draft");                   // 清除
 * ```
 */
export function createMediaManager(): MediaManager {
  /** blobUrl → File 内存映射 */
  const fileMap = new Map<string, File>();

  /** 跟踪所有生成的 blob URL，用于 clear 时批量释放 */
  const blobUrls = new Set<string>();

  const register: MediaManager["register"] = (file) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `文件 "${file.name}" 大小 ${(file.size / (1024 * 1024)).toFixed(1)}MB 超过大小限制 (50MB)`
      );
    }

    const fileId = crypto.randomUUID();
    const blobUrl = URL.createObjectURL(file);

    fileMap.set(blobUrl, file);
    blobUrls.add(blobUrl);

    return { blobUrl, fileId };
  };

  const getFile: MediaManager["getFile"] = (blobUrl) => {
    return fileMap.get(blobUrl);
  };

  const getAllFiles: MediaManager["getAllFiles"] = () => {
    return new Map(fileMap);
  };

  const persist: MediaManager["persist"] = async (draftKey) => {
    const entries: Array<{ blobUrl: string; file: File }> = [];
    for (const [blobUrl, file] of fileMap) {
      entries.push({ blobUrl, file });
    }

    try {
      const db = await openDB();
      try {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        // 覆盖写入：先清再写
        await storeRequest(store, (s) => s.clear());
        await storeRequest(store, (s) => s.put(entries, draftKey));
      } finally {
        safeCloseDB(db);
      }
    } catch (error) {
      console.error(
        `persist("${draftKey}") 失败:`,
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  };

  const restore: MediaManager["restore"] = async (draftKey) => {
    let stored: Array<{ blobUrl: string; file: File }> | undefined;

    try {
      const db = await openDB();
      try {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        stored = await storeRequest<typeof stored>(
          store,
          (s) => s.get(draftKey) as IDBRequest<typeof stored>
        );
      } finally {
        safeCloseDB(db);
      }
    } catch (error) {
      console.error(
        `restore("${draftKey}") 失败:`,
        error instanceof Error ? error.message : error
      );
      throw error;
    }

    const result = new Map<string, File>();

    if (!stored || !Array.isArray(stored)) {
      return result;
    }

    // 释放旧 blob URL，避免内存泄漏
    for (const url of blobUrls) {
      URL.revokeObjectURL(url);
    }
    blobUrls.clear();
    fileMap.clear();

    // 恢复文件并为每个文件重新生成 blob URL
    for (const entry of stored) {
      const newBlobUrl = URL.createObjectURL(entry.file);
      fileMap.set(newBlobUrl, entry.file);
      blobUrls.add(newBlobUrl);
      result.set(newBlobUrl, entry.file);
    }

    return result;
  };

  const clear: MediaManager["clear"] = async (draftKey) => {
    // 先安全清理内存资源（无论 IndexedDB 操作是否成功）
    for (const url of blobUrls) {
      URL.revokeObjectURL(url);
    }
    blobUrls.clear();
    fileMap.clear();

    try {
      const db = await openDB();
      try {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        await storeRequest(store, (s) => s.delete(draftKey));
      } finally {
        safeCloseDB(db);
      }
    } catch (error) {
      console.error(
        `clear("${draftKey}") 删除 IndexedDB 记录失败:`,
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  };

  return Object.freeze({
    register,
    getFile,
    getAllFiles,
    persist,
    restore,
    clear,
  });
}
