// صور الدروس بتنحفظ بـIndexedDB على الجهاز (مساحة أكبر بكثير من localStorage)،
// ما بتنرفع لأي سيرفر: بتنصدّر بس داخل ملف النسخة الاحتياطية اللي ولي الأمر بيحفظه بإيده.
const DB_NAME = 'mila-archive'
const STORE = 'images'
const VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null
const urlCache = new Map<string, string>()

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no-indexeddb'))
      return
    }
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('idb-open-failed'))
  })
  return dbPromise
}

export async function saveImage(id: string, blob: Blob): Promise<boolean> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(blob, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('idb-put-failed'))
    })
    return true
  } catch {
    return false
  }
}

/** بيرجّع رابط عرض مؤقت (object URL) للصورة، أو null إذا ما انحفظت. */
export async function loadImageUrl(id: string): Promise<string | null> {
  if (id === '') return null
  const cached = urlCache.get(id)
  if (cached) return cached
  try {
    const db = await openDb()
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(id)
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null)
      req.onerror = () => reject(req.error ?? new Error('idb-get-failed'))
    })
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    urlCache.set(id, url)
    return url
  } catch {
    return null
  }
}

export async function removeImage(id: string): Promise<void> {
  const cached = urlCache.get(id)
  if (cached) {
    URL.revokeObjectURL(cached)
    urlCache.delete(id)
  }
  try {
    const db = await openDb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // ما في داعي نزعّل الطفل إذا فشل الحذف.
  }
}

async function readBlob(id: string): Promise<Blob | null> {
  const db = await openDb()
  return new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null)
    req.onerror = () => reject(req.error ?? new Error('idb-get-failed'))
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read-failed'))
    reader.readAsDataURL(blob)
  })
}

/** بيجمّع صور الدروس كـdata URLs للنسخة الاحتياطية. الصور اللي ما انلقت بتنتجاهل. */
export async function exportImages(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const id of new Set(ids.filter((x) => x !== ''))) {
    try {
      const blob = await readBlob(id)
      if (blob) out[id] = await blobToDataUrl(blob)
    } catch {
      // صورة وحدة تالفة ما بتوقف النسخة كلها.
    }
  }
  return out
}

/** بيرجّع الصور من النسخة الاحتياطية للـIndexedDB. بيرجّع عدد الصور اللي انحفظت. */
export async function importImages(map: Record<string, unknown>): Promise<number> {
  let saved = 0
  for (const [id, value] of Object.entries(map)) {
    if (id === '' || typeof value !== 'string' || !value.startsWith('data:image/')) continue
    try {
      const blob = await (await fetch(value)).blob()
      if (await saveImage(id, blob)) saved++
    } catch {
      // ما في داعي نفشل الاستعادة كلها بسبب صورة.
    }
  }
  return saved
}
