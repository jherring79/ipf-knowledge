"use client";

/**
 * Offline capture queue.
 *
 * Every capture is written here FIRST, before any network call. That way a
 * truck-stop bar of signal that dies mid-upload can never lose a photo --
 * the record is already on the phone, and the sync engine retries it later.
 *
 * Raw IndexedDB on purpose: no extra dependency, and photos are stored as
 * Blobs (IndexedDB handles them natively, unlike localStorage).
 */

export type QueuedPhoto = {
  blob: Blob;
  type: string;
};

export type QueuedCapture = {
  id: string;
  note: string;
  photos: QueuedPhoto[];
  createdAt: number;
  userId: string;
  userEmail: string | null;
  /** Paths already pushed to storage, so a retry resumes instead of restarting. */
  uploadedPaths: string[];
  attempts: number;
  lastError: string | null;
};

const DB_NAME = "ipf-knowledge";
const DB_VERSION = 1;
const STORE = "queue";

export const QUEUE_CHANGED = "ipf:queue-changed";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser has no offline storage."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });

  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const req = fn(transaction.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () =>
          reject(req.error ?? new Error("IndexedDB request failed"));
      }),
  );
}

/** Tell the UI the queue moved. */
export function announceQueueChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(QUEUE_CHANGED));
  }
}

export async function enqueue(
  capture: Omit<QueuedCapture, "uploadedPaths" | "attempts" | "lastError">,
): Promise<void> {
  const row: QueuedCapture = {
    ...capture,
    uploadedPaths: [],
    attempts: 0,
    lastError: null,
  };
  await tx("readwrite", (s) => s.put(row));
  announceQueueChange();
}

export async function listQueue(): Promise<QueuedCapture[]> {
  const all = await tx<QueuedCapture[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function queueCount(): Promise<number> {
  try {
    return await tx<number>("readonly", (s) => s.count());
  } catch {
    return 0;
  }
}

export async function updateQueued(item: QueuedCapture): Promise<void> {
  await tx("readwrite", (s) => s.put(item));
  announceQueueChange();
}

export async function removeQueued(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
  announceQueueChange();
}

/**
 * Ask the browser not to evict our data under storage pressure. Without this,
 * iOS and Android are both free to throw away IndexedDB on a full phone --
 * which is exactly the phone a field guy is carrying.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
