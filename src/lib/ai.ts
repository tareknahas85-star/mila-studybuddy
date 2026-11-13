// الذكاء الاصطناعي: كل طلب بينطلق من جهاز الطفل لمفتاح ولي الأمر مباشرة —
// ما في سيرفر بيشوف الصور، ولا مفتاح مشترك بين الناس.
import type { QuizItem, Spot, Student, Memory } from './store.ts'
import { learningStyle, memoryBrief, subjectReads } from './store.ts'
import { COMPS } from './companions.ts'

/** اللي بيحتاجو جيميني من الطالب: الصف، الاسم، والرفيق اللي بيحكي معو. */
type Settings = Pick<Student, 'grade' | 'comp' | 'name'>

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta'

/**
 * أسماء الموديلات المجانية عند جوجل بتتغيّر كل فترة:
 * موديلات 2.5 صارت ترجّع 404 لمشاريع جديدة، والمجاني الحالي هو 3.x Flash.
 * فبنجرّب بالترتيب، وأول موديل بيشتغل بينحفظ للجلسة كلها.
 */
const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-2.5-flash']
let modelIdx = 0

export interface LessonDraft {
  title: string
  subject: string
  summary: string
  steps: string[]
  hints: string[]
  quiz: QuizItem[]
  spot?: Spot
  videoQuery: string
}

export interface PageResult {
  bookTitle: string
  subject: string
  lessons: LessonDraft[]
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string }

const NO_KEY = 'ما في مفتاح محفوظ. ولي الأمر بيحطه من قسم الأهل ← نظرة عامة.'
const BAD_KEY = 'المفتاح ما انقبل. انسخه كامل من Google AI Studio واحفظه من قسم الأهل.'
const RESTRICTED = 'المفتاح موجود بس مو مسموح له يستعمل Gemini API. جرّب مفتاح جديد من مشروع تاني.'
const COUNTRY = 'النسخة المجانية من جيميني مو متاحة لبلد/مشروع هالمفتاح. جرّب مفتاح من مشروع جديد.'
const NO_NET = 'ما في اتصال بالإنترنت. جرّب كمان شوي.'
const TIMEOUT = 'تأخّرنا شوي بالتفكير. جرّب مرة تانية.'
const BUSY = 'مشغولين شوي هلق. جرّب كمان مرة.'
const NO_MODEL = 'موديلات جيميني المجانية تغيّرت وما لقينا موديل شغّال. نزّل آخر نسخة من التطبيق.'
const LOW_QUOTA = 'خلص عدد الطلبات المسموح اليوم. جرّب بكرا 🌙'
const RATE_LIMIT = 'طلبات كتير بوقت قصير. استنّى دقيقة وجرّب.'

function persona(settings: Settings, memory: Memory): string {
  const p = COMPS[settings.comp] ?? COMPS.buddy
  const fem = p.gender === 'f'
  const brief = memoryBrief(memory)
  return [
    fem
      ? `أنتِ "${p.name}"، رفيقة دراسة عربية للصغار من بلاد الشام.`
      : `أنتَ "${p.name}"، رفيق دراسة عربي للصغار من بلاد الشام.`,
    fem
      ? 'احكي بالعربي العامّي الشامي: حنونة، دافية، مرحة، وخفيفة — متل أخت كبيرة بتحب تساعد.'
      : 'احكي بالعربي العامّي الشامي: حنون، دافي، مرح، وخفيف — متل أخ كبير بيحب يساعد.',
    'خاطب الطالب بصيغة محايدة (المذكر المحايد): "جرّب"، "شوف"، "خليك معي"، "برافو".',
    `ممنوع صيغة المؤنث للطفل (لا "جرّبي" ولا "خليكي") — ${p.name} ${fem ? 'هي الوحيدة المؤنثة' : 'هو الوحيد المذكر'} بالحوار.`,
    `طبعك: ${p.trait}.`,
    'ممنوع الأسلوب الرسمي الجاف، وممنوع الدروس الطويلة: جمل قصيرة، كل خطوة فكرة وحدة.',
    'سقراطي دائمًا: لمّحي وادّي المفتاح، وما تعطي الجواب النهائي بالشرح — الطفل بيوصل للجواب بأسئلة الخيارات.',
    'راعي عمره ومستواه: ' + (settings.grade || 'ابتدائي') + '. بلا رموز ماركداون (لا * ولا # ولا -).',
    `لا تذكري إنك ذكاء اصطناعي ولا جيميني ولا أي شركة. ${fem ? 'أنتِ' : 'أنتَ'} ${p.name} وبس.`,
    brief ? `ذاكرة الطفل: ${brief}` : '',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

const LESSON_RULES =
  'لكل سؤال اختيار: حط بـ"errs" نوع الغلط بكلمتين أو تلاتة (مثلاً "خلط بين البسط والمقام") لكل خيار غلط، وفاضي للخيار الصح. ' +
  'وإذا الدرس منو حل مسألة (رياضيات أو قواعد)، حط "spot": حل من ٣ لـ ٥ خطوات فيه خطوة وحدة فيها غلطة والطفل بيمسكها ("bad" هو رقم الخطوة الغلط من صفر). وإذا ما بيناسب الدرس خلّي "spot" بـ null.'

const DRAFT_SHAPE =
  '{"title":"عنوان قصير","subject":"رياضيات","summary":"جملة وحدة عن شو الدرس",' +
  '"steps":["خطوة شرح 1","خطوة 2","خطوة 3"],' +
  '"hints":["تلميح 1","تلميح 2","تلميح 3"],' +
  '"quiz":[{"q":"سؤال بالخيارات","options":["خيار 1","خيار 2","خيار 3"],"answer":0,"why":"ليش هاد الجواب صح","errs":["","نوع الغلط لو اختار الخيار 2","نوع الغلط لو اختار الخيار 3"]}],' +
  '"spot":{"q":"حليت المسألة بس عملت غلطة! دلّني عليها","lines":["خطوة صح","خطوة صح","خطوة فيها غلطة"],"bad":2,"why":"وين الغلط وكيف بيتصلّح"},' +
  '"videoQuery":"عبارة بحث قصيرة ليوتيوب"}'

interface ApiFailure {
  status: number
  code: string
  message: string
}

async function failure(res: Response): Promise<ApiFailure> {
  const body: unknown = await res.json().catch(() => null)
  const err = (body as { error?: { status?: string; message?: string } } | null)?.error
  return {
    status: res.status,
    code: typeof err?.status === 'string' ? err.status : '',
    message: typeof err?.message === 'string' ? err.message : '',
  }
}

/** بيحوّل رد جوجل لرسالة عربية مفهومة، ومعها كود الخطأ حتى ينعرف السبب. */
function explain(f: ApiFailure): string {
  const msg = f.message.toLowerCase()
  const code = f.code !== '' ? f.code : `HTTP ${f.status}`
  if (f.status === 400) {
    if (msg.includes('api key') || msg.includes('api_key') || msg.includes('credential')) return BAD_KEY
    if (msg.includes('country') || msg.includes('location') || msg.includes('not available')) return COUNTRY
    const detail = f.message.length > 120 ? `${f.message.slice(0, 120)}…` : f.message
    return `جوجل ما قبلت الطلب (${code}).${detail ? ` ${detail}` : ''}`
  }
  if (f.status === 401) return BAD_KEY
  if (f.status === 403) return RESTRICTED
  if (f.status === 404) return NO_MODEL
  if (f.status === 429) {
    if (msg.includes('per day') || msg.includes('daily') || msg.includes('perday')) return LOW_QUOTA
    return RATE_LIMIT
  }
  if (f.status >= 500) return `${BUSY} (كود ${f.status})`
  return `${BUSY} (كود ${f.status})`
}

async function postGenerate(
  key: string,
  model: string,
  parts: unknown[],
  temperature: number,
): Promise<{ ok: true; res: Response } | { ok: false; error: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60000)
  try {
    const res = await fetch(`${API_ROOT}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json', temperature },
      }),
      signal: controller.signal,
    })
    return { ok: true, res }
  } catch {
    return { ok: false, error: controller.signal.aborted ? TIMEOUT : NO_NET }
  } finally {
    clearTimeout(timer)
  }
}

async function callJson(apiKey: string, parts: unknown[], temperature: number): Promise<Result<Record<string, unknown>>> {
  const key = apiKey.trim()
  if (key === '') return { ok: false, error: NO_KEY }

  let last: ApiFailure | null = null
  for (let attempt = 0; attempt < MODELS.length; attempt += 1) {
    const idx = (modelIdx + attempt) % MODELS.length
    const sent = await postGenerate(key, MODELS[idx], parts, temperature)
    if (!sent.ok) return { ok: false, error: sent.error }
    if (sent.res.ok) {
      modelIdx = idx
      return parseJson(sent.res)
    }
    const f = await failure(sent.res)
    last = f
    // موديل مسكّر، تحت ضغط، أو خلصت حصته؟ جرّب اللي بعده — كل موديل إله حصة مستقلة.
    // خطأ مفتاح أو طلب غلط ما بينفع معه موديل تاني، فبيرجع فورًا.
    if (f.status === 404 || f.status === 429 || f.status >= 500) continue
    return { ok: false, error: explain(f) }
  }
  return { ok: false, error: last ? explain(last) : NO_MODEL }
}

async function parseJson(res: Response): Promise<Result<Record<string, unknown>>> {
  const raw: unknown = await res.json().catch(() => null)
  const responseParts = (
    raw as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> } | null
  )?.candidates?.[0]?.content?.parts
  const all = Array.isArray(responseParts) ? responseParts : []
  // أجزاء "التفكير" مو جزء من الجواب، فما منخلطها مع الـJSON.
  const answer = all.filter((p) => p.thought !== true).map((p) => p.text ?? '').join('')
  const text = answer.trim() !== '' ? answer : all.map((p) => p.text ?? '').join('')
  if (text.trim() === '') return { ok: false, error: 'ما فهمنا الرد. جرّب مرة تانية.' }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim()
  // ساعات الموديل بيحط جملة قبل الـJSON أو بعدها، أو بيلفّه بكود بلوك بالنص — فمنقتطع الأقواس.
  let parsed = asObject(cleaned)
  if (!parsed) {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) parsed = asObject(cleaned.slice(start, end + 1))
  }
  if (!parsed) return { ok: false, error: 'ما فهمنا الرد. جرّب صيغة أوضح.' }
  return { ok: true, data: parsed }
}

function asObject(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * فحص مفتاح ولي الأمر: بيتأكد إن المفتاح مقبول، إن في موديل مجاني متاح،
 * وإن التوليد بيشتغل فعلًا — وبيرجّع اسم الموديل الشغّال.
 */
export async function checkKey(apiKey: string): Promise<Result<string>> {
  const key = apiKey.trim()
  if (key === '') return { ok: false, error: NO_KEY }

  let listed: Response
  try {
    listed = await fetch(`${API_ROOT}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } })
  } catch {
    return { ok: false, error: NO_NET }
  }
  if (!listed.ok) return { ok: false, error: explain(await failure(listed)) }

  const raw: unknown = await listed.json().catch(() => null)
  const models = (raw as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> } | null)?.models ?? []
  const usable = new Set(
    models
      .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m) => (m.name ?? '').replace(/^models\//, '')),
  )
  const model = MODELS.find((m) => usable.has(m)) ?? [...usable][0] ?? ''
  if (model === '') {
    return { ok: false, error: 'المفتاح مقبول بس ما في موديل مجاني متاح لحسابك. جرّب مفتاح جديد من AI Studio.' }
  }

  const candidates = MODELS.filter((m) => usable.has(m))
  let lastError = ''
  for (const candidate of candidates.length > 0 ? candidates : [model]) {
    const test = await postGenerate(key, candidate, [{ text: 'رجّع {"ok":true} وبس.' }], 0)
    if (!test.ok) return { ok: false, error: test.error }
    if (test.res.ok) {
      const at = MODELS.indexOf(candidate)
      if (at >= 0) modelIdx = at
      return { ok: true, data: candidate }
    }
    const f = await failure(test.res)
    lastError = explain(f)
    if (f.status === 404 || f.status === 429 || f.status >= 500) continue
    return { ok: false, error: lastError }
  }
  return { ok: false, error: lastError || NO_MODEL }
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

function strList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim()).slice(0, limit)
}

function toQuiz(value: unknown): QuizItem[] {
  if (!Array.isArray(value)) return []
  const out: QuizItem[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Record<string, unknown>
    const q = str(item.q)
    const options = strList(item.options, 4)
    if (q === '' || options.length < 2) continue
    const rawAnswer = typeof item.answer === 'number' ? item.answer : Number(item.answer)
    const answer = Number.isFinite(rawAnswer) ? Math.min(options.length - 1, Math.max(0, Math.floor(rawAnswer))) : 0
    const errs = Array.isArray(item.errs)
      ? item.errs.map((e) => (typeof e === 'string' ? e.trim() : '')).slice(0, options.length)
      : []
    out.push({ q, options, answer, why: str(item.why, 'فكّر بالخطوات اللي شرحناها سوا.'), errs })
    if (out.length === 4) break
  }
  return out
}

function toSpot(value: unknown): Spot | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const lines = strList(raw.lines, 5)
  const bad = typeof raw.bad === 'number' ? Math.floor(raw.bad) : Number(raw.bad)
  if (lines.length < 3 || !Number.isFinite(bad) || bad < 0 || bad >= lines.length) return undefined
  return { q: str(raw.q, 'حليت المسألة بس عملت غلطة! دلّني عليها:'), lines, bad, why: str(raw.why, 'شوف الخطوة اللي علّمنا عليها وجرّب تصلّحها.') }
}

function toDraft(value: unknown, fallbackTitle: string, fallbackSubject: string): LessonDraft | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const steps = strList(raw.steps, 8)
  if (steps.length === 0) return null
  const subject = str(raw.subject, fallbackSubject)
  const title = str(raw.title, fallbackTitle)
  return {
    title,
    subject,
    summary: str(raw.summary),
    steps,
    hints: strList(raw.hints, 5),
    quiz: toQuiz(raw.quiz),
    spot: toSpot(raw.spot),
    videoQuery: str(raw.videoQuery, `${subject} ${title}`),
  }
}

/** سؤال حر من شريط البحث: شرح + تلميحات + أسئلة خيارات. */
export async function askMila(input: {
  apiKey: string
  settings: Settings
  memory: Memory
  question: string
  bookTitle?: string
}): Promise<Result<LessonDraft>> {
  const { apiKey, settings, memory, question, bookTitle } = input
  const prompt = [
    persona(settings, memory),
    bookTitle ? `الطفل فاتح كتاب: "${bookTitle}". خلّي الشرح مناسب لهالكتاب إذا السؤال إله علاقة.` : '',
    `سؤال الطفل: "${question}"`,
    'اشرح بشكل مبسّط وممتع، بخطوات قصيرة متسلسلة (٢ إلى ٥ خطوات)، وخلي التلميحات تساعدو يفكّر مش تعطيه الجواب.',
    'الأخير: حط ٢ إلى ٣ أسئلة اختيار من متعدد (٣ خيارات) يحلّها الطفل ليتأكد إنه فهم، ولكل سؤال جواب صح وسبب قصير.',
    LESSON_RULES,
    'رجّع JSON فقط بهالشكل:',
    DRAFT_SHAPE,
  ]
    .filter((line) => line !== '')
    .join('\n')

  const res = await callJson(apiKey, [{ text: prompt }], 0.55)
  if (!res.ok) return res
  const draft = toDraft(res.data, question.slice(0, 60), 'درس')
  if (!draft) return { ok: false, error: 'ما قدرنا نرتّب الشرح. جرّب تكتب السؤال بشكل تاني.' }
  return { ok: true, data: draft }
}

/**
 * صفحة مصوّرة (كتاب، دفتر، سبورة): جيميني بيقرا كل شي فيها،
 * بيرتّب الدروس الموجودة، وكل درس بيصير بطاقة محفوظة على الجهاز مع الصورة.
 */
export async function analyzePage(input: {
  apiKey: string
  settings: Settings
  memory: Memory
  imageDataUrl: string
  bookTitle?: string
}): Promise<Result<PageResult>> {
  const { apiKey, settings, memory, imageDataUrl, bookTitle } = input
  const comma = imageDataUrl.indexOf(',')
  const header = comma === -1 ? '' : imageDataUrl.slice(0, comma)
  const base64 = comma === -1 ? imageDataUrl : imageDataUrl.slice(comma + 1)
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'image/jpeg'

  const prompt = [
    persona(settings, memory),
    'الصورة ممكن تكون صفحة كتاب، أو صفحة دفتر بخط اليد، أو صورة سبورة.',
    'اقرا كل شي بالصورة بتركيز: العنوان، النص، الأرقام، التمارين، والملاحظات المكتوبة.',
    'رتّب اللي بالصورة لدروس: إذا الصفحة فيها درس واحد رجّع درس واحد، وإذا فيها أكتر رجّع كل الدروس (٣ كحد أقصى).',
    'كل درس: عنوان قصير، ملخص بجملة، شرح بخطوات (٢ إلى ٥)، تلميحات (٢ إلى ٣)، و٢ إلى ٣ أسئلة خيارات (٣ خيارات) مع الجواب الصح والسبب.',
    'إذا الصورة مو واضحة أو ما فيها درس، رجّع "lessons": [] و"note" بجملة بسيطة للطفل.',
    LESSON_RULES,
    bookTitle ? `هاي الصفحة من كتاب اسمه: "${bookTitle}".` : '',
    'رجّع JSON فقط بهالشكل:',
    '{"bookTitle":"اسم الكتاب إذا ظهر","subject":"المادة","note":"","lessons":[' + DRAFT_SHAPE + ']}',
  ]
    .filter((line) => line !== '')
    .join('\n')

  const res = await callJson(apiKey, [{ text: prompt }, { inlineData: { mimeType: mime, data: base64 } }], 0.4)
  if (!res.ok) return res

  const rawLessons = Array.isArray(res.data.lessons) ? res.data.lessons : []
  const lessons: LessonDraft[] = []
  for (const raw of rawLessons) {
    const draft = toDraft(raw, 'درس من الصورة', str(res.data.subject, bookTitle ?? 'درس'))
    if (draft) lessons.push(draft)
    if (lessons.length === 3) break
  }
  if (lessons.length === 0) {
    return { ok: false, error: str(res.data.note, 'ما لقينا درس واضح بالصورة. جرّب صورة أقرب وأوضح.') }
  }
  return {
    ok: true,
    data: {
      bookTitle: str(res.data.bookTitle, bookTitle ?? ''),
      subject: str(res.data.subject, lessons[0].subject),
      lessons,
    },
  }
}

/** ملاحظة الشخصية لولي الأمر عن طريقة تعلّم الطفل — بتتولّد بس لما يطلبها. */
export async function learningInsight(input: {
  apiKey: string
  settings: Settings
  memory: Memory
}): Promise<Result<string>> {
  const { apiKey, settings, memory } = input
  const subjects = subjectReads(memory)
    .map((s) => `${s.subject}: ${s.done} درس، دقة ${s.accuracy}%`)
    .join(' | ')
  const style = learningStyle(memory)
  const p = COMPS[settings.comp] ?? COMPS.buddy
  const fem = p.gender === 'f'
  const prompt = [
    fem
      ? `أنتِ ${p.name}، رفيقة دراسة. بتحكي مع ولي الأمر بلغة شامية محترمة، دافية، وبلا مبالغة.`
      : `أنتَ ${p.name}، رفيق دراسة. بتحكي مع ولي الأمر بلغة شامية محترمة، دافية، وبلا مبالغة.`,
    'اعطي ملاحظة قصيرة (٣ إلى ٤ جمل) عن طريقة تعلّم الطفل ووين بيقوى ووين بيحتاج دعم، مع اقتراح عملي واحد أو تنين.',
    'ما تعطي تشخيص طبي ولا كلام مخيف، وما تطلب معلومات شخصية.',
    `اسم الطفل(ة): ${settings.name || 'الطالب'} — ${settings.grade}.`,
    `الدروس: ${subjects || 'ما في دروس لسا'}`,
    `الأسلوب: ${style.label} — ${style.line}`,
    `الاهتمامات: ${memory.interests.join('، ') || 'ما انكتبت لسا'}`,
    `ملاحظات ولي الأمر: ${memory.notes.trim() || 'ما في'}`,
    'رجّع JSON فقط: {"insight":"الملاحظة هنا"}',
  ].join('\n')

  const res = await callJson(apiKey, [{ text: prompt }], 0.6)
  if (!res.ok) return res
  const text = str(res.data.insight)
  if (text === '') return { ok: false, error: 'ما طلع في ملاحظة. جرّب مرة تانية.' }
  return { ok: true, data: text }
}

/** "ما فهمت": نفس الخطوة بطريقة تانية ومثال من حياة الطفل. */
export async function reexplain(input: {
  apiKey: string
  settings: Settings
  memory: Memory
  lessonTitle: string
  step: string
}): Promise<Result<string>> {
  const { apiKey, settings, memory, lessonTitle, step } = input
  const prompt = [
    persona(settings, memory),
    `الطفل عم يدرس درس "${lessonTitle}" وما فهم هالخطوة: "${step}"`,
    'اشرحها بطريقة تانية تماماً بمثال من حياة الطفل اليومية، بجملتين أو تلاتة قصار، وبلا ما تعطي جواب أي سؤال.',
    'رجّع JSON فقط: {"text":"الشرح هنا"}',
  ].join('\n')
  const res = await callJson(apiKey, [{ text: prompt }], 0.7)
  if (!res.ok) return res
  const text = str(res.data.text)
  if (text === '') return { ok: false, error: 'ما قدرنا نشرحها بطريقة تانية. جرّب مرة تانية.' }
  return { ok: true, data: text }
}

/** تقرير الأسبوع لولي الأمر بصوت الرفيق، من أرقام جاهزة (بلا اختراع معلومات). */
export async function weeklyNarrative(input: {
  apiKey: string
  settings: Settings
  memory: Memory
  facts: string
}): Promise<Result<string>> {
  const { apiKey, settings, memory, facts } = input
  const prompt = [
    persona(settings, memory),
    'هلق بتحكي مع ولي الأمر (مو مع الطفل) بلغة شامية محترمة ودافية، وبتحكي عن الطفل بصيغة الغائب.',
    'اكتب تقرير أسبوعي قصير (٤ إلى ٥ جمل) من هالمعلومات بس، وما تخترع أرقام أو معلومات مو موجودة:',
    facts,
    'اختم باقتراح عملي واحد بسيط للأهل. بلا ماركداون.',
    'رجّع JSON فقط: {"report":"التقرير هنا"}',
  ].join('\n')
  const res = await callJson(apiKey, [{ text: prompt }], 0.5)
  if (!res.ok) return res
  const text = str(res.data.report)
  if (text === '') return { ok: false, error: 'ما طلع تقرير. جرّب مرة تانية.' }
  return { ok: true, data: text }
}
