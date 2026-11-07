// صوت ميلا الطبيعي: جيميني (Gemini TTS) بيولّد الصوت بصوت بشري حقيقي
// بوصف لهجة شامية دافية، بدل صوت الجهاز الروبوتي.
// الصوت بينحفظ على الجهاز (IndexedDB) فبيرجع فورًا وبيشتغل بلا نت بعد أول مرة.
// إذا ما في مفتاح أو نت أو صار خطأ، الدرس بيرجع لصوت الجهاز (lib/speech.ts).
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'
const MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']
const DB_NAME = 'mila-voice'
const STORE = 'audio'
const MAX_CACHED = 40

/** نسخة وصف الصوت: إذا تغيّر الوصف، الصوت المخزّن القديم ما بينستعمل. */
const STYLE_VERSION = 1
const STYLE =
  'تتكلم باللهجة السورية الشامية الدارجة، بصوت دافئ حنون ومرح، كأنها أخت كبيرة عم تحكي لطفلها بحماس هادي، واضحة وبطيئة شوي، مع وقفات قصيرة بين الجمل'

export interface VoiceOption {
  id: string
  label: string
  /** صوت بنت ولا صبي — الأهل بيختاروا اللي بيناسب الطفل. */
  group: 'بنت' | 'صبي'
}

export const VOICES: VoiceOption[] = [
  { id: 'Sulafat', label: 'دافية وحنونة', group: 'بنت' },
  { id: 'Achernar', label: 'ناعمة وهادية', group: 'بنت' },
  { id: 'Leda', label: 'شابة ومرحة', group: 'بنت' },
  { id: 'Aoede', label: 'خفيفة وحيوية', group: 'بنت' },
  { id: 'Puck', label: 'مرح ومتحمس', group: 'صبي' },
  { id: 'Achird', label: 'ودود وهادي', group: 'صبي' },
]

export const DEFAULT_VOICE = 'Sulafat'

/** جملة قصيرة لتجربة الصوت من قسم الأهل. */
export const VOICE_SAMPLE = 'أهلين! أنا ميلا، رفيقتك بالدراسة. يلا نحلّ سوا ونتعلّم شي جديد اليوم.'

export interface SpeakOptions {
  text: string
  apiKey: string
  voice: string
}

export interface SpeakCallbacks {
  /** أول ما يبلّش الصوت فعليًا (بعد ما يخلص التوليد). */
  onStart?: () => void
  onEnd?: () => void
  /** فشل التوليد كله — عادةً منرجّع لصوت الجهاز. */
  onError?: (error: unknown) => void
}

export function naturalReady(apiKey: string): boolean {
  if (apiKey.trim() === '') return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
  return true
}

// ---------- تشغيل الصوت (Web Audio) ----------
// منفتح الـAudioContext وقت ضغطة الطفل، فبيسمح لنا نشغّل الصوت بعدين
// حتى لو التوليد أخد ثواني (متصفحات الأندرويد بتمنع التشغيل بلا لمسة).

let ctx: AudioContext | null = null
let source: AudioBufferSourceNode | null = null
let session = 0
let stopped = false

export function primeVoice(): void {
  try {
    if (ctx === null) {
      const Ctor = window.AudioContext
      if (!Ctor) return
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // ما في صوت بالمتصفح — منكمّل بلا ضرر.
  }
}

function stopSource(): void {
  if (source !== null) {
    try {
      source.stop()
    } catch {
      // المصدر ممكن يكون خلص من حاله.
    }
    source = null
  }
}

export function stopNatural(): void {
  stopped = true
  session += 1
  stopSource()
}

// ---------- تخزين الصوت على الجهاز ----------

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, 1)
    } catch {
      resolve(null)
      return
    }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
  return dbPromise
}

async function readAudio(key: string): Promise<ArrayBuffer | null> {
  const db = await openDb()
  if (db === null) return null
  return await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result instanceof ArrayBuffer ? req.result : null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function writeAudio(key: string, data: ArrayBuffer): Promise<void> {
  const db = await openDb()
  if (db === null) return
  try {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    store.put(data, key)
    // ما منخلي الصوت يكبر بلا حدود على جهاز الطفل.
    const keysReq = store.getAllKeys()
    keysReq.onsuccess = () => {
      const keys = keysReq.result
      if (keys.length > MAX_CACHED) {
        for (const old of keys.slice(0, keys.length - MAX_CACHED)) store.delete(old)
      }
    }
  } catch {
    // التخزين ممتلئ: منكمل بالصوت بس بلا كاش.
  }
}

// ---------- نداء جيميني ----------

async function hashKey(text: string): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(text)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    let h = 2166136261
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(16)
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

function pickAudio(json: unknown): string | null {
  const j = json as { steps?: unknown; output_audio?: { data?: unknown } }
  const steps = Array.isArray(j?.steps) ? (j.steps as Array<{ content?: unknown }>) : []
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const content = Array.isArray(steps[i]?.content) ? (steps[i].content as Array<{ type?: string; data?: unknown }>) : []
    for (let k = content.length - 1; k >= 0; k -= 1) {
      const block = content[k]
      if (block?.type === 'audio' && typeof block.data === 'string') return block.data
    }
  }
  const alt = j?.output_audio?.data
  return typeof alt === 'string' ? alt : null
}

async function generate(text: string, opts: SpeakOptions): Promise<ArrayBuffer> {
  const key = await hashKey(`${opts.voice}|${STYLE_VERSION}|${text}`)
  const cached = await readAudio(key)
  if (cached) return cached

  let lastError: unknown = new Error('tts-failed')
  for (const model of MODELS) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'x-goog-api-key': opts.apiKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: [
            {
              type: 'user_input',
              content: [
                { type: 'text', text, annotations: [{ type: 'speech_metadata', style: STYLE }] },
              ],
            },
          ],
          response_format: { type: 'audio' },
          generation_config: { speech_config: [{ voice: opts.voice }] },
        }),
      })
      if (!res.ok) {
        lastError = new Error(`tts-${res.status}`)
        // مفتاح غلط أو صلاحية: ما في فايدة نعيد على موديل تاني.
        if (res.status === 400 || res.status === 401 || res.status === 403) break
        continue
      }
      const json: unknown = await res.json()
      const data = pickAudio(json)
      if (data === null) {
        lastError = new Error('tts-no-audio')
        continue
      }
      const bytes = base64ToBytes(data)
      const buffer = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(buffer).set(bytes)
      await writeAudio(key, buffer)
      return buffer
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

/** تقسيم الشرح لمقاطع صغيرة: أول مقطع قصير حتى يبلّش الصوت بسرعة. */
function splitText(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean === '') return []
  const parts = clean.split(/(?<=[.!؟?:])\s+/)
  const out: string[] = []
  let current = ''
  let limit = 130
  for (const part of parts) {
    if (current !== '' && current.length + part.length > limit) {
      out.push(current.trim())
      current = part
      limit = 260
    } else {
      current = current === '' ? part : `${current} ${part}`
    }
  }
  if (current.trim() !== '') out.push(current.trim())
  return out
}

async function decode(data: ArrayBuffer): Promise<AudioBuffer> {
  primeVoice()
  if (ctx === null) throw new Error('no-audio-context')
  return await ctx.decodeAudioData(data.slice(0))
}

function play(audio: AudioBuffer): Promise<void> {
  return new Promise((resolve) => {
    if (ctx === null) {
      resolve()
      return
    }
    const node = ctx.createBufferSource()
    node.buffer = audio
    node.connect(ctx.destination)
    node.onended = () => {
      if (source === node) source = null
      resolve()
    }
    source = node
    try {
      node.start()
    } catch {
      resolve()
    }
  })
}

/** بيولّد ويشغّل الشرح بصوت ميلا الطبيعي. بيرجّع false إذا ما في إمكانية صوت. */
export function speakNatural(opts: SpeakOptions, cb: SpeakCallbacks = {}): boolean {
  primeVoice()
  stopNatural()
  stopped = false
  const mine = session
  const stale = (): boolean => stopped || session !== mine

  const run = async (): Promise<void> => {
    const chunks = splitText(opts.text)
    if (chunks.length === 0) {
      cb.onEnd?.()
      return
    }
    let pending: Promise<ArrayBuffer> | null = null
    let started = false
    for (let i = 0; i < chunks.length; i += 1) {
      const current = pending ?? generate(chunks[i], opts)
      pending = i + 1 < chunks.length ? generate(chunks[i + 1], opts) : null
      const data = await current
      if (stale()) return
      const audio = await decode(data)
      if (stale()) return
      if (!started) {
        started = true
        cb.onStart?.()
      }
      await play(audio)
      if (stale()) return
    }
    cb.onEnd?.()
  }

  void run().catch((error: unknown) => {
    if (!stale()) cb.onError?.(error)
  })
  return true
}
