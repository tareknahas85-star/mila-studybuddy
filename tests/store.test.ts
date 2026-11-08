// اختبارات منطق التخزين والذاكرة. تشغيل: npm test
// بتستعمل node:test المدمج، وبدون أي مكتبة خارجية.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  completeLesson,
  currentStreak,
  exportData,
  importData,
  learningStyle,
  loadLessons,
  loadSettings,
  recordResult,
  saveSettings,
  subjectReads,
  todayKey,
  DEFAULT_MEMORY,
  type Lesson,
  type Memory,
  type Progress,
} from '../src/lib/store.ts'

// ذاكرة بسيطة تقلّد localStorage داخل Node.
class MemoryStorage {
  #map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.#map.has(key) ? (this.#map.get(key) as string) : null
  }
  setItem(key: string, value: string): void {
    this.#map.set(key, String(value))
  }
  removeItem(key: string): void {
    this.#map.delete(key)
  }
  clear(): void {
    this.#map.clear()
  }
}

;(globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage()

beforeEach(() => {
  localStorage.clear()
})

const mem = (over: Partial<Memory> = {}): Memory => ({ ...DEFAULT_MEMORY, ...over })

const daysAgo = (n: number): string => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return todayKey(d)
}

const lesson = (over: Partial<Lesson> = {}): Lesson => ({
  id: 'l1',
  bookId: '',
  title: 'الكسور',
  subject: 'رياضيات',
  summary: '',
  steps: [],
  hints: [],
  quiz: [],
  videoQuery: '',
  imageId: '',
  createdAt: 0,
  done: false,
  right: 0,
  total: 0,
  ...over,
})

test('learningStyle: لا إشارات يعني غير معروف', () => {
  assert.equal(learningStyle(mem()).key, 'none')
})

test('learningStyle: الصوت يفوز لما يكون الأعلى', () => {
  const m = mem({ signals: { ...DEFAULT_MEMORY.signals, voice: 5, text: 2 } })
  assert.equal(learningStyle(m).key, 'voice')
})

test('learningStyle: التعادل بين الصوت والقراءة يرجع للقراءة', () => {
  const m = mem({ signals: { ...DEFAULT_MEMORY.signals, voice: 3, text: 3 } })
  assert.equal(learningStyle(m).key, 'text')
})

test('currentStreak: أيام متتالية حتى اليوم', () => {
  const p: Progress = { stars: 0, lessonsDone: 0, days: [daysAgo(0), daysAgo(1), daysAgo(2)] }
  assert.equal(currentStreak(p), 3)
})

test('currentStreak: إذا اليوم فاضي بس أمس فيه، السلسلة لسا شغّالة', () => {
  const p: Progress = { stars: 0, lessonsDone: 0, days: [daysAgo(1), daysAgo(2)] }
  assert.equal(currentStreak(p), 2)
})

test('currentStreak: فجوة بتكسر السلسلة', () => {
  const p: Progress = { stars: 0, lessonsDone: 0, days: [daysAgo(0), daysAgo(3)] }
  assert.equal(currentStreak(p), 1)
})

test('completeLesson: بيحسب النجوم والدروس واليوم مرة وحدة', () => {
  const once = completeLesson({ stars: 0, lessonsDone: 0, days: [] }, 2)
  const twice = completeLesson(once, 1)
  assert.equal(twice.stars, 3)
  assert.equal(twice.lessonsDone, 2)
  assert.equal(twice.days.length, 1)
})

test('subjectReads: العتبات 80 و50، والترتيب حسب عدد الدروس', () => {
  const reads = subjectReads(
    mem({
      subjects: {
        رياضيات: { done: 2, right: 9, total: 10 },
        علوم: { done: 5, right: 2, total: 10 },
        عربي: { done: 1, right: 6, total: 10 },
      },
    }),
  )
  assert.deepEqual(
    reads.map((r) => [r.subject, r.tone]),
    [
      ['علوم', 'low'],
      ['رياضيات', 'good'],
      ['عربي', 'mid'],
    ],
  )
})

test('recordResult: يحدّث المادة ويرفع الموضوع لفوق بدون تكرار', () => {
  let m = recordResult(mem(), lesson({ title: 'الكسور' }), 1, 2)
  m = recordResult(m, lesson({ title: 'الضرب' }), 2, 2)
  m = recordResult(m, lesson({ title: 'الكسور' }), 2, 2)
  assert.deepEqual(m.topics, ['الكسور', 'الضرب'])
  assert.deepEqual(m.subjects['رياضيات'], { done: 3, right: 5, total: 6 })
})

test('exportData: ما بيحتوي رقم الأهل ولا مفتاح جيميني', () => {
  const SECRET_PIN = '48151623'
  const SECRET_KEY = 'AIzaSyTESTSECRETKEY123456'
  saveSettings({
    childName: 'ليلي',
    grade: 'الصف الخامس',
    gender: 'f',
    parentPin: SECRET_PIN,
    geminiKey: SECRET_KEY,
    voice: 'Sulafat',
    profile: 'lily',
  })
  const out = exportData('lily')
  assert.ok(!out.includes(SECRET_PIN), 'PIN leaked into backup')
  assert.ok(!out.includes(SECRET_KEY), 'Gemini key leaked into backup')
})

test('importData: ما بيقدر يغيّر رقم الأهل ولا المفتاح', () => {
  saveSettings({
    childName: 'ليلي',
    grade: 'الصف الخامس',
    gender: 'f',
    parentPin: '1111',
    geminiKey: 'KEY_ORIGINAL',
    voice: 'Sulafat',
    profile: 'lily',
  })
  const malicious = JSON.stringify({
    app: 'mila',
    version: 1,
    settings: { parentPin: '0000', geminiKey: 'KEY_EVIL', profile: 'lily' },
    lessons: [],
  })
  assert.equal(importData(malicious, 'lily'), true)
  const after = loadSettings('lily')
  assert.equal(after.parentPin, '1111')
  assert.equal(after.geminiKey, 'KEY_ORIGINAL')
})

test('importData: يرفض الملف غير الصالح', () => {
  assert.equal(importData('not json', 'lily'), false)
  assert.equal(importData('[]', 'lily'), false)
  assert.equal(importData('{"hello":"world"}', 'lily'), false)
})

test('export ثم import: الدروس بترجع كاملة للطالب', () => {
  const lessons = [lesson({ id: 'a', title: 'الكسور' }), lesson({ id: 'b', title: 'الضرب' })]
  localStorage.setItem('mila.lessons.v1.lily', JSON.stringify(lessons))
  const backup = exportData('lily')
  localStorage.clear()
  assert.equal(importData(backup, 'lily'), true)
  assert.deepEqual(loadLessons('lily'), lessons)
})

test('importData: بيقبل النسخ القديمة اللي فيها settings وبيتجاهلها', () => {
  saveSettings({
    childName: 'ليلي',
    grade: 'الصف الخامس',
    gender: 'f',
    parentPin: '2222',
    geminiKey: 'KEY_KEEP',
    voice: 'Sulafat',
    profile: 'lily',
  })
  const legacy = JSON.stringify({
    progress: { stars: 7, lessonsDone: 3, days: [] },
    books: [],
    lessons: [],
    memory: {},
    settings: { parentPin: '9999', geminiKey: 'KEY_OLD' },
  })
  assert.equal(importData(legacy, 'lily'), true)
  assert.equal(loadSettings('lily').parentPin, '2222')
  assert.equal(loadSettings('lily').geminiKey, 'KEY_KEEP')
})

test('recordResult و completeLesson: ما بيغيّروا الأصل (immutability)', () => {
  const base = mem()
  const snapshot = JSON.stringify(base)
  recordResult(base, lesson(), 1, 1)
  assert.equal(JSON.stringify(base), snapshot)
  const p: Progress = { stars: 0, lessonsDone: 0, days: [] }
  completeLesson(p, 1)
  assert.deepEqual(p, { stars: 0, lessonsDone: 0, days: [] })
})
