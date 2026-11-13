import { useCallback, useEffect, useRef, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { learningInsight, weeklyNarrative } from './lib/ai.ts'
import type { LessonDraft } from './lib/ai.ts'
import { removeImage } from './lib/archive.ts'
import { COMPS } from './lib/companions.ts'
import { applyNotify, loadNotify } from './lib/notify.ts'
import type { NotifyPrefs } from './lib/notify.ts'
import { SUBJECT_COLOR, nextSticker } from './lib/rewards.ts'
import { checkAnswer, checkPin, hasPin, migrateLegacyPin, setPin } from './lib/security.ts'
import {
  DEFAULT_MEMORY,
  DEFAULT_PROGRESS,
  addSeconds,
  bumpSignal,
  completeLesson,
  loadBooks,
  loadDevice,
  loadHomework,
  loadLessons,
  loadMemory,
  loadParent,
  loadProgress,
  loadStudents,
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
  uid,
} from './lib/store.ts'
import type { Book, Device, Homework, Lesson, Memory, ParentData, Progress, SignalKind, Student } from './lib/store.ts'
import {
  clearCloud,
  connectParent,
  createPairing,
  joinWithString,
  loadCloud,
  markHomeworkDone,
  parseConfig,
  pushKid,
  pushLimit,
  sendHomework,
  watchHomework,
  watchKids,
  watchLimit,
} from './lib/sync.ts'
import type { CloudKid, CloudState } from './lib/sync.ts'
import Album from './components/Album.tsx'
import BookView from './components/BookView.tsx'
import Desk from './components/Desk.tsx'
import { BookForm, StudentForm } from './components/forms.tsx'
import Game from './components/Game.tsx'
import LessonPlayer from './components/LessonPlayer.tsx'
import type { FinishInfo } from './components/LessonPlayer.tsx'
import Parent from './components/Parent.tsx'
import type { KidView } from './components/Parent.tsx'
import { Setup, Welcome } from './components/Setup.tsx'
import { AskSheet, CustomizeSheet, DecorateSheet, HomeworkSheet, NoteSheet, PickBookSheet } from './components/Sheets.tsx'
import { Icon, PinPad, Sheet } from './components/ui.tsx'
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
  const [limits, setLimits] = useState<Record<string, number>>({})
  const [pkid, setPkid] = useState('')
  const [notify, setNotify] = useState<NotifyPrefs>(loadNotify)

  const active = device.active
  const student = students.find((s) => s.id === active)
  const apiKey = parent.geminiKey
  const limitReached = !!student && student.limitMin > 0 && secondsToday(data.progress) >= student.limitMin * 60
  const hwPending = data.hw.filter((h) => !h.done)

  // ---- حفظ تلقائي على الجهاز ----
  useEffect(() => saveStudents(students), [students])
  useEffect(() => {
    if (active === '') return
    saveProgress(active, data.progress)
    saveBooks(active, data.books)
    saveLessons(active, data.lessons)
    saveMemory(active, data.memory)
    saveHomework(active, data.hw)
  }, [data, active])

  // رقم النسخة القديمة (نص عادي) بيتحوّل لهاش مرة وحدة.
  useEffect(() => {
    void migrateLegacyPin().then(() => setParent(loadParent()))
  }, [])

  // ثيم الطالب المفتوح (وقسم الأهل بثيم هادي).
  useEffect(() => {
    const kidScreen = ['desk', 'book', 'lesson', 'album', 'game'].includes(view.k)
    const skin = view.k === 'parent' ? 'parent' : kidScreen && student ? student.skin : 'notebook'
    document.documentElement.setAttribute('data-skin', skin)
  }, [view.k, student])

  // ---- مزامنة Firebase (اختيارية) ----
  useEffect(() => {
    if (cloud.role !== 'device' || !student) return
    const t = window.setTimeout(() => void pushKid(cloud, student, data.progress, data.memory), 1500)
    return () => window.clearTimeout(t)
  }, [cloud, student, data.progress, data.memory])

  useEffect(() => {
    if (cloud.role !== 'device' || active === '') return
    const a = watchLimit(cloud, active, (min) =>
      setStudents((prev) => prev.map((s) => (s.id === active && s.limitMin !== min ? { ...s, limitMin: min } : s))),
    )
    const b = watchHomework(cloud, active, (list) => setData((d) => ({ ...d, hw: mergeHw(d.hw, list) })))
    return () => {
      a()
      b()
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

  const openStudent = (id: string) => {
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
    (skill: string, ok: boolean, tag: string) => setData((d) => ({ ...d, memory: recordAnswer(d.memory, skill, ok, tag) })),
    [],
  )
  const onTime = useCallback((sec: number) => setData((d) => ({ ...d, progress: addSeconds(d.progress, sec) })), [])
  const onGameWin = useCallback(() => setData((d) => ({ ...d, progress: { ...d.progress, stars: d.progress.stars + 1 } })), [])

  const finishLesson = (lessonId: string, right: number, total: number): FinishInfo => {
    const lesson = data.lessons.find((l) => l.id === lessonId)
    if (!lesson || lesson.done) return { sticker: null, stars: 0, tired: false, fresh: false }
    const stars = total > 0 && right === total ? 2 : 1
    const sticker = nextSticker(data.progress.stickers)
    const updated: Lesson = { ...lesson, done: true, right, total }
    setData((d) => ({
      ...d,
      lessons: d.lessons.map((l) => (l.id === lessonId ? updated : l)),
      progress: completeLesson(d.progress, stars, sticker),
      memory: recordResult(d.memory, updated, right, total),
    }))
    setSession(session + 1)
    return { sticker, stars, tired: session + 1 >= 2, fresh: true }
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
      void pushKid(state, s, d.progress, d.memory)
    }
  }

  const localKid = (s: Student): KidView => {
    const d = s.id === active ? data : loadAll(s.id)
    return { student: s, progress: d.progress, memory: d.memory, local: true }
  }

  const kids: KidView[] =
    device.mode === 'parent'
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
            limitMin: limits[k.id] ?? k.limitMin ?? 0,
          },
          progress: { ...DEFAULT_PROGRESS, ...k.progress, covers: {} },
          memory: { ...DEFAULT_MEMORY, ...k.memory, insight: '', insightAt: 0, interests: [], notes: '' },
          local: false,
        }))
      : students.map(localKid)

  // ---- زر الرجوع بالتلفون ----
  const backRef = useRef<() => void>(() => undefined)
  backRef.current = () => {
    if (pinFlow) return setPinFlow(null)
    if (sheet) return setSheet(null)
    if (view.k === 'lesson') return setView(view.from === 'desk' ? { k: 'desk' } : { k: 'book', id: view.from })
    if (view.k === 'book' || view.k === 'album' || view.k === 'game') return setView({ k: 'desk' })
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
      onSetLimit={(id, min) => {
        if (device.mode === 'parent') setLimits((l) => ({ ...l, [id]: min }))
        else updateStudent(id, { limitMin: min })
        if (cloud.role !== '') void pushLimit(cloud, id, min)
      }}
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
      onPatchStudent={updateStudent}
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
    screen = <Game student={student} lessons={data.lessons} onBack={() => setView({ k: 'desk' })} onWin={onGameWin} />
  } else {
    screen = (
      <Desk
        student={student}
        progress={data.progress}
        books={data.books}
        lessons={data.lessons}
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
        onAddBook={() => setSheet({ k: 'addbook' })}
        onSnap={() => {
          const hasFree = data.lessons.some((l) => l.bookId === '')
          if (data.books.length === 0) setSheet({ k: 'addbook' })
          else if (data.books.length === 1 && !hasFree) setView({ k: 'book', id: data.books[0].id })
          else setSheet({ k: 'pick' })
        }}
        onHw={() => setSheet({ k: 'hw' })}
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
    sheetEl = <CustomizeSheet student={student} stars={data.progress.stars} onChange={(patch) => updateStudent(student.id, patch)} onClose={() => setSheet(null)} />
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
        books={data.books}
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
          setData((d) => ({ ...d, hw: d.hw.map((h) => (h.id === id ? { ...h, done: true } : h)), progress: { ...d.progress, stars: d.progress.stars + 1 } }))
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
