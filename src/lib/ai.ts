// الذكاء الاصطناعي: كل طلب بينطلق من جهاز الطفل لمفتاح ولي الأمر مباشرة —
// ما في سيرفر بيشوف الصور، ولا مفتاح مشترك بين الناس.
import type { QuizItem, Settings, Memory } from './store.ts'
import { learningStyle, memoryBrief, subjectReads } from './store.ts'
import { personaFor } from './persona.ts'

const API_ROOT = 'https://openrouter.ai/api/v1'

/**
 * موديلات OpenRouter المجانية (:free) بتتغيّر كل فترة، فبنجرّب بالترتيب.
 * اللي بيقرا صور أول، لأن صفحات الكتب بتحتاجها. أول موديل بيشتغل بينحفظ للجلسة كلها.
 */
const MODELS = [
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
]
let modelIdx = 0

export interface LessonDraft {
  title: string
  subject: string
  summary: string
  steps: string[]
  hints: string[]
  quiz: QuizItem[]
  videoQuery: string
}

export interface PageResult {
  bookTitle: string
  subject: string
  lessons: LessonDraft[]
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string }

const NO_KEY = 'ما في مفتاح محفوظ. ولي الأمر بيحطه من قسم الأهل ← نظرة عامة.'
const BAD_KEY = 'المفتاح ما انقبل. انسخه كامل من OpenRouter (openrouter.ai/keys) واحفظه من قسم الأهل.'
const RESTRICTED = 'OpenRouter رفض الطلب لهالحساب أو هالمنطقة. جرّب حساب تاني أو مزوّد تاني.'
const CREDIT = 'رصيد حسابك في OpenRouter خلص. الموديلات المجانية بس بتشتغل بدون رصيد.'
const NO_NET = 'ما في اتصال بالإنترنت. جرّب كمان شوي.'
const TIMEOUT = 'تأخّرنا شوي بالتفكير. جرّب مرة تانية.'
const BUSY = 'مشغولين شوي هلق. جرّب كمان مرة.'
const NO_MODEL = 'ما لقينا موديل مجاني شغّال هلق. جرّب بعد شوي.'
const RATE_LIMIT = 'الموديلات المجانية مشغولة أو وصلت حدّها. استنّى دقيقة وجرّب.'

function persona(settings: Pick<Settings, 'grade' | 'gender' | 'voice'>, memory: Memory): string {
  const p = personaFor(settings)
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
    'ممنوع الأسلوب الرسمي الجاف، وممنوع الدروس الطويلة: جمل قصيرة، كل خطوة فكرة وحدة.',
    'سقراطي دائمًا: لمّحي وادّي المفتاح، وما تعطي الجواب النهائي بالشرح — الطفل بيوصل للجواب بأسئلة الخيارات.',
    'راعي عمره ومستواه: ' + (settings.grade || 'ابتدائي') + '. بلا رموز ماركداون (لا * ولا # ولا -).',
    `لا تذكري إنك ذكاء اصطناعي ولا جيميني ولا أي شركة. ${fem ? 'أنتِ' : 'أنتَ'} ${p.name} وبس.`,
    brief ? `ذاكرة الطفل: ${brief}` : '',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

const DRAFT_SHAPE =
  '{"title":"عنوان قصير","subject":"رياضيات","summary":"جملة وحدة عن شو الدرس",' +
  '"steps":["خطوة شرح 1","خطوة 2","خطوة 3"],' +
  '"hints":["تلميح 1","تلميح 2","تلميح 3"],' +
  '"quiz":[{"q":"سؤال بالخيارات","options":["خيار 1","خيار 2","خيار 3"],"answer":0,"why":"ليش هاد الجواب صح"}],' +
  '"videoQuery":"عبارة بحث قصيرة ليوتيوب"}'

interface ApiFailure {
  status: number
  code: string
  message: string
}

async function failure(res: Response): Promise<ApiFailure> {
  const body: unknown = await res.json().catch(() => null)
  const err = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error
  const code = typeof err?.code === 'number' ? err.code : res.status
  return {
    status: res.status,
    code: String(code),
    message: typeof err?.message === 'string' ? err.message : '',
  }
}

/** بيحوّل رد OpenRouter لرسالة عربية مفهومة، ومعها كود الخطأ حتى ينعرف السبب. */
function explain(f: ApiFailure): string {
  if (f.status === 400) {
    const detail = f.message.length > 120 ? `${f.message.slice(0, 120)}…` : f.message
    return `OpenRouter ما قبل الطلب (كود ${f.status}).${detail ? ` ${detail}` : ''}`
  }
  if (f.status === 401) return BAD_KEY
  if (f.status === 402) return CREDIT
  if (f.status === 403) return RESTRICTED
  if (f.status === 404) return NO_MODEL
  if (f.status === 429) return RATE_LIMIT
  return `${BUSY} (كود ${f.status})`
}

/** أجزاء الطلب (نص أو صورة) بتتحوّل لصيغة OpenRouter. */
function toChatPart(part: unknown): Record<string, unknown> {
  const p = part as { text?: string; inlineData?: { mimeType: string; data: string } }
  if (p.inlineData) {
    return { type: 'image_url', image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } }
  }
  return { type: 'text', text: p.text ?? '' }
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
    const res = await fetch(`${API_ROOT}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'X-Title': 'StudyBuddy' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: parts.map(toChatPart) }],
        temperature,
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
    if (f.status === 404 || f.status === 429 || f.status >= 500 || (f.status === 400 && /model|image|input/i.test(f.message))) continue
    return { ok: false, error: explain(f) }
  }
  return { ok: false, error: last ? explain(last) : NO_MODEL }
}

async function parseJson(res: Response): Promise<Result<Record<string, unknown>>> {
  const raw: unknown = await res.json().catch(() => null)
  const content = (raw as { choices?: Array<{ message?: { content?: unknown } }> } | null)?.choices?.[0]?.message?.content
  const text = typeof content === 'string' ? content : ''
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

  let lastError = ''
  for (let i = 0; i < MODELS.length; i += 1) {
    const candidate = MODELS[i]
    const test = await postGenerate(key, candidate, [{ text: 'رجّع {"ok":true} وبس.' }], 0)
    if (!test.ok) return { ok: false, error: test.error }
    if (test.res.ok) {
      modelIdx = i
      return { ok: true, data: candidate }
    }
    const f = await failure(test.res)
    lastError = explain(f)
    if (f.status === 404 || f.status === 429 || f.status >= 500 || (f.status === 400 && /model|image|input/i.test(f.message))) continue
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
    out.push({ q, options, answer, why: str(item.why, 'فكّر بالخطوات اللي شرحناها سوا.') })
    if (out.length === 4) break
  }
  return out
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
  const p = personaFor(settings)
  const fem = p.gender === 'f'
  const prompt = [
    fem
      ? `أنتِ ${p.name}، رفيقة دراسة. بتحكي مع ولي الأمر بلغة شامية محترمة، دافية، وبلا مبالغة.`
      : `أنتَ ${p.name}، رفيق دراسة. بتحكي مع ولي الأمر بلغة شامية محترمة، دافية، وبلا مبالغة.`,
    'اعطي ملاحظة قصيرة (٣ إلى ٤ جمل) عن طريقة تعلّم الطفل ووين بيقوى ووين بيحتاج دعم، مع اقتراح عملي واحد أو تنين.',
    'ما تعطي تشخيص طبي ولا كلام مخيف، وما تطلب معلومات شخصية.',
    `اسم الطفل(ة): ${settings.childName || 'الطفل'} — ${settings.grade}.`,
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
