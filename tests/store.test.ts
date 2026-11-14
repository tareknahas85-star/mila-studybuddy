// اختبارات منطق StudyBuddy: المراجعة المتباعدة، الأسبوع، المهمّات، النجوم، والتحديثات.
// بتشتغل بـNode بدون متصفح: node --experimental-strip-types --test tests/store.test.ts
import assert from 'node:assert/strict'
import { test } from 'node:test'

// localStorage وهمي (store.ts بيستعمل localStorage وقت الحفظ والتحميل).
const mem = new Map<string, string>()
const fake = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
}
Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true })

const store = await import('../src/lib/store.ts')
const rewards = await import('../src/lib/rewards.ts')
const update = await import('../src/lib/update.ts')

const DAY = 86400000

test('المراجعة المتباعدة: بعد يوم، تلاتة، سبعة، أربعتعش، وبعدها بتختفي', () => {
  const seed = { lessonId: 'L1', q: 'شو المقام؟', options: ['أ', 'ب'], answer: 1, why: 'لأن' }
  let m = store.addReview(store.DEFAULT_MEMORY, seed)
  assert.equal(m.review.length, 1)
  assert.equal(store.dueItems(m).length, 0, 'مو مستحق قبل يوم')
  assert.equal(store.dueItems(m, Date.now() + 2 * DAY).length, 1, 'مستحق بعد يوم')
  const id = m.review[0].id
  m = store.gradeReview(m, id, true)
  assert.equal(m.review[0].box, 1)
  assert.ok(m.review[0].due > Date.now() + 2 * DAY, 'الموعد الجاي بعد ٣ أيام تقريباً')
  m = store.gradeReview(m, id, true)
  m = store.gradeReview(m, id, true)
  assert.equal(m.review[0].box, 3)
  m = store.gradeReview(m, id, true)
  assert.equal(m.review.length, 0, 'انحفظ: بيختفي من المراجعة')
})

test('الجواب الغلط بالمراجعة بيرجّع السؤال لأول مرحلة', () => {
  const seed = { lessonId: 'L1', q: 'سؤال؟', options: ['أ', 'ب'], answer: 0, why: 'ج' }
  let m = store.addReview(store.DEFAULT_MEMORY, seed)
  const id = m.review[0].id
  m = store.gradeReview(m, id, true)
  assert.equal(m.review[0].box, 1)
  m = store.gradeReview(m, id, false)
  assert.equal(m.review[0].box, 0)
})

test('بداية الأسبوع السبت', () => {
  assert.equal(store.weekStartKey(new Date(2026, 10, 14, 12)), '2026-11-14') // السبت
  assert.equal(store.weekStartKey(new Date(2026, 10, 15, 12)), '2026-11-14') // الأحد
  assert.equal(store.weekStartKey(new Date(2026, 10, 20, 12)), '2026-11-14') // الجمعة
  assert.equal(store.weekStartKey(new Date(2026, 10, 21, 12)), '2026-11-21') // السبت الجاي
})

test('النجوم: صفحة وحدة مرة وحدة، وعدّاد يومي للسقف', () => {
  let p = { ...store.DEFAULT_PROGRESS }
  assert.equal(store.starLessonsToday(p), 0)
  const withImage = { imageId: 'img9', id: 'x' } as Parameters<typeof store.lessonStarKey>[0]
  const noImage = { imageId: '', id: 'x' } as Parameters<typeof store.lessonStarKey>[0]
  assert.equal(store.lessonStarKey(withImage), 'img:img9')
  assert.equal(store.lessonStarKey(noImage), 'lesson:x')
  p = store.markStarLesson(p, 'img:img9')
  p = store.markStarLesson(p, 'lesson:y')
  assert.equal(store.starLessonsToday(p), 2)
  assert.deepEqual(p.starKeys, ['img:img9', 'lesson:y'])
})

test('فتح الأغراض: بالنجوم أو بالمهمّات', () => {
  const p = { ...store.DEFAULT_PROGRESS, stars: 30 }
  assert.ok(rewards.isUnlocked(p, 'comp', 'buddy', rewards.COMP_COST.buddy), 'الأولى مجانية')
  assert.ok(rewards.isUnlocked(p, 'comp', 'robo', rewards.COMP_COST.robo), '٣٠ نجمة بتفتح روبو (٢٥)')
  assert.ok(!rewards.isUnlocked(p, 'comp', 'cat', rewards.COMP_COST.cat), 'القطة بدها ٧٠')
  assert.ok(rewards.isUnlocked({ ...p, unlocked: ['comp:cat'] }, 'comp', 'cat', rewards.COMP_COST.cat), 'أو مهمّة بتفتحها')
  const next = rewards.nextUnlock(p)
  assert.ok(next && next.left > 0)
})

test('المهمّات: بتنفتح المراحل مرة وحدة ومع جايزة', () => {
  const base = { ...store.DEFAULT_PROGRESS, lessonsDone: 5, counts: { perfect: 1 } }
  const r = rewards.claimMissions(base)
  const got = r.fresh.map((f) => f.reward)
  assert.ok(got.includes('skin:forest'), 'ماراثون ٥ دروس ← ثيم الغابة')
  assert.ok(got.includes('acc:glasses'), 'بلا غلط ← نضارة')
  assert.ok(r.progress.unlocked.includes('skin:forest'))
  const again = rewards.claimMissions(r.progress)
  assert.equal(again.fresh.length, 0, 'ما بتنحسب مرتين')
})

test('المستويات', () => {
  assert.equal(rewards.levelOf(0).level, 1)
  assert.equal(rewards.levelOf(8).level, 2)
  assert.equal(rewards.levelOf(10000).next, null)
})

test('مقارنة النسخ للتحديث', () => {
  assert.ok(update.isNewer('54.0.1', '54.0.0'))
  assert.ok(update.isNewer('v55.0.0', '54.9.9'))
  assert.ok(update.isNewer('54.10.0', '54.9.0'))
  assert.ok(!update.isNewer('54.0.0', '54.0.0'))
  assert.ok(!update.isNewer('v54.0.0', '54.0.0'))
  assert.ok(!update.isNewer('53.9.9', '54.0.0'))
})

test('اختيار آخر ريليس: بيتجاهل ريليسات الدليل والمسودات والنسخ بلا APK', () => {
  const apk = (v: string) => [{ name: `studybuddy-${v}.apk`, browser_download_url: `https://x/${v}.apk` }]
  const list = [
    { tag_name: 'guide-v1.0.0', assets: [{ name: 'Guide.html', browser_download_url: 'https://x/g.html' }] },
    { tag_name: 'v54.0.1', draft: true, assets: apk('v54.0.1') },
    { tag_name: 'v55.0.0', prerelease: true, assets: apk('v55.0.0') },
    { tag_name: 'v54.0.0', assets: apk('v54.0.0') },
    { tag_name: 'v54.1.0', assets: [] },
    { tag_name: 'v50.5.0', assets: apk('v50.5.0') },
  ]
  assert.equal(update.pickRelease(list)?.tag_name, 'v54.0.0')
  assert.equal(update.pickRelease([{ tag_name: 'guide-v1.0.0', assets: apk('g') }]), null)
})

test('ملخص اليوم: بيعدّ دروس اليوم بس', () => {
  const now = Date.now()
  type L = Parameters<typeof store.todaySummary>[0][number]
  const mk = (id: string, doneAt?: number, done = true) =>
    ({ id, bookId: 'b', title: `درس ${id}`, subject: 's', summary: '', steps: [], hints: [], quiz: [], videoQuery: '', imageId: '', createdAt: 0, done, right: 0, total: 0, doneAt }) as L
  const day = store.todayKey()
  const progress = { ...store.DEFAULT_PROGRESS, secByDay: { [day]: 1200 } }
  const memory = { ...store.DEFAULT_MEMORY, taught: { a: day, b: '2020-01-01' }, read: { c: day } }
  const t = store.todaySummary([mk('1', now), mk('2', now - 3 * DAY), mk('3', undefined, false)], memory, progress)
  assert.deepEqual(t.lessons, ['درس 1'])
  assert.equal(t.minutes, 20)
  assert.equal(t.teach, 1)
  assert.equal(t.read, 1)
})
