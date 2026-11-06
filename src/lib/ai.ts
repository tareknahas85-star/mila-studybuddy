// قراءة صور الصفحات بالذكاء الاصطناعي: الطلب بينطلق من جهاز الطفل مباشرة لمفتاح ولي الأمر،
// فما في سيرفر بيخزّن الصور ولا مفتاح مشترك بين الناس.
const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export interface Analysis {
  topic: string
  question: string
  greeting: string
  steps: string[]
  hints: string[]
  videoQuery: string
}

export type AnalyzeResult = { ok: true; data: Analysis } | { ok: false; error: string }

interface AnalyzeInput {
  apiKey: string
  imageDataUrl: string
  childName: string
  grade: string
}

function prompt(childName: string, grade: string): string {
  return [
    'أنتِ "ميلا"، رفيقة دراسة عربية لطيفة.',
    'خاطب الطالب بصيغة محايدة (المذكر المحايد) — ما تستعمل صيغة المؤنث للطفل، ميلا هي المؤنثة الوحيدة بالحوار.',
    `اسم الطفل(ة): ${childName || 'البطل'} — ${grade}.`,
    'القاعدة: ما تعطي الجواب جاهز. لمّحي خطوة خطوة حتى يكتشف الطفل بنفسه.',
    'اقرئي الصورة (صفحة كتاب أو تمرين بخط اليد) وأجيبي بـJSON فقط بهذا الشكل:',
    '{"topic":"عنوان الدرس","question":"نص أول مسألة","greeting":"ترحيب قصير",',
    '"steps":["شرح 1","شرح 2","شرح 3"],"hints":["تلميح 1","تلميح 2","تلميح 3","تلميح 4","تلميح 5"],',
    '"videoQuery":"عبارة بحث"}',
  ].join('\n')
}

function splitDataUrl(dataUrl: string): { mime: string; base64: string } {
  const comma = dataUrl.indexOf(',')
  const header = comma === -1 ? '' : dataUrl.slice(0, comma)
  const base64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1)
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'image/jpeg'
  return { mime, base64 }
}

function toStringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').slice(0, limit)
}

export async function analyzePhoto({ apiKey, imageDataUrl, childName, grade }: AnalyzeInput): Promise<AnalyzeResult> {
  const key = apiKey.trim()
  if (key === '') return { ok: false, error: 'ما في مفتاح محفوظ. ولي الأمر بيحطه من قسم الأهل.' }

  const { mime, base64 } = splitDataUrl(imageDataUrl)
  const body = {
    contents: [
      {
        parts: [{ text: prompt(childName, grade) }, { inlineData: { mimeType: mime, data: base64 } }],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
  }

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    })
  } catch {
    return { ok: false, error: 'ما في اتصال بالإنترنت. جرّب كمان شوي.' }
  }

  if (res.status === 400 || res.status === 401 || res.status === 403) {
    return { ok: false, error: 'المفتاح غير صالح أو منتهي. ولي الأمر بيحدّثه من قسم الأهل.' }
  }
  if (res.status === 429) return { ok: false, error: 'خلص عدد الصور المسموح لليوم. جرّب بكرا 🌙' }
  if (!res.ok) return { ok: false, error: 'جيميني مشغول شوي هلق. جرّب كمان مرة.' }

  const raw: unknown = await res.json().catch(() => null)
  const parts = (raw as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null)?.candidates?.[0]
    ?.content?.parts
  const text = Array.isArray(parts) ? parts.map((p) => p.text ?? '').join('') : ''
  const parsed = text === '' ? null : (JSON.parse(text) as Partial<Analysis> | null)
  if (!parsed) return { ok: false, error: 'ما قدرنا نفهم الصورة. جرّب صورة أوضح.' }

  const str = (v: unknown, fallback = ''): string => (typeof v === 'string' && v.trim() !== '' ? v.trim() : fallback)
  return {
    ok: true,
    data: {
      topic: str(parsed.topic, 'تمرين من الصورة'),
      question: str(parsed.question),
      greeting: str(parsed.greeting, `أهلاً ${childName || 'يا بطل'}! يلا نبدأ سوا 🌟`),
      steps: toStringList(parsed.steps, 6),
      hints: toStringList(parsed.hints, 5),
      videoQuery: str(parsed.videoQuery, str(parsed.topic, '')),
    },
  }
}
