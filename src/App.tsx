import { useCallback, useEffect, useRef, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { learningInsight, weeklyNarrative } from './lib/ai.ts'
import type { LessonDraft } from './lib/ai.ts'
import { removeImage } from './lib/archive.ts'
import { COMPS } from './lib/companions.ts'
import { applyNotify, loadNotify } from './lib/notify.ts'
import type { NotifyPrefs } from './lib/notify.ts'
import { SUBJECT_COLOR, claimMissions, itemName, nextAchievement, nextSticker } from './lib/rewards.ts'
import { checkAnswer, checkPin, hasPin, migrateLegacyPin, setPin } from './lib/security.ts'
import {
  DEFAULT_MEMORY,
  DEFAULT_PROGRESS,
  addReview,
  addSeconds,
  bumpSignal,
  addCount,
  completeLesson,
  dueItems,
  gradeReview,
  loadBooks,
  loadDevice,
  loadHomework,
  loadLessons,
  loadMemory,
  loadParent,
  loadProgress,
  lessonStarKey,
  loadStudents,
  markStarLesson,
  recordAnswer,
  recordResult,
  removeStudentData,
  saveBooks,
  saveDevice,
  saveHomework,
  saveLessons,
  saveMemory,
  saveParent,
  saveProgress,
  saveStudents,
  secondsToday,
  starLessonsToday,
  todayKey,
  todaySummary,
  uid,
  weekStarLessons,
  weekStartKey,
} from './lib/store.ts'
import type { Book, Device, Homework, Lesson, Memory, ParentData, Progress, ReviewSeed, SignalKind, Student } from './lib/store.ts'
import {
  clearCloud,
  connectParent,
  createPairing,
  joinWithString,
  loadCloud,
  markHomeworkDone,
  parseConfig,
  pushKid,
  pushSettings,
  sendHomework,
  sendOp,
  deleteOp,
  watchHomework,
  watchKids,
  watchOps,
  watchSettings,
} from './lib/sync.ts'
import type { BookOp, CloudKid, CloudSettings, CloudState } from './lib/sync.ts'
import { applyBackup, exportStudent, parseBackup } from './lib/backup.ts'
import { checkUpdate, updateLater } from './lib/update.ts'
import type { UpdateInfo } from './lib/update.ts'
import type { ParsedBackup } from './lib/backup.ts'
import Album from './components/Album.tsx'
import BookView from './components/BookView.tsx'
import Desk from './components/Desk.tsx'
import { BookForm, StudentForm } from './components/forms.tsx'
import Game from './components/Game.tsx'
import LessonPlayer from './components/LessonPlayer.tsx'
import type { FinishInfo } from './components/LessonPlayer.tsx'
import Missions from './components/Missions.tsx'
import Parent from './components/Parent.tsx'
import ReadAloud from './components/ReadAloud.tsx'
import Review from './components/Review.tsx'
import Teach from './components/Teach.tsx'
import type { KidView } from './components/Parent.tsx'
import { Setup, Welcome } from './components/Setup.tsx'
import { AskSheet, CustomizeSheet, DecorateSheet, HomeworkSheet, NoteSheet, PickBookSheet } from './components/Sheets.tsx'
import { AR, Icon, PinPad, Sheet } from './components/ui.tsx'
import Who from './components/Who.tsx'

type View =
  | { k: 'welcome' }
  | { k: 'setup'; start: 'pin' | 'student' }
  | { k: 'who' }
  | { k: 'desk' }
  | { k: 'book'; id: string }
  | { k: 'lesson'; id: string; from: string }
  | { k: 'album' }
  | { k: 'game' }
  | { k: 'review' }
  | { k: 'teach' }
  | { k: 'read' }
  | { k: 'missions' }
  | { k: 'parent' }
  | { k: 'locked' }

type SheetKind =
  | { k: 'custom' }
  | { k: 'ask' }
  | { k: 'addbook' }
  | { k: 'addstudent' }
  | { k: 'pick' }
  | { k: 'hw' }
  | { k: 'decorate'; book: string }
  | { k: 'note'; text: string }

type PinFlow =
  | { k: 'verify'; then: () => void }
  | { k: 'forgot'; then: () => void }
  | { k: 'new1'; then: () => void }
  | { k: 'new2'; p1: string; then: () => void }

interface Data {
  progress: Progress
  books: Book[]
  lessons: Lesson[]
  memory: Memory
  hw: Homework[]
}

const EMPTY_DATA: Data = { progress: { ...DEFAULT_PROGRESS }, books: [], lessons: [], memory: { ...DEFAULT_MEMORY }, hw: [] }

const loadAll = (id: string): Data =>
  id === ''
    ? EMPTY_DATA
    : { progress: loadProgress(id), books: loadBooks(id), lessons: loadLessons(id), memory: loadMemory(id), hw: loadHomework(id) }

function initialView(): View {
  const d = loadDevice()
  const par = loadParent()
  const list = loadStudents()
  if (d.mode === '') return { k: 'welcome' }
  if (!hasPin(par)) return { k: 'setup', start: 'pin' }
  if (d.mode === 'parent') return { k: 'locked' }
  if (list.length === 0) return { k: 'setup', start: 'student' }
  return list.some((s) => s.id === d.active) ? { k: 'desk' } : { k: 'who' }
}

function newLesson(draft: LessonDraft, bookId: string, imageId: string): Lesson {
  return {
    id: uid(),
    bookId,
    title: draft.title,
    subject: draft.subject,
    summary: draft.summary,
    steps: draft.steps,
    hints: draft.hints,
    quiz: draft.quiz,
    spot: draft.spot,
    videoQuery: draft.videoQuery,
    imageId,
    createdAt: Date.now(),
    done: false,
    right: 0,
    total: 0,
  }
}

function mergeHw(local: Homework[], remote: Homework[]): Homework[] {
  const map = new Map<string, Homework>()
  for (const h of local) map.set(h.id, h)
  for (const r of remote) {
    const cur = map.get(r.id)
    map.set(r.id, cur ? { ...cur, done: cur.done || r.done } : r)
  }
  return [...map.values()].sort((a, b) => b.ts - a.ts).slice(0, 20)
}

const FREE_BOOK = { id: '', title: 'أسئلتي', subject: 'سؤال', color: '#FFE36E' }

/** أمر كتاب من الأهل: إضافة، أرشفة، أو حذف نهائي (مع دروسو وصور صفحاتو). بيتنفّذ أكتر من مرة بدون مشكلة. */
function applyBookOp(d: Data, op: BookOp): Data {
  if (op.type === 'addBook') {
    if (d.books.some((b) => b.id === op.book.id)) return d
    return { ...d, books: [{ id: op.book.id, title: op.book.title, subject: op.book.subject, createdAt: Date.now() }, ...d.books] }
  }
  if (op.type === 'archiveBook') return { ...d, books: d.books.map((b) => (b.id === op.bookId ? { ...b, archived: op.archived } : b)) }
  const rest = d.lessons.filter((l) => l.bookId !== op.bookId)
  for (const l of d.lessons) {
    if (l.bookId === op.bookId && l.imageId !== '' && !rest.some((x) => x.imageId === l.imageId)) void removeImage(l.imageId)
  }
  return { ...d, books: d.books.filter((b) => b.id !== op.bookId), lessons: rest }
}

export default function App() {
  const [students, setStudents] = useState<Student[]>(loadStudents)
  const [parent, setParent] = useState<ParentData>(loadParent)
  const [device, setDevice] = useState<Device>(loadDevice)
  const [view, setView] = useState<View>(initialView)
  const [data, setData] = useState<Data>(() => {
    const d = loadDevice()
    return loadAll(loadStudents().some((s) => s.id === d.active) ? d.active : '')
  })
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  const [pinFlow, setPinFlow] = useState<PinFlow | null>(null)
  const [session, setSession] = useState(0)
  const [cloud, setCloud] = useState<CloudState>(loadCloud)
  const [cloudKids, setCloudKids] = useState<CloudKid[]>([])
  const [cloudErr, setCloudErr] = useState('')
  const [overrides, setOverrides] = useState<Record<string, Partial<Student>>>({})
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [importPlan, setImportPlan] = useState<{ b: ParsedBackup; exists: boolean } | null>(null)
  const [pkid, setPkid] = useState('')
  const [notify, setNotify] = useState<NotifyPrefs>(loadNotify)

  const active = device.active
  const student = students.find((s) => s.id === active)
  const apiKey = parent.geminiKey
  const limitReached = !!student && student.limitMin > 0 && secondsToday(data.progress) >= student.limitMin * 60
  const hwPending = data.hw.filter((h) => !h.done)

  // ---- حفظ تلقائي على الجهاز ----
  useEffect(() => saveStudents(students), [students])
  // حفظ على الجهاز: بيتأجّل شوي ليجمع التغييرات (الدروس كتير وثقيلة)، وبيتحفظ فوراً عند الخروج أو تبديل الطالب.
  const latest = useRef({ active, data })
  latest.current = { active, data }
  const flush = useCallback(() => {
    const { active: a, data: d } = latest.current
    if (a === '') return
    saveProgress(a, d.progress)
    saveBooks(a, d.books)
    saveLessons(a, d.lessons)
    saveMemory(a, d.memory)
    saveHomework(a, d.hw)
  }, [])
  useEffect(() => {
    const t = window.setTimeout(flush, 400)
    return () => window.clearTimeout(t)
  }, [data, active, flush])
  useEffect(() => {
    const h = () => flush()
    window.addEventListener('pagehide', h)
    document.addEventListener('visibilitychange', h)
    return () => {
      window.removeEventListener('pagehide', h)
      document.removeEventListener('visibilitychange', h)
    }
  }, [flush])

  // رقم النسخة القديمة (نص عادي) بيتحوّل لهاش مرة وحدة.
  useEffect(() => {
    void migrateLegacyPin().then(() => setParent(loadParent()))
  }, [])

  // فحص تحديث جديد عند فتح التطبيق (مرة كل ١٢ ساعة): بيطلع بانر عند الطالب وعند الأهل.
  useEffect(() => {
    void checkUpdate(false).then((r) => {
      if (r.ok) setUpdate(r.info)
    })
  }, [])

  // مهمّة وصل لها الطالب: بتنفتح الجايزة وبينعلن.
  useEffect(() => {
    const r = claimMissions(data.progress)
    if (r.fresh.length === 0) return
    setData((d) => {
      const x = claimMissions(d.progress)
      return x.fresh.length > 0 ? { ...d, progress: x.progress } : d
    })
    setSheet({ k: 'note', text: `خلّصت مهمّة! فتحت: ${r.fresh.map((f) => itemName(f.reward)).join('، ')}` })
  }, [data.progress])

  // ثيم الطالب المفتوح (وقسم الأهل بثيم هادي).
  useEffect(() => {
    const kidScreen = ['desk', 'book', 'lesson', 'album', 'game', 'review', 'teach', 'read', 'missions'].includes(view.k)
    const skin = view.k === 'parent' ? 'parent' : kidScreen && student ? student.skin : 'notebook'
    document.documentElement.setAttribute('data-skin', skin)
  }, [view.k, student])

  // ---- مزامنة Firebase (اختيارية) ----
  useEffect(() => {
    if (cloud.role !== 'device' || !student) return
    const t = window.setTimeout(
      () => void pushKid(cloud, student, data.progress, data.memory, data.books, todaySummary(data.lessons, data.memory, data.progress)),
      1500,
    )
    return () => window.clearTimeout(t)
  }, [cloud, student, data.progress, data.memory, data.books, data.lessons])

  useEffect(() => {
    if (cloud.role !== 'device' || active === '') return
    const a = watchSettings(cloud, active, (s) => setStudents((prev) => prev.map((st) => (st.id === active ? { ...st, ...s } : st))))
    const b = watchHomework(cloud, active, (list) => setData((d) => ({ ...d, hw: mergeHw(d.hw, list) })))
    // أوامر الأهل للكتب (إضافة/أرشفة/حذف): بتتنفّذ وبتتمسح.
    const c = watchOps(cloud, active, (list) => {
      if (list.length === 0) return
      setData((d) => list.reduce((acc, x) => applyBookOp(acc, x.op), d))
      for (const x of list) void deleteOp(cloud, active, x.id)
    })
    return () => {
      a()
      b()
      c()
    }
  }, [cloud, active])

  useEffect(() => {
    if (device.mode !== 'parent' || cloud.role !== 'parent' || view.k !== 'parent') return
    setCloudErr('')
    return watchKids(cloud, setCloudKids, setCloudErr)
  }, [device.mode, cloud, view.k])

  // ---- مساعدات ----
  const updateStudent = (id: string, patch: Partial<Student>) =>
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  /** تعديل إعدادات طالب: محلي، وبيتزامن مع الجهاز التاني إذا مربوطين. */
  const patchStudent = (id: string, patch: Partial<Student>) => {
    updateStudent(id, patch)
    if (device.mode === 'parent') setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }))
    if (cloud.role === '') return
    const cs: Partial<CloudSettings> = {}
    if (patch.limitMin !== undefined) cs.limitMin = patch.limitMin
    if (patch.canEdit !== undefined) cs.canEdit = patch.canEdit
    if (patch.goal !== undefined) cs.goal = patch.goal
    if (patch.starCap !== undefined) cs.starCap = patch.starCap
    if (Object.keys(cs).length > 0) void pushSettings(cloud, id, cs)
  }

  /** الكتب بإدارة الأهل: محلي مباشرة، أو أمر عبر Firebase لجهاز الطالب. */
  const bookOp = async (kidId: string, op: BookOp): Promise<string> => {
    if (device.mode !== 'parent') {
      if (kidId === active) setData((d) => applyBookOp(d, op))
      else {
        const nd = applyBookOp(loadAll(kidId), op)
        saveBooks(kidId, nd.books)
        saveLessons(kidId, nd.lessons)
      }
      return ''
    }
    const r = await sendOp(cloud, kidId, op)
    return r.ok ? '' : r.error
  }

  const askAddBook = () =>
    student?.canEdit ? setSheet({ k: 'addbook' }) : setPinFlow({ k: 'verify', then: () => setSheet({ k: 'addbook' }) })

  const doImport = async (asCopy: boolean) => {
    if (!importPlan) return
    flush()
    const s = await applyBackup(importPlan.b, asCopy)
    setStudents((prev) => (prev.some((x) => x.id === s.id) ? prev.map((x) => (x.id === s.id ? s : x)) : [...prev, s]))
    if (s.id === active) {
      const nd = loadAll(s.id)
      latest.current = { active, data: nd }
      setData(nd)
    }
  }

  const openStudent = (id: string) => {
    flush()
    const next = { ...device, active: id }
    setDevice(next)
    saveDevice(next)
    setData(loadAll(id))
    setSession(0)
    setSheet(null)
    setView({ k: 'desk' })
  }

  const enterParent = () => {
    const open = () => {
      setPkid((cur) => cur || active || students[0]?.id || '')
      setView({ k: 'parent' })
    }
    setPinFlow({ k: 'verify', then: open })
  }

  const signal = useCallback((kind: SignalKind) => setData((d) => ({ ...d, memory: bumpSignal(d.memory, kind) })), [])
  const onAnswer = useCallback(
    (skill: string, ok: boolean, tag: string, seed?: ReviewSeed) =>
      setData((d) => {
        const m = recordAnswer(d.memory, skill, ok, tag)
        return { ...d, memory: !ok && seed ? addReview(m, seed) : m }
      }),
    [],
  )
  const onTime = useCallback((sec: number) => setData((d) => ({ ...d, progress: addSeconds(d.progress, sec) })), [])
  // النجوم بتنربح من دروس الكتب بس. الألعاب والمراجعة والشرح والقراءة بتحسب بالمهمّات.
  const onGameWin = useCallback(() => undefined, [])
  const onReviewFinish = useCallback(() => undefined, [])
  const onReviewGrade = useCallback(
    (id: string, ok: boolean) =>
      setData((d) => {
        const cur = d.memory.review.find((r) => r.id === id)
        const mastered = ok && !!cur && cur.box >= 3
        return { ...d, memory: gradeReview(d.memory, id, ok), progress: mastered ? addCount(d.progress, 'review') : d.progress }
      }),
    [],
  )
  /** عدّاد مهمّة مرة باليوم لكل درس/نص، إذا التقييم ٢ أو ٣. */
  const award = (kind: 'taught' | 'read', key: string, score: number) => {
    if (score < 2) return
    const today = todayKey()
    setData((d) =>
      d.memory[kind][key] === today
        ? d
        : {
            ...d,
            progress: addCount(d.progress, kind === 'taught' ? 'teach' : 'reader'),
            memory: { ...d.memory, [kind]: { ...d.memory[kind], [key]: today } },
          },
    )
  }

  const finishLesson = (lessonId: string, right: number, total: number, secs: number): FinishInfo => {
    const lesson = data.lessons.find((l) => l.id === lessonId)
    if (!lesson || lesson.done) return { sticker: null, stars: 0, tired: false, fresh: false }
    const key = lessonStarKey(lesson)
    const cap = student?.starCap ?? 3
    let noStars = ''
    if (lesson.bookId === '') noStars = 'هاد سؤال حر. النجوم بتنربح من دروس الكتب.'
    else if (secs < 60) noStars = 'خلّصت بسرعة كتير! النجمة بتجي لما تقضّي دقيقة على الأقل بالدرس.'
    else if (data.progress.starKeys.includes(key)) noStars = 'هالصفحة أخدت نجوم قبل، فما بتنحسب مرتين.'
    else if (cap > 0 && starLessonsToday(data.progress) >= cap) noStars = 'وصلت للحد اليومي للنجوم. بكرا في نجوم جداد.'
    const earn = noStars === ''
    const stars = earn ? (total > 0 && right === total ? 2 : 1) : 0
    const sticker = earn ? nextSticker(data.progress.stickers) : null
    const updated: Lesson = { ...lesson, done: true, right, total, doneAt: Date.now() }
    let progress = completeLesson(data.progress, stars, sticker)
    if (earn) progress = markStarLesson(progress, key)
    if (earn && total > 0 && right === total) progress = addCount(progress, 'perfect')
    let goal: FinishInfo['goal']
    if (earn && student && student.goal > 0 && progress.goalWeek !== weekStartKey() && weekStarLessons(progress) >= student.goal) {
      const gs = nextAchievement(progress.stickers)
      progress = { ...progress, goalWeek: weekStartKey(), stickers: gs ? [...progress.stickers, gs] : progress.stickers }
      goal = { sticker: gs }
    }
    setData((d) => ({
      ...d,
      lessons: d.lessons.map((l) => (l.id === lessonId ? updated : l)),
      progress,
      memory: recordResult(d.memory, updated, right, total),
    }))
    setSession(session + 1)
    return { sticker, stars, tired: session + 1 >= 2, fresh: true, goal, noStars: earn ? undefined : noStars }
  }

  const addBook = (title: string, subject: string) => {
    const book: Book = { id: uid(), title, subject, createdAt: Date.now() }
    setData((d) => ({ ...d, books: [book, ...d.books] }))
    setSheet(null)
    setView({ k: 'book', id: book.id })
  }

  const openLesson = (lesson: Lesson, from: string) => {
    setSheet(null)
    setData((d) => ({ ...d, lessons: [lesson, ...d.lessons] }))
    setView({ k: 'lesson', id: lesson.id, from })
  }

  const deleteLesson = (id: string) => {
    setData((d) => {
      const target = d.lessons.find((l) => l.id === id)
      const rest = d.lessons.filter((l) => l.id !== id)
      if (target && target.imageId !== '' && !rest.some((l) => l.imageId === target.imageId)) void removeImage(target.imageId)
      return { ...d, lessons: rest }
    })
  }

  const setCover = (bookId: string, patch: { color?: string; sticker?: string }) =>
    setData((d) => ({
      ...d,
      progress: { ...d.progress, covers: { ...d.progress.covers, [bookId]: { ...d.progress.covers[bookId], ...patch } } },
    }))

  const pushAll = (state: CloudState) => {
    for (const s of students) {
      const d = s.id === active ? data : loadAll(s.id)
      void pushKid(state, s, d.progress, d.memory, d.books, todaySummary(d.lessons, d.memory, d.progress))
    }
  }

  const localKid = (s: Student): KidView => {
    const d = s.id === active ? data : loadAll(s.id)
    return { student: s, progress: d.progress, memory: d.memory, local: true, books: d.books, today: todaySummary(d.lessons, d.memory, d.progress) }
  }

  const kids: KidView[] =
    view.k !== 'parent'
      ? []
      : device.mode === 'parent'
      ? cloudKids.map((k) => ({
          student: {
            id: k.id,
            name: k.profile.name,
            grade: k.profile.grade,
            gender: k.profile.gender,
            av: k.profile.av,
            comp: k.profile.comp,
            skin: k.profile.skin,
            acc: k.profile.acc ?? {},
            voice: COMPS[k.profile.comp]?.voice ?? 'Puck',
            limitMin: k.limitMin ?? 0,
            goal: k.goal ?? 3,
            canEdit: k.canEdit ?? false,
            starCap: k.starCap ?? 3,
            ...overrides[k.id],
          },
          progress: { ...DEFAULT_PROGRESS, ...k.progress, covers: {} },
          memory: { ...DEFAULT_MEMORY, ...k.memory, insight: '', insightAt: 0, interests: [], notes: '' },
          local: false,
          books: (k.books ?? []).map((b) => ({ id: b.id, title: b.title, subject: b.subject, createdAt: 0, archived: b.archived })),
          today: k.today && k.today.day === todayKey() ? k.today : { day: todayKey(), lessons: [], minutes: 0, teach: 0, read: 0 },
        }))
      : students.map(localKid)

  // ---- زر الرجوع بالتلفون ----
  const backRef = useRef<() => void>(() => undefined)
  backRef.current = () => {
    if (pinFlow) return setPinFlow(null)
    if (sheet) return setSheet(null)
    if (view.k === 'lesson') return setView(view.from === 'desk' ? { k: 'desk' } : { k: 'book', id: view.from })
    if (['book', 'album', 'game', 'review', 'teach', 'read', 'missions'].includes(view.k)) return setView({ k: 'desk' })
    if (view.k === 'parent') return setView(device.mode === 'parent' ? { k: 'locked' } : student ? { k: 'desk' } : { k: 'who' })
    if (view.k === 'desk') return setView({ k: 'who' })
    void CapApp.exitApp()
  }
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const h = CapApp.addListener('backButton', () => backRef.current())
    return () => {
      void h.then((x) => x.remove())
    }
  }, [])

  const pickMode = (mode: 'student' | 'parent') => {
    const next: Device = { mode, active: '' }
    setDevice(next)
    saveDevice(next)
    if (!hasPin(loadParent())) setView({ k: 'setup', start: 'pin' })
    else if (mode === 'parent') setView({ k: 'locked' })
    else setView(students.length > 0 ? { k: 'who' } : { k: 'setup', start: 'student' })
  }

  const finishSetup = (first: Student | null) => {
    setParent(loadParent())
    if (device.mode === 'parent' || !first) {
      setPkid('')
      setView({ k: 'parent' })
      return
    }
    setStudents((prev) => [...prev, first])
    const next: Device = { ...device, active: first.id }
    setDevice(next)
    saveDevice(next)
    setData(loadAll(first.id))
    setView({ k: 'desk' })
  }

  const saveMem = (id: string, fn: (m: Memory) => Memory) => {
    if (id === active) setData((d) => ({ ...d, memory: fn(d.memory) }))
    else saveMemory(id, fn(loadMemory(id)))
  }

  // ---- شاشة الأهل ----
  const parentScreen = (
    <Parent
      kids={kids}
      selected={pkid}
      deviceMode={device.mode === 'parent' ? 'parent' : 'student'}
      apiKey={apiKey}
      cloud={cloud}
      cloudErr={cloudErr}
      notify={notify}
      onSelect={setPkid}
      onBack={() => backRef.current()}
      onSetLimit={(id, min) => patchStudent(id, { limitMin: min })}
      onSendHw={async (id, msg, photo) => {
        const hw: Homework = { id: uid(), msg, photo, ts: Date.now(), done: false }
        if (cloud.role === 'parent') {
          const r = await sendHomework(cloud, id, hw)
          return r.ok ? '' : r.error
        }
        if (id === active) setData((d) => ({ ...d, hw: [hw, ...d.hw].slice(0, 20) }))
        else saveHomework(id, [hw, ...loadHomework(id)])
        return ''
      }}
      onSaveKey={(key) => {
        const next = { ...loadParent(), geminiKey: key }
        saveParent(next)
        setParent(next)
      }}
      onPatchStudent={patchStudent}
      onMemory={(id, patch) => saveMem(id, (m) => ({ ...m, ...patch }))}
      onReset={(id) => {
        if (id === active) setData((d) => ({ ...d, progress: { ...DEFAULT_PROGRESS } }))
        else saveProgress(id, { ...DEFAULT_PROGRESS })
      }}
      onRemove={(id) => {
        for (const l of loadLessons(id)) if (l.imageId !== '') void removeImage(l.imageId)
        removeStudentData(id)
        setStudents((prev) => prev.filter((s) => s.id !== id))
        if (id === active) {
          const next: Device = { ...device, active: '' }
          setDevice(next)
          saveDevice(next)
          setData(EMPTY_DATA)
        }
        setPkid('')
      }}
      onAddStudent={() => setSheet({ k: 'addstudent' })}
      onChangePin={() => setPinFlow({ k: 'verify', then: () => setPinFlow({ k: 'new1', then: () => undefined }) })}
      onNotify={(n) => {
        setNotify(n)
        void applyNotify(n)
      }}
      onConnect={async (text, email, pass) => {
        const cfg = parseConfig(text)
        if (!cfg) return 'ما قدرنا نقرا إعدادات Firebase. انسخ firebaseConfig كامل (apiKey وprojectId وappId).'
        const r = await connectParent(cfg, email, pass)
        if (!r.ok) return r.error
        setCloud(r.data)
        return ''
      }}
      onPair={async () => {
        const r = await createPairing(cloud)
        return { ok: r.ok, text: r.ok ? r.data : r.error }
      }}
      onJoin={async (text) => {
        const r = await joinWithString(text)
        if (!r.ok) return r.error
        setCloud(r.data)
        pushAll(r.data)
        return ''
      }}
      onDisconnect={() => {
        clearCloud()
        setCloud({ config: null, fid: '', role: '', email: '' })
        setCloudKids([])
      }}
      onNarrative={async (k, facts) => {
        const r = await weeklyNarrative({
          apiKey,
          settings: { grade: k.student.grade, comp: k.student.comp, name: k.student.name },
          memory: k.memory,
          facts,
        })
        return { ok: r.ok, text: r.ok ? r.data : r.error }
      }}
      update={update}
      onCheckUpdate={async () => {
        const r = await checkUpdate(true)
        if (!r.ok) return { error: r.error, found: false }
        setUpdate(r.info)
        return { error: '', found: r.info !== null }
      }}
      onUpdateLater={() => {
        if (update) updateLater(update.version)
        setUpdate(null)
      }}
      onBookAdd={(id, title, subject) => bookOp(id, { type: 'addBook', book: { id: uid(), title, subject } })}
      onBookArchive={(id, bookId, archived) => bookOp(id, { type: 'archiveBook', bookId, archived })}
      onBookDelete={(id, bookId) => bookOp(id, { type: 'deleteBook', bookId })}
      onExport={async (id) => (await exportStudent(id)).error}
      onImportFile={async (file) => {
        const r = await parseBackup(file)
        if (!r.ok) return r.error
        setImportPlan({ b: r.data, exists: students.some((s) => s.id === r.data.payload.student.id) })
        return ''
      }}
      onInsight={async (k) => {
        const r = await learningInsight({
          apiKey,
          settings: { grade: k.student.grade, comp: k.student.comp, name: k.student.name },
          memory: k.memory,
        })
        if (r.ok) saveMem(k.student.id, (m) => ({ ...m, insight: r.data, insightAt: Date.now() }))
        return { ok: r.ok, text: r.ok ? r.data : r.error }
      }}
    />
  )

  // الكتب المؤرشفة (من الأهل) مخبّية عن الطالب ودروسها ما بتطلع بالمكتب أو الألعاب.
  const archivedIds = new Set(data.books.filter((b) => b.archived).map((b) => b.id))
  const liveBooks = data.books.filter((b) => !b.archived)
  const liveLessons = data.lessons.filter((l) => !archivedIds.has(l.bookId))

  // ---- الشاشات ----
  const book = view.k === 'book' ? (view.id === '' ? FREE_BOOK : data.books.find((b) => b.id === view.id)) : undefined
  const lesson = view.k === 'lesson' ? data.lessons.find((l) => l.id === view.id) : undefined

  let screen: React.ReactNode
  if (view.k === 'welcome') {
    screen = <Welcome onPick={pickMode} />
  } else if (view.k === 'setup') {
    screen = <Setup key={view.start} mode={device.mode === 'parent' ? 'parent' : 'student'} start={view.start} onFinish={finishSetup} />
  } else if (view.k === 'locked') {
    screen = (
      <main className="screen paper welcome">
        <h1 className="display" style={{ margin: 0 }}>قسم الأهل</h1>
        <p className="muted bold" style={{ margin: 0 }}>دخّل الرمز لتشوف تقدم الطلاب.</p>
        <button type="button" className="btn yellow" onClick={enterParent}>
          <Icon name="lock" size={24} /> دخّل الرمز
        </button>
      </main>
    )
  } else if (view.k === 'parent') {
    screen = parentScreen
  } else if (view.k === 'who' || !student) {
    screen = (
      <Who
        students={students}
        paired={cloud.role === 'device'}
        onPick={openStudent}
        onAdd={() => setPinFlow({ k: 'verify', then: () => setSheet({ k: 'addstudent' }) })}
        onParent={enterParent}
        onPair={enterParent}
      />
    )
  } else if (view.k === 'book' && book) {
    screen = (
      <BookView
        key={view.id}
        student={student}
        memory={data.memory}
        apiKey={apiKey}
        book={{ ...book, color: SUBJECT_COLOR[book.subject] ?? '#B8A6FF' }}
        cover={data.progress.covers[book.id] ?? {}}
        lessons={data.lessons.filter((l) => l.bookId === book.id)}
        onBack={() => setView({ k: 'desk' })}
        onSavePages={(drafts, imageId) => setData((d) => ({ ...d, lessons: [...drafts.map((x) => newLesson(x, book.id, imageId)), ...d.lessons] }))}
        onAskSave={(draft) => openLesson(newLesson(draft, book.id, ''), book.id)}
        onOpenLesson={(id) => setView({ k: 'lesson', id, from: book.id })}
        onSignal={signal}
        onDelete={deleteLesson}
        onDecorate={() => setSheet({ k: 'decorate', book: book.id })}
        onNeedParent={(then) => setPinFlow({ k: 'verify', then })}
      />
    )
  } else if (view.k === 'lesson' && lesson) {
    screen = (
      <LessonPlayer
        key={lesson.id}
        student={student}
        memory={data.memory}
        lesson={lesson}
        apiKey={apiKey}
        onBack={() => setView(view.from === 'desk' ? { k: 'desk' } : { k: 'book', id: view.from })}
        onAnswer={onAnswer}
        onSignal={signal}
        onTime={onTime}
        onFinish={finishLesson}
        onAlbum={() => setView({ k: 'album' })}
      />
    )
  } else if (view.k === 'album') {
    screen = <Album student={student} progress={data.progress} onBack={() => setView({ k: 'desk' })} />
  } else if (view.k === 'game') {
    screen = <Game student={student} lessons={liveLessons} onBack={() => setView({ k: 'desk' })} onWin={onGameWin} />
  } else if (view.k === 'missions') {
    screen = <Missions student={student} progress={data.progress} onBack={() => setView({ k: 'desk' })} />
  } else if (view.k === 'review') {
    screen = <Review student={student} memory={data.memory} onGrade={onReviewGrade} onFinish={onReviewFinish} onBack={() => setView({ k: 'desk' })} />
  } else if (view.k === 'teach') {
    screen = <Teach student={student} memory={data.memory} lessons={liveLessons} apiKey={apiKey} onScore={(id, s) => award('taught', id, s)} onBack={() => setView({ k: 'desk' })} />
  } else if (view.k === 'read') {
    screen = <ReadAloud student={student} memory={data.memory} lessons={liveLessons} apiKey={apiKey} onScore={(k, s) => award('read', k, s)} onBack={() => setView({ k: 'desk' })} />
  } else {
    screen = (
      <Desk
        student={student}
        progress={data.progress}
        books={liveBooks}
        lessons={liveLessons}
        hwPending={hwPending.length}
        limitReached={limitReached}
        tired={session >= 2}
        onWho={() => setView({ k: 'who' })}
        onParent={enterParent}
        onBook={(id) => setView({ k: 'book', id })}
        onContinue={(id) => setView({ k: 'lesson', id, from: 'desk' })}
        onAlbum={() => setView({ k: 'album' })}
        onGame={() => setView({ k: 'game' })}
        onCustomize={() => setSheet({ k: 'custom' })}
        onAsk={() => setSheet({ k: 'ask' })}
        onAddBook={askAddBook}
        onSnap={() => {
          const hasFree = data.lessons.some((l) => l.bookId === '')
          if (liveBooks.length === 0) askAddBook()
          else if (liveBooks.length === 1 && !hasFree) setView({ k: 'book', id: liveBooks[0].id })
          else setSheet({ k: 'pick' })
        }}
        onHw={() => setSheet({ k: 'hw' })}
        dueCount={dueItems(data.memory).length}
        goal={{ count: weekStarLessons(data.progress), target: student.goal, claimed: data.progress.goalWeek === weekStartKey() }}
        onReview={() => setView({ k: 'review' })}
        onTeach={() => setView({ k: 'teach' })}
        onRead={() => setView({ k: 'read' })}
        onMissions={() => setView({ k: 'missions' })}
        update={update}
        onUpdateLater={() => {
          if (update) updateLater(update.version)
          setUpdate(null)
        }}
        onPlant={() =>
          setSheet({
            k: 'note',
            text: data.progress.lessonsDone >= 3 ? 'نبتتك زهّرت! كل درس بتخلّصو بيسقيها.' : 'كل درس بتخلّصو بيسقي النبتة. إذا غبت ما بتزعل، بتستنّاك.',
          })
        }
      />
    )
  }

  // ---- النوافذ السفلية ----
  let sheetEl: React.ReactNode = null
  if (sheet && student && sheet.k === 'custom') {
    sheetEl = <CustomizeSheet student={student} progress={data.progress} onChange={(patch) => updateStudent(student.id, patch)} onClose={() => setSheet(null)} />
  } else if (sheet && student && sheet.k === 'ask') {
    sheetEl = (
      <AskSheet
        student={student}
        memory={data.memory}
        apiKey={apiKey}
        onDraft={(d) => {
          setData((x) => ({ ...x, memory: bumpSignal(x.memory, 'asked') }))
          openLesson(newLesson(d, '', ''), 'desk')
        }}
        onClose={() => setSheet(null)}
      />
    )
  } else if (sheet && sheet.k === 'addbook') {
    sheetEl = (
      <Sheet onClose={() => setSheet(null)} label="إضافة كتاب">
        <h2 className="display">كتاب جديد</h2>
        <BookForm onSave={addBook} />
      </Sheet>
    )
  } else if (sheet && sheet.k === 'addstudent') {
    sheetEl = (
      <Sheet onClose={() => setSheet(null)} label="طالب جديد">
        <h2 className="display">طالب جديد</h2>
        <StudentForm
          onSave={(s) => {
            setStudents((prev) => [...prev, s])
            setSheet(null)
            if (view.k === 'parent') setPkid(s.id)
            else openStudent(s.id)
          }}
        />
      </Sheet>
    )
  } else if (sheet && student && sheet.k === 'pick') {
    sheetEl = (
      <PickBookSheet
        books={liveBooks}
        hasFree={data.lessons.some((l) => l.bookId === '')}
        onPick={(id) => {
          setSheet(null)
          setView({ k: 'book', id })
        }}
        onClose={() => setSheet(null)}
      />
    )
  } else if (sheet && student && sheet.k === 'hw') {
    sheetEl = (
      <HomeworkSheet
        student={student}
        items={hwPending}
        onDone={(id) => {
          setData((d) => ({ ...d, hw: d.hw.map((h) => (h.id === id ? { ...h, done: true } : h)) }))
          void markHomeworkDone(cloud, active, id)
          if (hwPending.length <= 1) setSheet(null)
        }}
        onClose={() => setSheet(null)}
      />
    )
  } else if (sheet && sheet.k === 'decorate') {
    const target = data.books.find((b) => b.id === sheet.book)
    if (target) sheetEl = <DecorateSheet book={target} progress={data.progress} onPick={(patch) => setCover(target.id, patch)} onClose={() => setSheet(null)} />
  } else if (sheet && student && sheet.k === 'note') {
    sheetEl = <NoteSheet student={student} text={sheet.text} onClose={() => setSheet(null)} />
  }

  // ---- قفل الأهل ----
  let pinEl: React.ReactNode = null
  if (pinFlow?.k === 'verify') {
    const flow = pinFlow
    pinEl = (
      <PinPad
        key="verify"
        title="قسم الأهل"
        sub="دخّل الرمز."
        onClose={() => setPinFlow(null)}
        onForgot={() => setPinFlow({ k: 'forgot', then: flow.then })}
        onSubmit={async (p) => {
          const r = await checkPin(p)
          if (r.ok) {
            setPinFlow(null)
            flow.then()
          }
          return r
        }}
      />
    )
  } else if (pinFlow?.k === 'forgot') {
    pinEl = <ForgotSheet question={parent.q?.text ?? ''} onClose={() => setPinFlow(null)} onOk={() => setPinFlow({ k: 'new1', then: pinFlow.then })} />
  } else if (pinFlow?.k === 'new1') {
    const flow = pinFlow
    pinEl = (
      <PinPad
        key="new1"
        title="اختار رمز جديد"
        sub="٤ لـ ٦ أرقام."
        onClose={() => setPinFlow(null)}
        onSubmit={async (p) => {
          setPinFlow({ k: 'new2', p1: p, then: flow.then })
          return { ok: true }
        }}
      />
    )
  } else if (pinFlow?.k === 'new2') {
    const flow = pinFlow
    pinEl = (
      <PinPad
        key="new2"
        title="أكّد الرمز الجديد"
        onClose={() => setPinFlow(null)}
        onSubmit={async (p) => {
          if (p !== flow.p1) return { ok: false, msg: 'مو نفس الرمز. جرّب كمان مرة.' }
          await setPin(p)
          setParent(loadParent())
          setPinFlow(null)
          flow.then()
          return { ok: true }
        }}
      />
    )
  }

  return (
    <div className="app">
      {screen}
      {sheetEl}
      {pinEl}
      {importPlan && <ImportSheet plan={importPlan} onApply={doImport} onClose={() => setImportPlan(null)} />}
    </div>
  )
}

/** نسيت الرمز: جواب سؤال الأمان بيرجّع الدخول. */
function ForgotSheet({ question, onClose, onOk }: { question: string; onClose: () => void; onOk: () => void }) {
  const [ans, setAns] = useState('')
  const [msg, setMsg] = useState('')
  if (question === '') {
    return (
      <Sheet onClose={onClose} label="نسيت الرمز">
        <h2 className="display">نسيت الرمز؟</h2>
        <p style={{ margin: 0, fontWeight: 700, lineHeight: 1.7 }}>ما حطّيت سؤال أمان. بتقدر تمسح بيانات التطبيق من إعدادات التلفون وتبلّش من جديد.</p>
        <button type="button" className="btn yellow" onClick={onClose}>
          تمام
        </button>
      </Sheet>
    )
  }
  return (
    <Sheet onClose={onClose} label="نسيت الرمز">
      <h2 className="display">نسيت الرمز؟</h2>
      <label className="field">
        {question}
        <input className="input" value={ans} onChange={(e) => setAns(e.target.value)} autoComplete="off" />
      </label>
      {msg && (
        <p className="error" role="alert">
          {msg}
        </p>
      )}
      <button
        type="button"
        className="btn yellow"
        onClick={() => {
          void checkAnswer(ans).then((ok) => (ok ? onOk() : setMsg('الجواب مو صح.')))
        }}
      >
        تحقّق
      </button>
    </Sheet>
  )
}

/** استيراد نسخة طالب: استبدال أو إضافة كنسخة جديدة. */
function ImportSheet({ plan, onApply, onClose }: { plan: { b: ParsedBackup; exists: boolean }; onApply: (asCopy: boolean) => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const p = plan.b.payload
  const run = async (asCopy: boolean) => {
    setBusy(true)
    setErr('')
    try {
      await onApply(asCopy)
      setDone(true)
    } catch {
      setErr('ما قدرنا نكمّل الاستيراد. جرّب مرة تانية.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet onClose={onClose} label="استيراد بيانات طالب">
      <h2 className="display">{done ? 'انستورد!' : `استيراد ${p.student.name}`}</h2>
      {done ? (
        <button type="button" className="btn yellow" onClick={onClose}>
          تمام
        </button>
      ) : (
        <>
          <p style={{ margin: 0, fontWeight: 700, lineHeight: 1.7 }}>
            بالملف: {AR(p.lessons.length)} درس، {AR(p.books.length)} كتب، {AR(p.progress.stars)} نجمة.
            {plan.exists && ' الطالب هاد موجود على هالجهاز.'}
          </p>
          {plan.exists ? (
            <>
              <button type="button" className="btn accent" disabled={busy} onClick={() => void run(false)}>
                استبدل بيانات الطالب الحالي
              </button>
              <button type="button" className="btn" disabled={busy} onClick={() => void run(true)}>
                أضفو كطالب جديد (نسخة)
              </button>
            </>
          ) : (
            <button type="button" className="btn yellow" disabled={busy} onClick={() => void run(false)}>
              {busy ? '…' : 'استورد'}
            </button>
          )}
          {err && (
            <p className="error" role="alert">
              {err}
            </p>
          )}
          <button type="button" className="btn ghost" onClick={onClose}>
            إلغاء
          </button>
        </>
      )}
    </Sheet>
  )
}