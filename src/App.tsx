import { useCallback, useEffect, useState } from 'react'
import Buddy from './components/Buddy.tsx'
import Wizard from './components/Wizard.tsx'
import Lock from './components/Lock.tsx'
import Home from './components/Home.tsx'
import BookView from './components/BookView.tsx'
import LessonSheet from './components/LessonSheet.tsx'
import Library from './components/Library.tsx'
import ParentView from './components/ParentView.tsx'
import type { Book, Lesson, Memory, Mood, Progress, Settings, SignalKind } from './lib/store.ts'
import {
  bumpSignal,
  completeLesson,
  loadBooks,
  loadLessons,
  loadMemory,
  loadProgress,
  loadSettings,
  recordResult,
  saveBooks,
  saveLessons,
  saveMemory,
  saveProgress,
  saveSettings,
  uid,
} from './lib/store.ts'
import type { LessonDraft } from './lib/ai.ts'
import { removeImage } from './lib/archive.ts'
import { personaFor } from './lib/persona.ts'
import { DEFAULT_SETTINGS } from './lib/store.ts'
import { DEFAULT_VOICE } from './lib/tts.ts'

type Tab = 'ask' | 'library' | 'parent'
type View = { kind: 'home' } | { kind: 'book'; id: string } | { kind: 'lesson'; id: string }

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'ask', label: 'اسأل', icon: '🔎' },
  { id: 'library', label: 'دروسي', icon: '🗂️' },
  { id: 'parent', label: 'الأهل', icon: '👨‍👩‍👧' },
]

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
    videoQuery: draft.videoQuery,
    imageId,
    createdAt: Date.now(),
    done: false,
    right: 0,
    total: 0,
  }
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [books, setBooks] = useState<Book[]>(loadBooks)
  const [lessons, setLessons] = useState<Lesson[]>(loadLessons)
  const [memory, setMemory] = useState<Memory>(loadMemory)
  const [tab, setTab] = useState<Tab>('ask')
  const [view, setView] = useState<View>({ kind: 'home' })
  const [mood, setMood] = useState<Mood>('idle')
  const [parentOpen, setParentOpen] = useState(false)
  const persona = personaFor(settings)

  // كل شي بينحفظ على الجهاز أول بأول.
  useEffect(() => saveBooks(books), [books])
  useEffect(() => saveLessons(lessons), [lessons])
  useEffect(() => saveMemory(memory), [memory])

  // الشخصية بترجع لوجهها الهادي بعد شوي من التفاعل.
  useEffect(() => {
    if (mood === 'idle') return
    const timer = window.setTimeout(() => setMood('idle'), 3000)
    return () => window.clearTimeout(timer)
  }, [mood])

  const applySettings = (next: Settings) => {
    setSettings(next)
    saveSettings(next)
  }

  const signal = useCallback((kind: SignalKind) => {
    setMemory((prev) => bumpSignal(prev, kind))
  }, [])

  const addBook = (title: string, subject: string) => {
    const book: Book = { id: uid(), title, subject, createdAt: Date.now() }
    setBooks((prev) => [book, ...prev])
    setView({ kind: 'book', id: book.id })
  }

  const addFromQuestion = (draft: LessonDraft) => {
    const lesson = newLesson(draft, '', '')
    setLessons((prev) => [lesson, ...prev])
    setView({ kind: 'lesson', id: lesson.id })
  }

  const addFromBookQuestion = (draft: LessonDraft) => {
    if (view.kind !== 'book') return
    const lesson = newLesson(draft, view.id, '')
    setLessons((prev) => [lesson, ...prev])
    setView({ kind: 'lesson', id: lesson.id })
  }

  const savePages = (drafts: LessonDraft[], imageId: string) => {
    if (view.kind !== 'book') return
    const fresh = drafts.map((d) => newLesson(d, view.id, imageId))
    setLessons((prev) => [...fresh, ...prev])
  }

  const finishLesson = (lessonId: string, right: number, total: number) => {
    const lesson = lessons.find((l) => l.id === lessonId)
    if (!lesson || lesson.done) return
    const updated: Lesson = { ...lesson, done: true, right, total }
    setLessons((prev) => prev.map((l) => (l.id === lessonId ? updated : l)))
    const stars = total > 0 && right === total ? 2 : 1
    const nextProgress = completeLesson(progress, stars)
    setProgress(nextProgress)
    saveProgress(nextProgress)
    setMemory((prev) => recordResult(prev, updated, right, total))
    setMood('proud')
  }

  const deleteLesson = (id: string) => {
    const target = lessons.find((l) => l.id === id)
    const rest = lessons.filter((l) => l.id !== id)
    setLessons(rest)
    if (target && target.imageId !== '' && !rest.some((l) => l.imageId === target.imageId)) {
      void removeImage(target.imageId)
    }
  }

  const resetProgress = () => {
    const empty: Progress = { stars: 0, lessonsDone: 0, days: [] }
    setProgress(empty)
    saveProgress(empty)
  }

  const goTab = (next: Tab) => {
    setView({ kind: 'home' })
    setTab(next)
    if (next !== 'parent') setParentOpen(false)
  }

  // تبديل الطالب/تسجيل خروج: بيرجّع لشاشة التحضير مع الحفاظ على رقم ولي الأمر والمفتاح.
  const switchStudent = () => {
    const ok = window.confirm(
      'بدك تبدّل الطالب؟ الدروس والصور والنجوم بتضل محفوظة على هالجهاز، والشاشة بترجع لشاشة التحضير.',
    )
    if (!ok) return
    applySettings({
      ...settings,
      childName: '',
      grade: DEFAULT_SETTINGS.grade,
      gender: 'f',
      voice: DEFAULT_VOICE,
    })
    setView({ kind: 'home' })
    setTab('ask')
    setParentOpen(false)
    setMood('idle')
  }

  // أول تشغيل: ولي الأمر بيحضّر التطبيق.
  if (settings.childName === '' || settings.parentPin === '') {
    return (
      <div className="shell">
        <Wizard initial={settings} onDone={applySettings} />
      </div>
    )
  }

  const activeBook = view.kind === 'book' ? books.find((b) => b.id === view.id) : undefined
  const activeLesson = view.kind === 'lesson' ? lessons.find((l) => l.id === view.id) : undefined

  return (
    <div className="shell">
      <header className="topbar">
        <span className="pill brand">StudyBuddy</span>
        <span className="hi">أهلاً {persona.name} 🌟</span>
        <span className="stars">⭐ {progress.stars}</span>
      </header>

      <Buddy
        persona={persona}
        mood={mood}
        line={
          mood === 'think'
            ? 'عم فكّر معك... خذ وقتك 💭'
            : mood === 'laugh'
              ? 'برافو! عجبني شغلك 🎉'
              : mood === 'tired'
                ? 'ولا يهمك، منجرّب مرة تانية 💙'
                : mood === 'proud'
                  ? 'خلصنا درس! نجمة إلك ⭐'
                  : undefined
        }
      />

      <main>
        {activeLesson ? (
          <LessonSheet
            lesson={activeLesson}
            onBack={() =>
              setView(activeLesson.bookId !== '' ? { kind: 'book', id: activeLesson.bookId } : { kind: 'home' })
            }
            onFinish={finishLesson}
            onSignal={signal}
            onMood={setMood}
            apiKey={settings.geminiKey}
            voice={settings.voice || 'Sulafat'}
          />
        ) : activeBook ? (
          <BookView
            settings={settings}
            memory={memory}
            book={activeBook}
            lessons={lessons.filter((l) => l.bookId === activeBook.id)}
            onBack={() => setView({ kind: 'home' })}
            onSavePages={savePages}
            onAskSave={addFromBookQuestion}
            onOpenLesson={(id) => setView({ kind: 'lesson', id })}
            onMood={setMood}
            onSignal={signal}
          />
        ) : tab === 'ask' ? (
          <Home
            settings={settings}
            memory={memory}
            progress={progress}
            books={books}
            lessons={lessons}
            onDraft={addFromQuestion}
            onAddBook={addBook}
            onOpenBook={(id) => setView({ kind: 'book', id })}
            onOpenLesson={(id) => setView({ kind: 'lesson', id })}
            onMood={setMood}
            onSignal={signal}
            onSwitch={switchStudent}
          />
        ) : tab === 'library' ? (
          <Library
            lessons={lessons}
            books={books}
            onOpenLesson={(id) => setView({ kind: 'lesson', id })}
            onDeleteLesson={deleteLesson}
          />
        ) : parentOpen ? (
          <ParentView
            settings={settings}
            progress={progress}
            memory={memory}
            onSave={applySettings}
            onMemory={setMemory}
            onReset={() => {
              resetProgress()
              setParentOpen(false)
              goTab('ask')
            }}
          />
        ) : (
          <Lock
            pin={settings.parentPin}
            title="قسم الأهل"
            onUnlock={() => setParentOpen(true)}
            onCancel={() => goTab('ask')}
          />
        )}
      </main>

      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`nav-btn ${tab === t.id ? 'on' : ''}`} onClick={() => goTab(t.id)}>
            <span className="nav-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
