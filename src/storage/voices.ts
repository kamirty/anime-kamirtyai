/**
 * Recorded or uploaded lines, kept on the visitor's device only: IndexedDB plus an in-memory cache.
 * Audio is stored as mono Float32 PCM at 48 kHz, the soundtrack's own rate.
 */

const DB = 'kamirty-anime';
const STORE = 'voices';
const mem = new Map<string, Float32Array>();

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putVoice(id: string, pcm: Float32Array): Promise<void> {
  mem.set(id, pcm);
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(pcm, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* private mode: the line still works until the page closes */
  }
}

export async function getVoice(id: string): Promise<Float32Array | null> {
  const hit = mem.get(id);
  if (hit) return hit;
  try {
    const db = await open();
    const v = await new Promise<Float32Array | null>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as Float32Array | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (v) mem.set(id, v);
    return v;
  } catch {
    return null;
  }
}

export async function loadVoices(ids: string[]): Promise<Map<string, Float32Array>> {
  const out = new Map<string, Float32Array>();
  for (const id of ids) {
    const v = await getVoice(id);
    if (v) out.set(id, v);
  }
  return out;
}

/** Decodes any audio file or recording to mono 48 kHz. */
export async function decodeToMono(data: ArrayBuffer): Promise<Float32Array> {
  const probe = new OfflineAudioContext(1, 48000, 48000);
  const buf = await probe.decodeAudioData(data);
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(buf.duration * 48000)), 48000);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start();
  const out = (await off.startRendering()).getChannelData(0).slice();
  // trim leading and trailing silence, then normalise to a steady speaking level
  let a = 0;
  let b = out.length - 1;
  while (a < b && Math.abs(out[a]) < 0.02) a++;
  while (b > a && Math.abs(out[b]) < 0.02) b--;
  const trimmed = out.slice(Math.max(0, a - 2400), Math.min(out.length, b + 4800));
  let peak = 0;
  for (const v of trimmed) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < trimmed.length; i++) trimmed[i] *= 0.9 / peak;
  return trimmed;
}

/** Voice bytes for a saved project file (16-bit PCM, base64). */
export function encodeVoice(pcm: Float32Array): string {
  const i16 = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) i16[i] = Math.max(-1, Math.min(1, pcm[i])) * 32767;
  const u8 = new Uint8Array(i16.buffer);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

export function decodeVoice(b64: string): Float32Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(u8.buffer, 0, Math.floor(u8.length / 2));
  const f = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) f[i] = i16[i] / 32767;
  return f;
}
