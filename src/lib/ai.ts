// الذكاء الاصطناعي: كل طلب بينطلق من جهاز الطفل لمفتاح ولي الأمر مباشرة —
// ما في سيرفر بيشوف الصور، ولا مفتاح مشترك بين الناس.
import type { QuizItem, Settings, Memory } from './store.ts'
import { learningStyle, memoryBrief, subjectReads } from './store.ts'

const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

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
const BAD_KEY = 'المفتاح غير صالح أو منتهي. ولي الأمر بيحدّثه من قسم الأهل.'
const NO_NET = 'ما في اتصال بالإنترنت. جرّب كمان شوي.'
const TIMEOUT = 'ميلا تأخّرت شوي بالتفكير. جرّب مرة تانية.'
const BUSY = 'ميلا مشغولة شوي هلق. جرّب كمان مرة.'
const LOW_QUOTA = 'خلص عدد الطلبات المسموح اليوم. جرّب بكرا 🌙'

function persona(settings: Pick<Settings, 'childName' | 'grade'>, memory: Memory): string {
  const brief = memoryBrief(memory)
  return [
    'أنتِ "ميلا"، رفيقة دراسة عربية للصغار من بلاد الشام.',
    'احكي بالعربي العامّي الشامي: حنونة، دافية، مرحة، وخفيفة — متل خيتك الكبيرة اللي بتحب تساعد.',
    'خاطب الطالب بصيغة محايدة (المذكر المحايد): "جرّب"، "شوف"، "خليك معي"، "برافو".',
    'ممنوع صيغة المؤنث للطفل (لا "جرّبي" ولا "خليكي") — ميلا هي الوحيدة المؤنثة بالحوار.',
    'ممنوع الأسلوب الرسمي الجاف، وممنوع الدروس الطويلة: جمل قصيرة، كل خطوة فكرة وحدة.',
    'سقراطي دائمًا: لمّحي وادّي المفتاح، وما تعطي الجواب النهائي بالشرح — الطفل بيوصل للجواب بأسئلة الخيارات.',
    'راعي عمره ومستواه: ' + (settings.grade || 'ابتدائي') + '. بلا رموز ماركداون (لا * ولا # ولا -).',
    'لا تذكري إنك ذكاء اصطناعي ولا جيميني ولا أي شركة. أنتِ ميلا وبس.',
    settings.childName ? `اسم الطفل(ة): ${settings.childName}.` : '',
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

async function callJson(apiKey: string, parts: unknown[], temperature: number): Promise<Result<Record<string, unknown>>> {
  const key = apiKey.trim()
  if (key === '') return { ok: false, error: NO_KEY }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60000)
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json', temperature },
      }),
      signal: controller.signal,
    })
  } catch {
    clearTimeout(timer)
    return { ok: false, error: controller.signal.aborted ? TIMEOUT : NO_NET }
  }
  clearTimeout(timer)

  if (res.status === 400 || res.status === 401 || res.status === 403) return { ok: false, error: BAD_KEY }
  if (res.status === 429) return { ok: false, error: LOW_QUOTA }
  if (!res.ok) return { ok: false, error: BUSY }

  const raw: unknown = await res.json().catch(() => null)
  const responseParts = (
    raw as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null
  )?.candidates?.[0]?.content?.parts
  const text = Array.isArray(responseParts) ? responseParts.map((p) => p.text ?? '').join('') : ''
  if (text.trim() === '') return { ok: false, error: 'ما فهمنا الرد. جرّب مرة تانية.' }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim()
  try {
    const parsed: unknown = JSON.parse(cleaned)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, error: 'ما فهمنا الرد.' }
    return { ok: true, data: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, error: 'ما فهمنا الرد. جرّب صيغة أوضح.' }
  }
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

/** ملاحظة ميلا لولي الأمر عن طريقة تعلّم الطفل — بتتولّد بس لما يطلبها. */
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
  const prompt = [
    'أنتِ ميلا، رفيقة دراسة. بتحكي مع ولي الأمر بلغة شامية محترمة، دافية، وبلا مبالغة.',
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
