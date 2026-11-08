// تشفير أسرار الجهاز (مفتاح جيميني): AES-GCM 256 بيت.
// المفتاح نفسه non-extractable: ما بينقرأ من JavaScript ولا بينصدّر، وبيضل محفوظ بـIndexedDB.
// يعني: المفتاح المشفّر بـlocalStorage لحالو ما بيفيد لو انسحب من الجهاز أو انعمل منو نسخة ملف.
// ملاحظة: هاد مو بديل عن Android Keystore الكامل، بس بيمنع كشف المفتاح كنص واضح.
const DB_NAME = 'mila-vault'
const STORE = 'keys'
const WRAP_KEY_ID = 'wrap-v1'
const PREFIX = 'enc:v1:'

let wrapKeyPromise: Promise<CryptoKey> | null = null

function openVault(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no-indexeddb'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('vault-open-failed'))
  })
}

async function loadOrCreateWrapKey(): Promise<CryptoKey> {
  const db = await openVault()
  try {
    const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(WRAP_KEY_ID)
      req.onsuccess = () => resolve(req.result as CryptoKey | undefined)
      req.onerror = () => reject(req.error ?? new Error('vault-get-failed'))
    })
    if (existing) return existing
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(key, WRAP_KEY_ID)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('vault-put-failed'))
    })
    return key
  } finally {
    db.close()
  }
}

function wrapKey(): Promise<CryptoKey> {
  if (!wrapKeyPromise) {
    wrapKeyPromise = loadOrCreateWrapKey().catch((err: unknown) => {
      wrapKeyPromise = null
      throw err
    })
  }
  return wrapKeyPromise
}

function toB64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** بيشفّر نص ويرجّع سلسلة قابلة للتخزين. */
export async function encryptSecret(plain: string): Promise<string> {
  const key = await wrapKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain))
  return `${PREFIX}${toB64(iv)}.${toB64(new Uint8Array(ct))}`
}

/** بيفك تشفير سلسلة من encryptSecret. بيرمي خطأ إذا التالفة أو المفتاح ضاع. */
export async function decryptSecret(blob: string): Promise<string> {
  if (!blob.startsWith(PREFIX)) throw new Error('bad-secret-format')
  const [ivPart, ctPart] = blob.slice(PREFIX.length).split('.')
  if (!ivPart || !ctPart) throw new Error('bad-secret-format')
  const key = await wrapKey()
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(ivPart) }, key, fromB64(ctPart))
  return new TextDecoder().decode(pt)
}
