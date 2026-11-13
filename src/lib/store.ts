// كل شي بينحفظ على جهاز الطالب — ما في حسابات، والمفتاح ما بيطلع من الجهاز.
// كل طالب إله حساب مستقل (إعداداته، نجومه، دروسه، كتبه، وذاكرته). ولي الأمر ومفتاح جيميني مشتركين.
import type { Acc, CompId } from './companions.ts'
import { COMPS } from './companions.ts'
import type { SkinId } from './rewards.ts'

export type Gender = 'f' | 'm'
export type SignalKind = 'voice' | 'video' | 'text' | 'hints' | 'photos' | 'asked'

/** الطالب: الأفاتار (صورتو) مستقل عن الرفيق (الشخصية اللي بتدرّسو). */
export interface Student {
  id: string
  name: string
  grade: string
  gender: Gender
  /** مفتاح الأفاتار: صورة مدمجة (lily/roy) أو حرف ملوّن (a/b/c). */
  av: string
  comp: CompId
  skin: SkinId
  acc: Acc
  /** صوت الرفيق الطبيعي من مكتبة جوجل. */
  voice: string
  /** حد الدراسة باليوم بالدقايق (0 = بلا حد). */
  limitMin: number
}

export interface ParentData {
  pinHash: string
  salt: string
  /** رقم النسخة القديمة (نص عادي): بيتحوّل لهاش أول ما يفتح التطبيق وبينمسح. */
  legacyPin: string
  q: { text: string; h: string } | null
  geminiKey: string
  fails: number
  lockUntil: number
}

export interface Device {
  /** '' يعني أول تشغيل لسا ما انحدد. */
  mode: '' | 'student' | 'parent'
  active: string
}

export interface Progress {
  stars: number
  lessonsDone: number
  /** أيام النشاط (YYYY-MM-DD) لحساب السلسلة. */
  days: string[]
  /** ثواني الدراسة لكل يوم (آخر ٣٠ يوم). */
  secByDay: Record<string, number>
  lessonsByDay: Record<string, number>
  stickers: string[]
  covers: Record<string, { color?: string; sticker?: string }>
}

export interface QuizItem {
  q: string
  options: string[]
  answer: number
  why: string
  /** نوع الغلط لكل خيار (فاضي للخيار الصح): بيغذّي ذاكرة الأهل. */
  errs?: string[]
}

/** "مين الغلطان؟": الرفيق بيحل بخطوات وفي خطوة غلط، والطالب بيمسكها. */
export interface Spot {
  q: string
  lines: string[]
  bad: number
  why: string
}

export interface Book {
  id: string
  title: string
  subject: string
  createdAt: number
}

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
  spot?: Spot
  videoQuery: string
  /** معرّف الصورة بـIndexedDB — فاضي إذا الدرس من سؤال مكتوب. */
  imageId: string
  createdAt: number
  done: boolean
  right: number
  total: number
}

export interface SubjectStat {
  done: number
  right: number
  total: number
}

export interface Memory {
  interests: string[]
  notes: string
  signals: Record<SignalKind, number>
  subjects: Record<string, SubjectStat>
  topics: string[]
  /** مهارة (عنوان الدرس) ← جواب صح من أول مرة / غلط. */
  skills: Record<string, { ok: number; bad: number }>
  /** نوع الغلط ← كم مرة تكرر. */
  tags: Record<string, number>
  insight: string
  insightAt: number
}

/** واجب من الأهل: صفحة مصوّرة + رسالة. */
export interface Homework {
  id: string
  msg: string
  /** صورة مضغوطة (data URL) أو فاضي. */
  photo: string
  ts: number
  done: boolean
}

const OLD_SETTINGS = 'mila.settings.v1'
const PROGRESS_KEY = 'mila.progress.v1'
const BOOKS_KEY = 'mila.books.v1'
const LESSONS_KEY = 'mila.lessons.v1'
const MEMORY_KEY = 'mila.memory.v1'
const STUDENTS_KEY = 'sb.students.v1'
const PARENT_KEY = 'sb.parent.v1'
const DEVICE_KEY = 'sb.device.v1'
const HW_KEY = 'sb.hw.v1'

const dataKey = (base: string, id: string): string => `${base}.${id}`

export const DEFAULT_PARENT: ParentData = {
  pinHash: '',
  salt: '',
  legacyPin: '',
  q: null,
  geminiKey: '',
  fails: 0,
  lockUntil: 0,
}

export const DEFAULT_PROGRESS: Progress = {
  stars: 0,
  lessonsDone: 0,
  days: [],
  secByDay: {},
  lessonsByDay: {},
  stickers: ['star'],
  covers: {},
}

export const DEFAULT_MEMORY: Memory = {
  interests: [],
  notes: '',
  signals: { voice: 0, video: 0, text: 0, hints: 0, photos: 0, asked: 0 },
  subjects: {},
  topics: [],
  skills: {},
  tags: {},
  insight: '',
  insightAt: 0,
}

function read<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback
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

/** أول تشغيل بالنسخة الجديدة: بننقل ليلي/روي وبياناتهم لقائمة الطلاب، ورقم الأهل لحقل مؤقت. */
function migrate(): void {
  try {
    if (localStorage.getItem(STUDENTS_KEY) !== null) return
    const students: Student[] = []
    for (const id of ['lily', 'roy']) {
      const raw = localStorage.getItem(`mila.student.v1.${id}`)
      if (!raw) continue
      const s = JSON.parse(raw) as Partial<{ childName: string; grade: string; gender: Gender; voice: string }>
      const gender: Gender = s.gender === 'm' ? 'm' : 'f'
      const comp: CompId = gender === 'm' ? 'buddy' : 'yasmina'
      students.push({
        id,
        name: typeof s.childName === 'string' && s.childName.trim() !== '' ? s.childName.trim() : id === 'roy' ? 'روي' : 'ليلي',
        grade: typeof s.grade === 'string' && s.grade !== '' ? s.grade : 'الصف الخامس',
        gender,
        av: id,
        comp,
        skin: 'notebook',
        acc: {},
        voice: typeof s.voice === 'string' && s.voice !== '' ? s.voice : COMPS[comp].voice,
        limitMin: 0,
      })
    }
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students))
    const oldRaw = localStorage.getItem(OLD_SETTINGS)
    if (oldRaw && localStorage.getItem(PARENT_KEY) === null) {
      const old = JSON.parse(oldRaw) as Partial<{ parentPin: string; geminiKey: string; profile: string }>
      write(PARENT_KEY, {
        ...DEFAULT_PARENT,
        legacyPin: typeof old.parentPin === 'string' ? old.parentPin : '',
        geminiKey: typeof old.geminiKey === 'string' ? old.geminiKey : '',
      })
      if (localStorage.getItem(DEVICE_KEY) === null && students.length > 0) {
        const active = old.profile === 'roy' && students.some((s) => s.id === 'roy') ? 'roy' : students[0].id
        write(DEVICE_KEY, { mode: 'student', active })
      }
    }
  } catch {
    // إذا فشل النقل منكمل بقائمة فاضية ومنطلب تحضير جديد.
  }
}

export const loadStudents = (): Student[] => {
  migrate()
  return readList<Student>(STUDENTS_KEY).map((s) => ({
    ...s,
    acc: s.acc ?? {},
    skin: s.skin ?? 'notebook',
    comp: s.comp ?? 'buddy',
    limitMin: typeof s.limitMin === 'number' ? s.limitMin : 0,
    voice: s.voice || COMPS[s.comp ?? 'buddy'].voice,
  }))
}
export const saveStudents = (list: Student[]): void => write(STUDENTS_KEY, list)

export const loadParent = (): ParentData => {
  migrate()
  return read<ParentData>(PARENT_KEY, { ...DEFAULT_PARENT })
}
export const saveParent = (p: ParentData): void => write(PARENT_KEY, p)

export const loadDevice = (): Device => {
  migrate()
  return read<Device>(DEVICE_KEY, { mode: '', active: '' })
}
export const saveDevice = (d: Device): void => write(DEVICE_KEY, d)

export const loadProgress = (id: string): Progress => {
  const p = read<Progress>(dataKey(PROGRESS_KEY, id), { ...DEFAULT_PROGRESS })
  return {
    ...DEFAULT_PROGRESS,
    ...p,
    days: Array.isArray(p.days) ? p.days : [],
    stickers: Array.isArray(p.stickers) && p.stickers.length > 0 ? p.stickers : ['star'],
    secByDay: p.secByDay ?? {},
    lessonsByDay: p.lessonsByDay ?? {},
    covers: p.covers ?? {},
  }
}
export const saveProgress = (id: string, p: Progress): void => write(dataKey(PROGRESS_KEY, id), p)

export const loadBooks = (id: string): Book[] => readList<Book>(dataKey(BOOKS_KEY, id))
export const saveBooks = (id: string, b: Book[]): void => write(dataKey(BOOKS_KEY, id), b.slice(0, 60))

export const loadLessons = (id: string): Lesson[] => readList<Lesson>(dataKey(LESSONS_KEY, id))
export const saveLessons = (id: string, l: Lesson[]): void => write(dataKey(LESSONS_KEY, id), l.slice(0, 300))

export const loadMemory = (id: string): Memory => {
  const m = read<Memory>(dataKey(MEMORY_KEY, id), { ...DEFAULT_MEMORY })
  return {
    ...DEFAULT_MEMORY,
    ...m,
    signals: { ...DEFAULT_MEMORY.signals, ...m.signals },
    subjects: m.subjects ?? {},
    topics: Array.isArray(m.topics) ? m.topics : [],
    interests: Array.isArray(m.interests) ? m.interests : [],
    skills: m.skills ?? {},
    tags: m.tags ?? {},
  }
}
export const saveMemory = (id: string, m: Memory): void => write(dataKey(MEMORY_KEY, id), m)

export const loadHomework = (id: string): Homework[] => readList<Homework>(dataKey(HW_KEY, id))
export const saveHomework = (id: string, h: Homework[]): void => write(dataKey(HW_KEY, id), h.slice(0, 20))

/** بيمسح كل بيانات طالب من الجهاز. */
export function removeStudentData(id: string): void {
  try {
    for (const base of [PROGRESS_KEY, BOOKS_KEY, LESSONS_KEY, MEMORY_KEY, HW_KEY]) localStorage.removeItem(dataKey(base, id))
  } catch {
    // ما في داعي نزعّل المستخدم.
  }
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function dayKeyAgo(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return todayKey(d)
}

function pruneDays<T>(rec: Record<string, T>): Record<string, T> {
  const keep = new Set<string>()
  for (let i = 0; i < 30; i += 1) keep.add(dayKeyAgo(-i))
  const out: Record<string, T> = {}
  for (const k of Object.keys(rec)) if (keep.has(k)) out[k] = rec[k]
  return out
}

/** ثواني دراسة جديدة لليوم. */
export function addSeconds(p: Progress, sec: number): Progress {
  if (sec <= 0) return p
  const k = todayKey()
  return { ...p, secByDay: pruneDays({ ...p.secByDay, [k]: (p.secByDay[k] ?? 0) + sec }) }
}

export const secondsToday = (p: Progress): number => p.secByDay[todayKey()] ?? 0

/** نجوم لكل درس + يوم مسجّل لحساب السلسلة + ستيكر جديد إذا في. */
export function completeLesson(p: Progress, starsEarned: number, sticker: string | null): Progress {
  const day = todayKey()
  return {
    ...p,
    stars: p.stars + starsEarned,
    lessonsDone: p.lessonsDone + 1,
    days: p.days.includes(day) ? p.days : [...p.days, day].slice(-120),
    lessonsByDay: pruneDays({ ...p.lessonsByDay, [day]: (p.lessonsByDay[day] ?? 0) + 1 }),
    stickers: sticker && !p.stickers.includes(sticker) ? [...p.stickers, sticker] : p.stickers,
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

/** جواب سؤال وحد: بنسجّل المهارة (عنوان الدرس) ونوع الغلط إذا غلط. */
export function recordAnswer(m: Memory, skill: string, ok: boolean, tag: string): Memory {
  const prev = m.skills[skill] ?? { ok: 0, bad: 0 }
  const skills = { ...m.skills, [skill]: { ok: prev.ok + (ok ? 1 : 0), bad: prev.bad + (ok ? 0 : 1) } }
  const keys = Object.keys(skills)
  if (keys.length > 60) delete skills[keys[0]]
  const tags = ok || tag === '' ? m.tags : { ...m.tags, [tag]: (m.tags[tag] ?? 0) + 1 }
  return { ...m, skills, tags }
}

/** بعد ما يخلّص الدرس: بنسجّل المادة، النتيجة، وموضوع الدرس بذاكرة الطالب. */
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

export function learningStyle(m: Memory): StyleRead {
  const s = m.signals
  const max = Math.max(s.voice, s.video, s.text)
  if (max === 0) {
    return { key: 'none', label: 'ما بينعرف بعد', line: 'بعد كم درس منعرف شو الطريقة اللي بتوصل معو أسرع.' }
  }
  if (s.voice === max && s.voice > s.text) {
    return { key: 'voice', label: 'بيسمع أحسن', line: 'بيحب يسمع الشرح — شغّل الصوت معو، وخليه يعيد بالصوت.' }
  }
  if (s.video === max && s.video > s.text) {
    return { key: 'video', label: 'بيحب الفيديو', line: 'الفيديو بيمسكو أكتر — فيديو قصير قبل التمرين بيعمل فرق.' }
  }
  return { key: 'text', label: 'بيقرا ويكتب', line: 'بيحب يقرا ويكتب — خليه يكتب الحل بإيدو بعد الشرح.' }
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
      const tone: SubjectRead['tone'] = s.total === 0 ? 'none' : accuracy >= 80 ? 'good' : accuracy >= 50 ? 'mid' : 'low'
      const label = tone === 'good' ? 'قوي فيه' : tone === 'mid' ? 'عم يتحسّن' : tone === 'low' ? 'بدو تدريب' : 'ما جرّب بعد'
      return { subject, done: s.done, accuracy, label, tone }
    })
    .sort((a, b) => b.done - a.done)
}

/** سطر موجز بيروح مع كل طلب لجيميني حتى يخصّص الشرح للطالب. */
export function memoryBrief(m: Memory): string {
  const parts: string[] = []
  if (m.interests.length > 0) parts.push(`بيهتم بـ: ${m.interests.join('، ')}`)
  const style = learningStyle(m)
  if (style.key !== 'none') parts.push(`أسلوب تعلّمو: ${style.line}`)
  const reads = subjectReads(m)
  const strong = reads.filter((s) => s.tone === 'good').map((s) => s.subject)
  const weak = reads.filter((s) => s.tone === 'low').map((s) => s.subject)
  if (strong.length > 0) parts.push(`قوي بـ: ${strong.join('، ')}`)
  if (weak.length > 0) parts.push(`بيحتاج دعم بـ: ${weak.join('، ')}`)
  const topTags = Object.entries(m.tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t)
  if (topTags.length > 0) parts.push(`أغلاط بتتكرر: ${topTags.join('، ')}`)
  if (m.topics.length > 0) parts.push(`آخر مواضيع: ${m.topics.slice(0, 6).join('، ')}`)
  if (m.notes.trim() !== '') parts.push(`ملاحظة ولي الأمر: ${m.notes.trim()}`)
  return parts.join(' | ')
}

export interface WeekDay {
  key: string
  sec: number
  lessons: number
  today: boolean
}

/** آخر ٧ أيام من الأقدم للأحدث. */
export function weekDays(p: Progress): WeekDay[] {
  const out: WeekDay[] = []
  for (let o = -6; o <= 0; o += 1) {
    const key = dayKeyAgo(o)
    out.push({ key, sec: p.secByDay[key] ?? 0, lessons: p.lessonsByDay[key] ?? 0, today: o === 0 })
  }
  return out
}

export function reportText(s: Student, p: Progress, m: Memory): string {
  const c = COMPS[s.comp] ?? COMPS.buddy
  const wk = weekDays(p)
  const act = wk.filter((x) => x.sec > 0 || x.lessons > 0).length
  const mins = Math.round(wk.reduce((a, x) => a + x.sec, 0) / 60)
  const les = wk.reduce((a, x) => a + x.lessons, 0)
  const h = (m: string, f: string): string => (s.gender === 'f' ? f : m)
  let out = `مرحبا! أنا ${c.name}، رفيق ${s.name} بالدراسة. هي ملخص الأسبوع:\n`
  if (act === 0) {
    return `${out}هالأسبوع ${h('ما فتح', 'ما فتحت')} ${s.name} الدروس. ما في مشكلة، عشر دقايق بتفرق. جرّبوا تقعدوا ${h('معو', 'معها')} وتخلّوني أبلّش ${h('معو', 'معها')}.`
  }
  const cnt = les === 0 ? 'ولا درس كامل' : les === 1 ? 'درس واحد' : les === 2 ? 'درسين' : `${les} دروس`
  out += `${s.name} ${h('درس', 'درست')} ${act} ${act === 1 ? 'يوم' : 'أيام'}، و${h('قضّى', 'قضّت')} ${mins} دقيقة، و${h('خلّص', 'خلّصت')} ${cnt}.\n`
  const sk = Object.entries(m.skills)
    .map(([n, v]) => ({ n, r: v.ok / (v.ok + v.bad || 1), t: v.ok + v.bad }))
    .filter((x) => x.t >= 3)
  const strong = sk.filter((x) => x.r >= 0.75).sort((a, b) => b.r - a.r)[0]
  const weak = sk.filter((x) => x.r < 0.6).sort((a, b) => a.r - b.r)[0]
  if (strong) out += `أقوى شي ${h('عندو', 'عندها')}: ${strong.n} (${Math.round(strong.r * 100)}٪ من الأجوبة صح من أول مرة).\n`
  if (weak) {
    const tag = Object.entries(m.tags).sort((a, b) => b[1] - a[1])[0]
    out += `${h('بدّو', 'بدّها')} دعم بـ«${weak.n}».${tag ? ` الغلطة اللي بتتكرر: ${tag[0]}.` : ''}\nاقتراح: خلّوا ${s.name} يشرحلكم هالنقطة ${h('بكلامو', 'بكلامها')}، هيك بتتثبّت.`
  }
  return out.trim()
}
