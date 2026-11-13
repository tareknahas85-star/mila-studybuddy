// قفل الأهل: الرمز (٤ لـ ٦ أرقام) بينحفظ مشفّر (PBKDF2 مع salt)، وبيقفل ٥ دقايق بعد ٥ محاولات غلط.
import { loadParent, saveParent } from './store.ts'
import type { ParentData } from './store.ts'

const enc = new TextEncoder()
const MAX_FAILS = 5
const LOCK_MS = 5 * 60 * 1000

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function newSalt(): string {
  try {
    const a = new Uint8Array(16)
    crypto.getRandomValues(a)
    return toHex(a.buffer)
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

export async function hashSecret(secret: string, salt: string): Promise<string> {
  try {
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations: 60000, hash: 'SHA-256' },
      key,
      256,
    )
    return toHex(bits)
  } catch {
    // احتياطي إذا المتصفح ما فيه crypto.subtle.
    let h = 5381
    for (const c of `${salt}:${secret}`) h = ((h << 5) + h + c.charCodeAt(0)) | 0
    return `f${h}`
  }
}

export const hasPin = (p: ParentData): boolean => p.pinHash !== '' || p.legacyPin !== ''

/** رقم النسخة القديمة (نص عادي) بيتحوّل لهاش مرة وحدة وبينمسح. */
export async function migrateLegacyPin(): Promise<void> {
  const p = loadParent()
  if (p.legacyPin === '' || p.pinHash !== '') return
  const salt = p.salt || newSalt()
  const pinHash = await hashSecret(p.legacyPin, salt)
  saveParent({ ...p, salt, pinHash, legacyPin: '', fails: 0, lockUntil: 0 })
}

export async function setPin(pin: string): Promise<void> {
  const p = loadParent()
  const salt = p.salt || newSalt()
  saveParent({ ...p, salt, pinHash: await hashSecret(pin, salt), legacyPin: '', fails: 0, lockUntil: 0 })
}

export type PinResult = { ok: true } | { ok: false; msg: string }

const AR = (n: number): string => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

export async function checkPin(pin: string): Promise<PinResult> {
  const p = loadParent()
  const now = Date.now()
  if (p.lockUntil > now) {
    return { ok: false, msg: `جرّب بعد ${AR(Math.ceil((p.lockUntil - now) / 60000))} دقايق` }
  }
  if (p.pinHash === '') return { ok: false, msg: 'ما في رمز محفوظ.' }
  if ((await hashSecret(pin, p.salt)) === p.pinHash) {
    if (p.fails !== 0) saveParent({ ...p, fails: 0 })
    return { ok: true }
  }
  const fails = p.fails + 1
  if (fails >= MAX_FAILS) {
    saveParent({ ...p, fails: 0, lockUntil: now + LOCK_MS })
    return { ok: false, msg: '٥ محاولات غلط. انقفل ٥ دقايق.' }
  }
  saveParent({ ...p, fails })
  return { ok: false, msg: `الرمز غلط. باقي ${AR(MAX_FAILS - fails)} محاولات.` }
}

const norm = (a: string): string => a.trim().toLowerCase()

export async function setSecurityQ(text: string, answer: string): Promise<void> {
  const p = loadParent()
  const salt = p.salt || newSalt()
  saveParent({ ...p, salt, q: { text, h: await hashSecret(`a:${norm(answer)}`, salt) } })
}

export async function checkAnswer(answer: string): Promise<boolean> {
  const p = loadParent()
  if (!p.q) return false
  return (await hashSecret(`a:${norm(answer)}`, p.salt)) === p.q.h
}

export const SEC_QUESTIONS = ['شو اسم أول مدرسة إلك؟', 'شو أحب أكلة عندك؟', 'شو اسم أول حيوان أليف إلك؟']
