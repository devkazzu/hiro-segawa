import type { Track } from "./types";

interface StoredAudio {
  id: string;
  track: Track;
  file: File;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("hiro-segawa-music", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("audio", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadAudio(): Promise<StoredAudio[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("audio", "readonly");
    const request = transaction.objectStore("audio").getAll();
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result as StoredAudio[]);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function saveAudio(track: Track, file: File) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("audio", "readwrite");
    transaction
      .objectStore("audio")
      .put({ id: track.id, track: { ...track, src: "" }, file });
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function deleteAudio(id: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("audio", "readwrite");
    transaction.objectStore("audio").delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

function matchesShape(value: unknown, reference: unknown): boolean {
  if (typeof reference === "number")
    return typeof value === "number" && Number.isFinite(value);
  if (Array.isArray(reference))
    return (
      Array.isArray(value) &&
      value.every(
        (item) => !reference.length || matchesShape(item, reference[0]),
      )
    );
  if (reference !== null && typeof reference === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    return Object.entries(reference).every(([key, sample]) =>
      matchesShape((value as Record<string, unknown>)[key], sample),
    );
  }
  return typeof value === typeof reference;
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(`hiro:${key}`) ?? "null",
    );
    if (!matchesShape(value, fallback)) return fallback;
    if (key === "preferences") {
      const settings = value as Record<string, unknown>;
      if (
        typeof settings.volume !== "number" ||
        settings.volume < 0 ||
        settings.volume > 1 ||
        !Array.isArray(settings.eq) ||
        settings.eq.length !== 7 ||
        settings.eq.some((gain: number) => gain < -12 || gain > 12)
      )
        return fallback;
    }
    return value as T;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(`hiro:${key}`, JSON.stringify(value));
  } catch {
    /* Playback remains usable when browser storage is unavailable. */
  }
}
