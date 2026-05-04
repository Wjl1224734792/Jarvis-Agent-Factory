/**
 * MediaManager TDD 测试套件
 *
 * Red-Green-Refactor:
 * - RED:    全部 10 个测试先失败（createMediaManager 未实现）
 * - GREEN:  最小实现通过所有测试
 * - REFACTOR: 代码清理，保持测试绿色
 *
 * 内置轻量级 IndexedDB 内存模拟，避免外部依赖。
 */

import { describe, expect, it, beforeAll, beforeEach, afterEach } from "vitest";

// ============================================================
// 轻量级 IndexedDB 内存模拟
// ============================================================

/** 模拟的数据库实例缓存（按数据库名） */
let mockDatabases: Map<string, MockDatabase> = new Map();

interface MockDatabase {
  name: string;
  version: number;
  stores: Map<string, Map<string, unknown>>;
}

/**
 * 创建一个异步触发 onsuccess 的伪 IDBRequest。
 */
function mockRequest<T>(result: T): IDBRequest {
  const req: Record<string, unknown> = {
    result,
    error: null,
    readyState: "done" as IDBRequestReadyState,
    onsuccess: null,
    onerror: null,
  };
  queueMicrotask(() => {
    if (typeof req.onsuccess === "function") {
      req.onsuccess({ target: req } as unknown as Event);
    }
  });
  return req as unknown as IDBRequest;
}

/**
 * 模拟 IDBObjectStore，在内存 Map 上操作。
 */
class MockObjectStore {
  constructor(private _map: Map<string, unknown>) {}

  put(value: unknown, key?: IDBValidKey): IDBRequest {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    this._map.set(String(key ?? ""), value);
    return mockRequest(undefined);
  }

  get(key: IDBValidKey): IDBRequest {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const val = this._map.get(String(key));
    return mockRequest(val);
  }

  delete(key: IDBValidKey): IDBRequest {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    this._map.delete(String(key));
    return mockRequest(undefined);
  }

  clear(): IDBRequest {
    this._map.clear();
    return mockRequest(undefined);
  }
}

/**
 * 模拟 IDBTransaction。
 */
class MockTransaction {
  constructor(
    private _stores: Map<string, Map<string, unknown>>,
    private _storeName: string
  ) {}

  objectStore(_name: string): IDBObjectStore {
    // 始终使用构造时锁定的 storeName
    let s = this._stores.get(this._storeName);
    if (!s) {
      s = new Map();
      this._stores.set(this._storeName, s);
    }
    return new MockObjectStore(s) as unknown as IDBObjectStore;
  }
}

/**
 * 模拟 IDBDatabase。
 */
class MockIDBDatabaseImpl {
  stores: Map<string, Map<string, unknown>>;
  name: string;
  version: number;

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
    this.stores = new Map();
  }

  get objectStoreNames(): DOMStringList {
    // 返回一个类似 DOMStringList 的对象
    const names = Array.from(this.stores.keys());
    return {
      contains: (name: string) => names.includes(name),
      length: names.length,
      item: (i: number) => names[i] ?? null,
      [Symbol.iterator]: () => names[Symbol.iterator](),
    } as unknown as DOMStringList;
  }

  createObjectStore(name: string): IDBObjectStore {
    this.stores.set(name, new Map());
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return new MockObjectStore(this.stores.get(name)!) as unknown as IDBObjectStore;
  }

  transaction(
    storeName: string,
    _mode?: IDBTransactionMode
  ): IDBTransaction {
    return new MockTransaction(this.stores, storeName) as unknown as IDBTransaction;
  }

  close(): void {
    // no-op
  }
}

/**
 * 每次测试前：设置全局 indexedDB 模拟。
 */
function setupMockIndexedDB(): void {
  mockDatabases = new Map();

  // @ts-expect-error - 仅设置 mock 需要的属性
  globalThis.indexedDB = {
    open(name: string, version?: number): IDBOpenDBRequest {
      const v = version ?? 1;
      const mockRequestObj: Record<string, unknown> = {
        result: null as MockIDBDatabaseImpl | null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      queueMicrotask(() => {
        const existing = mockDatabases.get(name);
        let db: MockIDBDatabaseImpl;

        if (!existing || v > existing.version) {
          db = new MockIDBDatabaseImpl(name, v);
          // 关键：在触发 onupgradeneeded 之前设置 request.result
          mockRequestObj.result = db;
          if (typeof mockRequestObj.onupgradeneeded === "function") {
            mockRequestObj.onupgradeneeded({ target: mockRequestObj } as unknown as IDBVersionChangeEvent);
          }
          mockDatabases.set(name, db as unknown as MockDatabase);
        } else {
          db = existing as unknown as MockIDBDatabaseImpl;
          mockRequestObj.result = db;
        }

        // 确保 result 已设置后再触发 onsuccess
        if (typeof mockRequestObj.onsuccess === "function") {
          mockRequestObj.onsuccess({ target: mockRequestObj } as unknown as Event);
        }
      });

      return mockRequestObj as unknown as IDBOpenDBRequest;
    },
  };
}

/**
 * 每次测试后：清除全局模拟。
 */
function teardownMockIndexedDB(): void {
  mockDatabases = new Map();
  // @ts-expect-error - 清理
  delete globalThis.indexedDB;
}

// ============================================================
// 测试辅助
// ============================================================

function createTestFile(name: string, sizeBytes: number, type: string): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

function createImageFile(name = "test.jpg"): File {
  return createTestFile(name, 1024 * 1024, "image/jpeg");
}

// ============================================================
// 测试用例
// ============================================================

describe("MediaManager", () => {
  let createMediaManager: (() => {
    register(file: File): { blobUrl: string; fileId: string };
    getFile(blobUrl: string): File | undefined;
    getAllFiles(): Map<string, File>;
    persist(draftKey: string): Promise<void>;
    restore(draftKey: string): Promise<Map<string, File>>;
    clear(draftKey: string): Promise<void>;
  }) | undefined;

  beforeAll(async () => {
    try {
      const mod = await import("../src/media-manager");
      createMediaManager = mod.createMediaManager;
    } catch {
      createMediaManager = undefined;
    }
  });

  beforeEach(() => {
    setupMockIndexedDB();
  });

  afterEach(() => {
    teardownMockIndexedDB();
  });

  /** 获取已确认非空的 createMediaManager（测试用例内部使用） */
  function getManager() {
    if (!createMediaManager) {
      throw new Error(
        "createMediaManager 未加载，请检查 media-manager.ts 是否存在"
      );
    }
    return createMediaManager();
  }

  // ==========================================================
  // SC-01
  // ==========================================================
  it("SC-01: register 图片文件应返回 blob URL 和唯一 fileId", () => {
    const manager = getManager();
    const file = createImageFile("photo.jpg");

    const result = manager.register(file);

    expect(result.blobUrl).toMatch(/^blob:/);
    expect(result.fileId).toBeTruthy();
    expect(typeof result.fileId).toBe("string");
  });

  // ==========================================================
  // SC-02
  // ==========================================================
  it("SC-02: register 超过 50MB 文件应抛出含 '超过大小限制' 的错误", () => {
    const manager = getManager();
    const largeFile = createTestFile("huge.mp4", 51 * 1024 * 1024, "video/mp4");

    expect(() => manager.register(largeFile)).toThrow(/超过大小限制/);
  });

  // ==========================================================
  // SC-03
  // ==========================================================
  it("SC-03: getFile 用已注册的 blob URL 应返回原始 File 对象", () => {
    expect(createMediaManager).toBeDefined();
    const manager = getManager();
    const file = createImageFile("cat.png");

    const { blobUrl } = manager.register(file);
    const retrieved = manager.getFile(blobUrl);

    expect(retrieved).toBe(file);
  });

  // ==========================================================
  // SC-04
  // ==========================================================
  it("SC-04: getFile 用未注册的 blob URL 应返回 undefined", () => {
    expect(createMediaManager).toBeDefined();
    const manager = getManager();

    const result = manager.getFile("blob:nonexistent-url");
    expect(result).toBeUndefined();
  });

  // ==========================================================
  // SC-05
  // ==========================================================
  it("SC-05: getAllFiles 应返回包含所有已注册文件的 Map", () => {
    expect(createMediaManager).toBeDefined();
    const manager = getManager();
    const file1 = createImageFile("a.jpg");
    const file2 = createTestFile("b.mp4", 1024 * 1024, "video/mp4");

    manager.register(file1);
    manager.register(file2);

    const allFiles = manager.getAllFiles();
    expect(allFiles).toBeInstanceOf(Map);
    expect(allFiles.size).toBe(2);
    expect(Array.from(allFiles.values())).toContain(file1);
    expect(Array.from(allFiles.values())).toContain(file2);
  });

  // ==========================================================
  // SC-06
  // ==========================================================
  it("SC-06: persist 后 restore 返回的 File name/size/type 应与原始一致", async () => {
    expect(createMediaManager).toBeDefined();
    const manager = getManager();
    const file = createImageFile("test-photo.png");

    manager.register(file);
    await manager.persist("draft-key-sc06");

    const restoredMap = await manager.restore("draft-key-sc06");
    expect(restoredMap).toBeInstanceOf(Map);
    expect(restoredMap.size).toBe(1);

    const restoredFile = Array.from(restoredMap.values())[0];
    expect(restoredFile).toBeDefined();
    expect(restoredFile.name).toBe(file.name);
    expect(restoredFile.size).toBe(file.size);
    expect(restoredFile.type).toBe(file.type);
  });

  // ==========================================================
  // SC-07
  // ==========================================================
  it("SC-07: persist 用相同 draft key 两次，旧数据应被替换", async () => {
    
    // 第一个实例
    const mgr1 = getManager();
    mgr1.register(createImageFile("original.jpg"));
    await mgr1.persist("draft-key-sc07");

    // 第二个实例，不同文件
    const mgr2 = getManager();
    mgr2.register(createImageFile("replaced.jpg"));
    await mgr2.persist("draft-key-sc07");

    const restored = await mgr2.restore("draft-key-sc07");
    expect(restored.size).toBe(1);
    expect(Array.from(restored.values())[0].name).toBe("replaced.jpg");
  });

  // ==========================================================
  // SC-08
  // ==========================================================
  it("SC-08: restore 不存在的 draft key 应返回空 Map", async () => {
    expect(createMediaManager).toBeDefined();
    const manager = getManager();

    const result = await manager.restore("nonexistent-key");
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  // ==========================================================
  // SC-09
  // ==========================================================
  it("SC-09: clear 后 restore 应返回空 Map", async () => {
    expect(createMediaManager).toBeDefined();
    const manager = getManager();

    manager.register(createImageFile("to-be-cleared.jpg"));
    await manager.persist("draft-key-sc09");

    // 确认持久化成功
    const before = await manager.restore("draft-key-sc09");
    expect(before.size).toBe(1);

    await manager.clear("draft-key-sc09");

    const after = await manager.restore("draft-key-sc09");
    expect(after.size).toBe(0);
  });

  // ==========================================================
  // SC-10
  // ==========================================================
  it("SC-10: restore 返回的 File 生成的新 blob URL 与旧的不同", async () => {
    expect(createMediaManager).toBeDefined();
    const manager = getManager();
    const file = createImageFile("reblob-test.png");

    const { blobUrl: oldBlobUrl } = manager.register(file);
    await manager.persist("draft-key-sc10");

    const restoredMap = await manager.restore("draft-key-sc10");
    expect(restoredMap.size).toBe(1);

    const [restoredBlobUrl, restoredFile] = Array.from(restoredMap.entries())[0];

    // 新 blob URL 应与旧的不同
    expect(restoredBlobUrl).toBeTruthy();
    expect(restoredBlobUrl).not.toBe(oldBlobUrl);

    // 文件属性一致
    expect(restoredFile.name).toBe(file.name);
    expect(restoredFile.size).toBe(file.size);
  });
});
