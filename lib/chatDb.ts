const DB_NAME = 'wujinhjun-agent-db';
const DB_VERSION = 1;
const STORE_NAME = 'chat';
const STORE_KEY = 'messages';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB'));
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export async function loadChatMessages<T>(): Promise<T[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(STORE_KEY);

    const persisted: T[] | undefined = await new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result as T[] | undefined);
      request.onerror = () => resolve(undefined);
    });

    db.close();

    return persisted && persisted.length > 0 ? persisted : [];
  } catch {
    // 读取失败时静默降级为无持久化
    return [];
  }
}

export async function persistChatMessages<T>(nextMessages: T[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(nextMessages, STORE_KEY);

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(null);
      tx.onerror = () =>
        reject(tx.error ?? new Error('Failed to write IndexedDB'));
      tx.onabort = () =>
        reject(tx.error ?? new Error('Aborted writing IndexedDB'));
    });

    db.close();
  } catch {
    // 写入失败时静默忽略，不影响正常对话
  }
}

