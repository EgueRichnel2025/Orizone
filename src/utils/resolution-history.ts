import type { ResolutionHistoryEntry } from "../types/history";

const DATABASE_NAME = "orizone-resolution-history";
const DATABASE_VERSION = 1;
const STORE_NAME = "resolutions";

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Ce navigateur ne prend pas en charge le stockage local des résolutions."));
  }

  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("method", "method", { unique: false });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };

    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error("Impossible d'ouvrir la base de l'historique."));
    };

    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("La base de l'historique est bloquée par un autre onglet. Fermez les autres onglets d'Orizone puis réessayez."));
    };
  });

  return databasePromise;
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Échec de l'opération sur l'historique."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Opération sur l'historique annulée."));
  });
}

/** Enregistre une résolution complète. L'identifiant stable rend l'opération idempotente. */
export async function saveResolutionHistory(entry: ResolutionHistoryEntry): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  const existingRequest = store.get(entry.id);

  existingRequest.onsuccess = () => {
    const existing = existingRequest.result as ResolutionHistoryEntry | undefined;
    store.put({
      ...entry,
      // Préserve la date de la première sauvegarde, notamment sous React StrictMode.
      createdAt: existing?.createdAt ?? entry.createdAt,
    } satisfies ResolutionHistoryEntry);
  };

  await transactionDone(transaction);
}

export async function getResolutionHistory(): Promise<ResolutionHistoryEntry[]> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const request = transaction.objectStore(STORE_NAME).getAll();
  const entries = await new Promise<ResolutionHistoryEntry[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as ResolutionHistoryEntry[]);
    request.onerror = () => reject(request.error ?? new Error("Impossible de lire l'historique."));
  });
  await transactionDone(transaction);
  return entries.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function getResolutionHistoryEntry(id: string): Promise<ResolutionHistoryEntry | null> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const request = transaction.objectStore(STORE_NAME).get(id);
  const entry = await new Promise<ResolutionHistoryEntry | null>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as ResolutionHistoryEntry | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Impossible de lire cette résolution."));
  });
  await transactionDone(transaction);
  return entry;
}

export async function deleteResolutionHistoryEntry(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(id);
  await transactionDone(transaction);
}

export async function clearResolutionHistory(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).clear();
  await transactionDone(transaction);
}
