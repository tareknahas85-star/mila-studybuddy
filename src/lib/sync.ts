// مزامنة الأهل والطالب عبر Firebase (اختيارية): بلا إعداد Firebase التطبيق بيشتغل محلي كامل.
// - جهاز الأهل: بيسجّل دخول بإيميل، وبيولّد "كود ربط" (فيه إعدادات المشروع + كود صالح ١٠ دقايق).
// - جهاز الطالب: بيلصق الكود، وبيسجّل دخول مجهول، وبيكتب ملخّص التقدم والذاكرة.
// ما بينرفع: صور الكتب ولا نصوص الدروس ولا مفتاح جيميني. بس أرقام التقدم وأنواع الأغلاط وإعدادات الأهل.
import type { Firestore } from 'firebase/firestore'
import type { Auth } from 'firebase/auth'
import type { Acc, CompId } from './companions.ts'
import type { Gender, Homework, Memory, Progress, Student } from './store.ts'
import type { SkinId } from './rewards.ts'

export type FbConfig = Record<string, string>

export interface CloudState {
  config: FbConfig | null
  fid: string
  role: '' | 'parent' | 'device'
  email: string
}

export type CloudResult<T> = { ok: true; data: T } | { ok: false; error: string }

const KEY = 'sb.cloud.v1'
const EMPTY: CloudState = { config: null, fid: '', role: '', email: '' }

export function loadCloud(): CloudState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const p: unknown = JSON.parse(raw)
    return p && typeof p === 'object' ? { ...EMPTY, ...(p as Partial<CloudState>) } : { ...EMPTY }
  } catch {
    return { ...EMPTY }
  }
}

export function saveCloud(c: CloudState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    // التخزين محجوب.
  }
}

export function clearCloud(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ما في شي نعمله.
  }
}

/** بيقبل firebaseConfig كـJSON أو كنص JavaScript منسوخ من كونسول Firebase. */
export function parseConfig(text: string): FbConfig | null {
  const out: FbConfig = {}
  const re = /["']?([A-Za-z]+)["']?\s*:\s*["']([^"']+)["']/g
  let m: RegExpExecArray | null = re.exec(text)
  while (m) {
    out[m[1]] = m[2]
    m = re.exec(text)
  }
  return out.apiKey && out.projectId && out.appId ? out : null
}

interface Boot {
  auth: Auth
  db: Firestore
}

let booted: { key: string; p: Promise<Boot> } | null = null

function boot(config: FbConfig): Promise<Boot> {
  const key = JSON.stringify(config)
  if (booted && booted.key === key) return booted.p
  const p = (async (): Promise<Boot> => {
    const { initializeApp, getApps } = await import('firebase/app')
    const { getAuth } = await import('firebase/auth')
    const { initializeFirestore, getFirestore, persistentLocalCache } = await import('firebase/firestore')
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(config)
    let db: Firestore
    try {
      db = initializeFirestore(app, { localCache: persistentLocalCache() })
    } catch {
      db = getFirestore(app)
    }
    return { auth: getAuth(app), db }
  })()
  booted = { key, p }
  return p
}

function explain(e: unknown): string {
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : ''
  if (code.includes('network')) return 'ما في اتصال بالإنترنت.'
  if (code === 'permission-denied') return 'القواعد (Rules) مو منشورة أو ما بتسمح. تأكد من نشر firestore.rules.'
  if (code === 'auth/operation-not-allowed') return 'فعّل Email/Password و Anonymous من Authentication بكونسول Firebase.'
  if (code === 'auth/email-already-in-use' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
    return 'الإيميل أو كلمة السر غلط.'
  if (code === 'auth/weak-password') return 'كلمة السر ضعيفة (٦ خانات على الأقل).'
  if (code === 'auth/invalid-email') return 'الإيميل مو صحيح.'
  if (code === 'auth/api-key-not-valid' || code === 'auth/invalid-api-key') return 'مفتاح Firebase (apiKey) مو صحيح.'
  return code !== '' ? `صار خطأ (${code}).` : 'صار خطأ بالمزامنة. جرّب كمان مرة.'
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function newCode(): string {
  const a = new Uint8Array(8)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

export const isCloudReady = (c: CloudState): boolean => c.config !== null && c.fid !== '' && c.role !== ''

/** جهاز الأهل: دخول بإيميل (بيعمل الحساب إذا أول مرة) + إنشاء وثيقة العيلة. */
export async function connectParent(config: FbConfig, email: string, password: string): Promise<CloudResult<CloudState>> {
  try {
    const { auth, db } = await boot(config)
    const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth')
    const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore')
    let uid = ''
    try {
      uid = (await signInWithEmailAndPassword(auth, email, password)).user.uid
    } catch (e) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : ''
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
        uid = (await createUserWithEmailAndPassword(auth, email, password)).user.uid
      } else {
        throw e
      }
    }
    const ref = doc(db, 'families', uid)
    if (!(await getDoc(ref)).exists()) await setDoc(ref, { parents: [uid], createdAt: serverTimestamp() })
    const state: CloudState = { config, fid: uid, role: 'parent', email }
    saveCloud(state)
    return { ok: true, data: state }
  } catch (e) {
    return { ok: false, error: explain(e) }
  }
}

/** كود الربط: نص واحد بينلصق على جهاز الطالب (إعدادات المشروع + كود لمرة وحدة). */
export async function createPairing(state: CloudState): Promise<CloudResult<string>> {
  if (!state.config || state.role !== 'parent') return { ok: false, error: 'سجّل دخول الأهل أول.' }
  try {
    const { db } = await boot(state.config)
    const { doc, setDoc, Timestamp } = await import('firebase/firestore')
    const code = newCode()
    await setDoc(doc(db, 'pairings', code), { fid: state.fid, exp: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000) })
    return { ok: true, data: `SB1.${encodeURIComponent(JSON.stringify({ c: state.config, k: code }))}` }
  } catch (e) {
    return { ok: false, error: explain(e) }
  }
}

/** جهاز الطالب: بيلصق كود الربط ويصير جهاز مسجّل بالعيلة. */
export async function joinWithString(text: string): Promise<CloudResult<CloudState>> {
  let config: FbConfig
  let code: string
  try {
    const trimmed = text.trim()
    if (!trimmed.startsWith('SB1.')) throw new Error('format')
    const parsed = JSON.parse(decodeURIComponent(trimmed.slice(4))) as { c?: FbConfig; k?: string }
    if (!parsed.c || typeof parsed.k !== 'string') throw new Error('format')
    config = parsed.c
    code = parsed.k
  } catch {
    return { ok: false, error: 'كود الربط مو صحيح. انسخو كامل من قسم الأهل.' }
  }
  try {
    const { auth, db } = await boot(config)
    const { signInAnonymously } = await import('firebase/auth')
    const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore')
    const uid = (await signInAnonymously(auth)).user.uid
    const pair = await getDoc(doc(db, 'pairings', code))
    if (!pair.exists()) return { ok: false, error: 'الكود مو موجود أو انتهت صلاحيتو. اطلب كود جديد.' }
    const data = pair.data() as { fid?: string; exp?: { toMillis?: () => number } }
    const exp = typeof data.exp?.toMillis === 'function' ? data.exp.toMillis() : 0
    if (typeof data.fid !== 'string' || exp < Date.now()) return { ok: false, error: 'انتهت صلاحية الكود. اطلب كود جديد.' }
    await setDoc(doc(db, 'families', data.fid, 'devices', uid), { code, at: serverTimestamp() })
    const state: CloudState = { config, fid: data.fid, role: 'device', email: '' }
    saveCloud(state)
    return { ok: true, data: state }
  } catch (e) {
    return { ok: false, error: explain(e) }
  }
}

/** ملخّص الطالب اللي بيرفعو جهازو: أرقام وأنواع أغلاط بس. */
export interface CloudKid {
  id: string
  profile: { name: string; grade: string; gender: Gender; av: string; comp: CompId; skin: SkinId; acc: Acc }
  progress: Omit<Progress, 'covers'>
  memory: Pick<Memory, 'skills' | 'tags' | 'subjects' | 'signals' | 'topics'>
  limitMin: number
}

export async function pushKid(state: CloudState, s: Student, progress: Progress, memory: Memory): Promise<void> {
  if (!state.config || state.role !== 'device') return
  try {
    const { db } = await boot(state.config)
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
    const { covers: _covers, ...slim } = progress
    void _covers
    await setDoc(
      doc(db, 'families', state.fid, 'kids', s.id),
      {
        profile: { name: s.name, grade: s.grade, gender: s.gender, av: s.av, comp: s.comp, skin: s.skin, acc: s.acc },
        progress: slim,
        memory: {
          skills: memory.skills,
          tags: memory.tags,
          subjects: memory.subjects,
          signals: memory.signals,
          topics: memory.topics.slice(0, 10),
        },
        limitMin: s.limitMin,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch {
    // بلا نت أو القواعد مو جاهزة: Firestore بيخزّن محلياً وبيرفع لما يرجع الاتصال، والتطبيق ما بيتعطّل.
  }
}

type Stop = () => void

/** جهاز الأهل: بيتابع كل الطلاب اللي رفعوا ملخّصاتهم. */
export function watchKids(state: CloudState, cb: (kids: CloudKid[]) => void, onError: (m: string) => void): Stop {
  if (!state.config) return () => undefined
  let stop: Stop = () => undefined
  let dead = false
  void (async () => {
    try {
      const { db } = await boot(state.config as FbConfig)
      const { collection, onSnapshot } = await import('firebase/firestore')
      const off = onSnapshot(
        collection(db, 'families', state.fid, 'kids'),
        (snap) => {
          cb(snap.docs.map((d) => ({ ...(d.data() as Omit<CloudKid, 'id'>), id: d.id })))
        },
        (e) => onError(explain(e)),
      )
      if (dead) off()
      else stop = off
    } catch (e) {
      onError(explain(e))
    }
  })()
  return () => {
    dead = true
    stop()
  }
}

export async function pushLimit(state: CloudState, kidId: string, limitMin: number): Promise<void> {
  if (!state.config) return
  try {
    const { db } = await boot(state.config)
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
    await setDoc(doc(db, 'families', state.fid, 'kids', kidId, 'settings', 'main'), { limitMin, at: serverTimestamp() }, { merge: true })
  } catch {
    // بيتزامن لما يرجع الاتصال.
  }
}

/** جهاز الطالب: بيتابع حد الوقت اللي حطّو الأهل. */
export function watchLimit(state: CloudState, kidId: string, cb: (limitMin: number) => void): Stop {
  if (!state.config) return () => undefined
  let stop: Stop = () => undefined
  let dead = false
  void (async () => {
    try {
      const { db } = await boot(state.config as FbConfig)
      const { doc, onSnapshot } = await import('firebase/firestore')
      const off = onSnapshot(doc(db, 'families', state.fid, 'kids', kidId, 'settings', 'main'), (snap) => {
        const v = (snap.data() as { limitMin?: unknown } | undefined)?.limitMin
        if (typeof v === 'number') cb(v)
      })
      if (dead) off()
      else stop = off
    } catch {
      // بلا مزامنة: بيضل الحد المحلي.
    }
  })()
  return () => {
    dead = true
    stop()
  }
}

export async function sendHomework(state: CloudState, kidId: string, hw: Homework): Promise<CloudResult<true>> {
  if (!state.config) return { ok: false, error: 'مو مربوط بـ Firebase.' }
  try {
    const { db } = await boot(state.config)
    const { doc, setDoc } = await import('firebase/firestore')
    await setDoc(doc(db, 'families', state.fid, 'kids', kidId, 'homework', hw.id), {
      msg: hw.msg,
      photo: hw.photo,
      ts: hw.ts,
      done: false,
    })
    return { ok: true, data: true }
  } catch (e) {
    return { ok: false, error: explain(e) }
  }
}

/** جهاز الطالب: بيتابع الواجبات الجديدة. */
export function watchHomework(state: CloudState, kidId: string, cb: (list: Homework[]) => void): Stop {
  if (!state.config) return () => undefined
  let stop: Stop = () => undefined
  let dead = false
  void (async () => {
    try {
      const { db } = await boot(state.config as FbConfig)
      const { collection, onSnapshot } = await import('firebase/firestore')
      const off = onSnapshot(collection(db, 'families', state.fid, 'kids', kidId, 'homework'), (snap) => {
        cb(
          snap.docs.map((d) => {
            const x = d.data() as Partial<Homework>
            return { id: d.id, msg: x.msg ?? '', photo: x.photo ?? '', ts: x.ts ?? 0, done: x.done === true }
          }),
        )
      })
      if (dead) off()
      else stop = off
    } catch {
      // بلا مزامنة.
    }
  })()
  return () => {
    dead = true
    stop()
  }
}

export async function markHomeworkDone(state: CloudState, kidId: string, id: string): Promise<void> {
  if (!state.config) return
  try {
    const { db } = await boot(state.config)
    const { doc, setDoc } = await import('firebase/firestore')
    await setDoc(doc(db, 'families', state.fid, 'kids', kidId, 'homework', id), { done: true }, { merge: true })
  } catch {
    // بيتزامن لما يرجع الاتصال.
  }
}
