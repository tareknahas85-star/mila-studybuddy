// كل شي بينحفظ على جهاز الطفل — ما في سيرفر، ولا حساب، ولا مفتاح بيطلع من الجهاز.
export type Mood = 'idle' | 'think' | 'laugh' | 'tired' | 'proud'
export type Gender = 'f' | 'm'

export interface Settings {
  childName: string
  grade: string
  gender: Gender
  /** رقم ولي الأمر: أول من يفتح التطبيق بيحطه، وبعده ما بيقدر الطفل يفوته. */
  parentPin: string
  /** مفتاح جيميني المجاني: ولي الأمر بيحطه مرة واحدة، وبيضل على الجهاز. */
  geminiKey: string
}

export interface Progress {
  stars: number
  lessonsDone: number
  /** أيام النشاط (YYYY-MM-DD) لحساب السلسلة. */
  days: string[]
}

const SETTINGS_KEY = 'mila.settings.v1'
const PROGRESS_KEY = 'mila.progress.v1'

export const DEFAULT_SETTINGS: Settings = {
  childName: '',
  grade: 'الصف الخامس',
  gender: 'f',
  parentPin: '',
  geminiKey: '',
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

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // التخزين ممتلئ أو محجوب: التطبيق بيكمل بالذاكرة بس.
  }
}

export const loadSettings = (): Settings => read<Settings>(SETTINGS_KEY, { ...DEFAULT_SETTINGS })
export const saveSettings = (s: Settings): void => write(SETTINGS_KEY, s)

export const loadProgress = (): Progress => read<Progress>(PROGRESS_KEY, { stars: 0, lessonsDone: 0, days: [] })
export const saveProgress = (p: Progress): void => write(PROGRESS_KEY, p)

export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** نجمة لكل درس، ويوم مسجّل لحساب السلسلة. */
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
