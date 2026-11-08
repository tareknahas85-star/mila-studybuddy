// كل شي بينحفظ على جهاز الطفل — ما في سيرفر، ولا حساب، ولا مفتاح بيطلع من الجهاز.
// كل طالب (ليلي/روي) إله حساب مستقل: إعداداته، نجومه، دروسه، كتبه، وذاكرته.
// رقم ولي الأمر ومفتاح جيميني مشتركين بين الطلاب (إعداد ولي الأمر).
export type Mood = 'idle' | 'think' | 'laugh' | 'tired' | 'proud'
export type Gender = 'f' | 'm'
export type ProfileId = 'lily' | 'roy'

export const PROFILES: ProfileId[] = ['lily', 'roy']

export interface Settings {
  childName: string
  grade: string
  gender: Gender
  /** رقم ولي الأمر: أول من يفتح التطبيق بيحطه، وبعده ما بيقدر الطفل يفوته. */
  parentPin: string
  /** مفتاح جيميني المجاني: ولي الأمر بيحطه مرة واحدة، وبيضل على الجهاز. */
  geminiKey: string
  /** صوت الشخصية الطبيعي (Gemini TTS) — اسم الصوت من مكتبة جوجل. */
  voice: string
  /** حساب الطالب المفتوح حاليًا. */
  profile: ProfileId
}

/** إعدادات الطالب نفسه (بتنحفظ لحسابه لحاله). */
export interface Student {
  childName: string
  grade: string
  gender: Gender
  voice: string
}

/** إعدادات ولي الأمر المشتركة بين الطلاب. */
export interface ParentData {
  parentPin: string
  geminiKey: string
  profile: ProfileId
}

export interface Progress {
  stars: number
  lessonsDone: number
  /** أيام النشاط (YYYY-MM-DD) لحساب السلسلة. */
  days: string[]
}

export interface QuizItem {
  q: string
  options: string[]
  answer: number
  why: string
}

/** كتاب أضافه الطفل/ولي الأمر: بضل بالجهاز، ودروسه بتتخزّن تحته. */
export interface Book {
  id: string
  title: string
  subject: string
  createdAt: number
}

/** درس محفوظ بالأرشيف: شرح + تلميحات + أسئلة خيارات + صورة الصفحة. */
export interface Lesson {
  id: string
  /** '' يعني سؤال حر من البحث، مش من كتاب. */
  bookId: string
  title: string
  subject: string
  summary: string
  steps: string[]
  hints: string[]
  quiz: QuizItem[]
  videoQuery: string
  /** معرّف الصورة بـIndexedDB — فاضي إذا الدرس من سؤال مكتوب. */
  imageId: string
  createdAt: number
  done: boolean
  right: number
  total: number
}

export type SignalKind = 'voice' | 'video' | 'text' | 'hints' | 'photos' | 'asked'

export interface SubjectStat {
  done: number
  right: number
  total: number
}

/** ذاكرة الطفل: كيف بيتعلّم، شو قوي فيه، وشو بيهتم فيه. */
export interface Memory {
  interests: string[]
  notes: string
  signals: Record<SignalKind, number>
  subjects: Record<string, SubjectStat>
  topics: string[]
  /** ملاحظة الشخصية لولي الأمر (بتتولّد من جيميني لما يطلبها). */
  insight: string
  insightAt: number
}

const SETTINGS_KEY = 'mila.settings.v1'
const PROGRESS_KEY = 'mila.progress.v1'
const BOOKS_KEY = 'mila.books.v1'
const LESSONS_KEY = 'mila.lessons.v1'
const MEMORY_KEY = 'mila.memory.v1'
const MIGRATED_KEY = 'mila.profiles.v1'

const STUDENT_KEY = (profile: ProfileId): string => `mila.student.v1.${profile}`
const dataKey = (base: string, profile: ProfileId): string => `${base}.${profile}`

export const DEFAULT_SETTINGS: Settings = {
  childName: '',
  grade: 'الصف الخامس',
  gender: 'f',
  parentPin: '',
  geminiKey: '',
  voice: 'Sulafat',
  profile: 'lily',
}

export const DEFAULT_MEMORY: Memory = {
  interests: [],
  notes: '',
  signals: { voice: 0, video: 0, text: 0, hints: 0, photos: 0, asked: 0 },
  subjects: {},
  topics: [],
  insight: '',
  insightAt: 0,
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return fallback
    return { ...fallback, ...(parsed as T) }
  } catch {
    return fallback
  }
}

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // التخزين ممتلئ أو محجوب: التطبيق بيكمل بالذاكرة بس.
  }
}

/** أول ما يشتغل هالإصدار: بننقل بيانات النسخة القديمة لحساب الطالب الحالي. */
function migrateProfiles(): void {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return
    const raw = localStorage.getItem(SETTINGS_KEY)
    const old = raw ? (JSON.parse(raw) as Partial<Settings>) : null
    if (old) {
      const profile: ProfileId = old.profile === 'roy' || old.gender === 'm' ? 'roy' : 'lily'
      const fallback: Student =
        profile === 'roy'
          ? { childName: 'روي', grade: 'الصف الخامس', gender: 'm', voice: 'Puck' }
          : { childName: 'ليلي', grade: 'الصف الخامس', gender: 'f', voice: 'Sulafat' }
      if (!localStorage.getItem(STUDENT_KEY(profile))) {
        write(STUDENT_KEY(profile), {
          childName: typeof old.childName === 'string' && old.childName.trim() !== '' ? old.childName : fallback.childName,
          grade: typeof old.grade === 'string' && old.grade !== '' ? old.grade : fallback.grade,
          gender: old.gender === 'm' ? 'm' : 'f',
          voice: typeof old.voice === 'string' && old.voice !== '' ? old.voice : fallback.voice,
        })
      }
      for (const base of [PROGRESS_KEY, BOOKS_KEY, LESSONS_KEY, MEMORY_KEY]) {
        const source = localStorage.getItem(base)
        if (source && !localStorage.getItem(dataKey(base, profile))) {
          localStorage.setItem(dataKey(base, profile), source)
        }
      }
      write(SETTINGS_KEY, {
        parentPin: typeof old.parentPin === 'string' ? old.parentPin : '',
        geminiKey: typeof old.geminiKey === 'string' ? old.geminiKey : '',
        profile,
      })
    }
    localStorage.setItem(MIGRATED_KEY, '1')
  } catch {
    // إذا فشل النقل منكمل بالحساب الافتراضي.
  }
}

/** الحساب المفتوح حاليًا (من إعدادات ولي الأمر). */
export function activeProfile(): ProfileId {
  migrateProfiles()
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ParentData>
      if (parsed.profile === 'roy') return 'roy'
      if (parsed.profile === 'lily') return 'lily'
    }
  } catch {
    // إعدادات تالفة: منرجع لليلي.
  }
  return 'lily'
}

export const loadSettings = (profile: ProfileId = activeProfile()): Settings => {
  migrateProfiles()
  const parent = read<ParentData>(SETTINGS_KEY, { parentPin: '', geminiKey: '', profile })
  const fallback: Student =
    profile === 'roy'
      ? { childName: 'روي', grade: 'الصف الخامس', gender: 'm', voice: 'Puck' }
      : { childName: 'ليلي', grade: 'الصف الخامس', gender: 'f', voice: 'Sulafat' }
  const student = read<Student>(STUDENT_KEY(profile), fallback)
  return {
    ...student,
    profile,
    parentPin: typeof parent.parentPin === 'string' ? parent.parentPin : '',
    geminiKey: typeof parent.geminiKey === 'string' ? parent.geminiKey : '',
  }
}

export const saveSettings = (s: Settings): void => {
  write(STUDENT_KEY(s.profile), {
    childName: s.childName,
    grade: s.grade,
    gender: s.gender,
    voice: s.voice,
  })
  write(SETTINGS_KEY, { parentPin: s.parentPin, geminiKey: s.geminiKey, profile: s.profile })
}

export const loadProgress = (profile: ProfileId = activeProfile()): Progress =>
  read<Progress>(dataKey(PROGRESS_KEY, profile), { stars: 0, lessonsDone: 0, days: [] })
export const saveProgress = (p: Progress, profile: ProfileId = activeProfile()): void =>
  write(dataKey(PROGRESS_KEY, profile), p)

export const loadBooks = (profile: ProfileId = activeProfile()): Book[] => readList<Book>(dataKey(BOOKS_KEY, profile))
export const saveBooks = (b: Book[], profile: ProfileId = activeProfile()): void =>
  write(dataKey(BOOKS_KEY, profile), b.slice(0, 60))

export const loadLessons = (profile: ProfileId = activeProfile()): Lesson[] =>
  readList<Lesson>(dataKey(LESSONS_KEY, profile))
export const saveLessons = (l: Lesson[], profile: ProfileId = activeProfile()): void =>
  write(dataKey(LESSONS_KEY, profile), l.slice(0, 300))

export const loadMemory = (profile: ProfileId = activeProfile()): Memory => {
  const m = read<Memory>(dataKey(MEMORY_KEY, profile), { ...DEFAULT_MEMORY })
  return {
    ...DEFAULT_MEMORY,
    ...m,
    signals: { ...DEFAULT_MEMORY.signals, ...m.signals },
    subjects: m.subjects ?? {},
    topics: Array.isArray(m.topics) ? m.topics : [],
    interests: Array.isArray(m.interests) ? m.interests : [],
  }
}
export const saveMemory = (m: Memory, profile: ProfileId = activeProfile()): void =>
  write(dataKey(MEMORY_KEY, profile), m)

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** نجوم لكل درس + يوم مسجّل لحساب السلسلة. */
export function completeLesson(p: Progress, starsEarned = 1): Progress {
  const day = todayKey()
  return {
    stars: p.stars + starsEarned,
    lessonsDone: p.lessonsDone + 1,
    days: p.days.includes(day) ? p.days : [...p.days, day],
  }
}

export function currentStreak(p: Progress): number {
  if (p.days.length === 0) return 0
  const set = new Set(p.days)
  let streak = 0
  const cursor = new Date()
  // السلسلة بتنكسر إذا اليوم الحالي أو قبله مباشرةً ما فيه نشاط.
  if (!set.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (set.has(todayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function bumpSignal(m: Memory, kind: SignalKind): Memory {
  return { ...m, signals: { ...m.signals, [kind]: m.signals[kind] + 1 } }
}

/** بعد ما يحلّ الدرس: بنسجّل المادة، النتيجة، وموضوع الدرس بذاكرة الطفل. */
export function recordResult(m: Memory, lesson: Lesson, right: number, total: number): Memory {
  const prev = m.subjects[lesson.subject] ?? { done: 0, right: 0, total: 0 }
  const topics = [lesson.title, ...m.topics.filter((t) => t !== lesson.title)].slice(0, 40)
  return {
    ...m,
    subjects: {
      ...m.subjects,
      [lesson.subject]: { done: prev.done + 1, right: prev.right + right, total: prev.total + total },
    },
    topics,
  }
}

export interface StyleRead {
  key: 'voice' | 'video' | 'text' | 'none'
  label: string
  line: string
}

/** أسلوب التعلّم من إشارات الاستخدام (صوت/فيديو/قراءة) — كلها محلية. */
export function learningStyle(m: Memory): StyleRead {
  const s = m.signals
  const max = Math.max(s.voice, s.video, s.text)
  if (max === 0) {
    return { key: 'none', label: 'ما بينعرف بعد', line: 'بعد كم درس منعرف شو الطريقة اللي بتوصل معه أسرع.' }
  }
  if (s.voice === max && s.voice > s.text) {
    return { key: 'voice', label: 'بيسمع أحسن', line: 'بيحب يسمع الشرح — شغّل الصوت معه، وخليه يعيد بالصوت.' }
  }
  if (s.video === max && s.video > s.text) {
    return { key: 'video', label: 'بيحب الفيديو', line: 'الفيديو بيمسكه أكتر — فيديو قصير قبل التمرين بيعمل فرق.' }
  }
  return { key: 'text', label: 'بيقرا ويكتب', line: 'بيحب يقرا ويكتب — خليه يكتب الحل بإيده بعد الشرح.' }
}

export interface SubjectRead {
  subject: string
  done: number
  accuracy: number
  label: string
  tone: 'good' | 'mid' | 'low' | 'none'
}

export function subjectReads(m: Memory): SubjectRead[] {
  return Object.entries(m.subjects)
    .map(([subject, s]) => {
      const accuracy = s.total > 0 ? Math.round((s.right / s.total) * 100) : 0
      const tone: SubjectRead['tone'] =
        s.total === 0 ? 'none' : accuracy >= 80 ? 'good' : accuracy >= 50 ? 'mid' : 'low'
      const label =
        tone === 'good' ? 'قوي فيه' : tone === 'mid' ? 'عم يتحسّن' : tone === 'low' ? 'بدو تدريب' : 'ما جرّب بعد'
      return { subject, done: s.done, accuracy, label, tone }
    })
    .sort((a, b) => b.done - a.done)
}

/** سطر موجز بيروح مع كل طلب لجيميني حتى يخصّص الشرح للطفل. */
export function memoryBrief(m: Memory): string {
  const parts: string[] = []
  if (m.interests.length > 0) parts.push(`بيهتم بـ: ${m.interests.join('، ')}`)
  const style = learningStyle(m)
  if (style.key !== 'none') parts.push(`أسلوب تعلّمه: ${style.line}`)
  const strong = subjectReads(m).filter((s) => s.tone === 'good').map((s) => s.subject)
  const weak = subjectReads(m).filter((s) => s.tone === 'low').map((s) => s.subject)
  if (strong.length > 0) parts.push(`قوي بـ: ${strong.join('، ')}`)
  if (weak.length > 0) parts.push(`بيحتاج دعم بـ: ${weak.join('، ')}`)
  if (m.topics.length > 0) parts.push(`آخر مواضيع: ${m.topics.slice(0, 6).join('، ')}`)
  if (m.notes.trim() !== '') parts.push(`ملاحظة ولي الأمر: ${m.notes.trim()}`)
  return parts.join(' | ')
}

export function weeklyReport(m: Memory): string {
  const parts: string[] = []
  if (m.interests.length > 0) parts.push(`ياهتم بـ: ${m.interests.join("، ")}`)
  const style = learningStyle(m)
  if (style.key !== "none") parts.push(`أسلوب التعلم: ${style.label}`)
  const strong = subjectReads(m).filter((s) => s.tone === "good").map((s) => s.subject)
  const weak = subjectReads(m).filter((s) => s.tone === "low").map((s) => s.subject)
  if (strong.length > 0) parts.push(`قوي فيه: ${strong.join("، ")}`)
  if (weak.length > 0) parts.push(`يحتاج دعم: ${weak.join("، ")}`)
  if (m.topics.length > 0) parts.push(`آخر مواضيع: ${m.topics.slice(0, 6).join("، ")}`)
  if (m.notes.trim() !== "") parts.push(`ملاحظة ولي الأمر: ${m.notes.trim()}`)
  return parts.join(" \n ")
}

/**Export all user data as JSON for backup. */
export function exportData(profile: ProfileId): string {
  try {
    const progress = localStorage.getItem(dataKey(PROGRESS_KEY, profile))
    const books = localStorage.getItem(dataKey(BOOKS_KEY, profile))
    const lessons = localStorage.getItem(dataKey(LESSONS_KEY, profile))
    const memory = localStorage.getItem(dataKey(MEMORY_KEY, profile))
    const student = localStorage.getItem(STUDENT_KEY(profile))
    const settings = localStorage.getItem(SETTINGS_KEY)
    const data = {
      progress: progress ? JSON.parse(progress) : { stars: 0, lessonsDone: 0, days: [], badgeDates: {} },
      books: books ? JSON.parse(books) : [],
      lessons: lessons ? JSON.parse(lessons) : [],
      memory: memory ? JSON.parse(memory) : DEFAULT_MEMORY,
      student: student ? JSON.parse(student) : { childName: '', grade: 'al الصف الخامس', gender: 'f', voice: 'Sulafat' },
      settings: settings ? JSON.parse(settings) : { childName: '', grade: 'al الصف الخامس', gender: 'f', parentPin: '', geminiKey: '', profile: 'lily' },
    }
    return JSON.stringify(data)
  } catch {
    return '{}'
  }
}

/**استيراد البيانات من ملف backup.JSON. */
export function importData(data: string, profile: ProfileId): boolean {
  try {
    const parsed = JSON.parse(data)
    if (!parsed || typeof parsed !== "object") return false
    const { progress, books, lessons, memory, student, settings } = parsed
    if (progress) write(dataKey(PROGRESS_KEY, profile), progress)
    if (books) write(dataKey(BOOKS_KEY, profile), books.slice(0, 60))
    if (lessons) write(dataKey(LESSONS_KEY, profile), lessons.slice(0, 300))
    if (memory) write(dataKey(MEMORY_KEY, profile), { ...DEFAULT_MEMORY, ...memory })
    if (student) write(STUDENT_KEY(profile), student)
    if (settings) write(SETTINGS_KEY, settings)
    return true
  } catch {
    return false
  }
}
