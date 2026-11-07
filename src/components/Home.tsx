import { useState } from 'react'
import { askMila, type LessonDraft } from '../lib/ai.ts'
import type { Book, Lesson, Memory, Mood, Progress, Settings, SignalKind } from '../lib/store.ts'
import { currentStreak } from '../lib/store.ts'
import { ASK_EXAMPLES, SUBJECTS, iconFor } from '../lib/subjects.ts'
import { prettyDate } from '../lib/img.ts'
import Shot from './Shot.tsx'

interface Props {
  settings: Settings
  memory: Memory
  progress: Progress
  books: Book[]
  lessons: Lesson[]
  onDraft: (draft: LessonDraft) => void
  onAddBook: (title: string, subject: string) => void
  onOpenBook: (id: string) => void
  onOpenLesson: (id: string) => void
  onMood: (m: Mood) => void
  onSignal: (kind: SignalKind) => void
}

/** الرئيسية: شريط بحث مربوط بجيميني فوق، وتحته «إضافة كتاب» وكتب الطفل. */
export default function Home({
  settings,
  memory,
  progress,
  books,
  lessons,
  onDraft,
  onAddBook,
  onOpenBook,
  onOpenLesson,
  onMood,
  onSignal,
}: Props) {
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [bookTitle, setBookTitle] = useState('')
  const [bookSubject, setBookSubject] = useState(SUBJECTS[0])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (q.length < 3 || busy) return
    setBusy(true)
    setError('')
    onMood('think')
    const res = await askMila({ apiKey: settings.geminiKey, settings, memory, question: q })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      onMood('tired')
      return
    }
    onSignal('asked')
    onMood('laugh')
    setQuestion('')
    onDraft(res.data)
  }

  const addBook = (e: React.FormEvent) => {
    e.preventDefault()
    const title = bookTitle.trim()
    if (title.length < 2) return
    onAddBook(title, bookSubject)
    setBookTitle('')
    setAdding(false)
  }

  const lessonCount = (bookId: string) => lessons.filter((l) => l.bookId === bookId).length
  const recent = lessons.slice(0, 3)

  return (
    <>
      <section className="card hero">
        <div className="hero-top">
          <h2 className="title">شو بدك تفهم اليوم؟</h2>
          <span className="pill">{currentStreak(progress) > 0 ? `🔥 ${currentStreak(progress)} أيام` : '✨ ابدأ اليوم'}</span>
        </div>

        <form className="search" onSubmit={submit}>
          <input
            className="input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="اكتب سؤالك… مثلاً: ليش السماء زرقا؟"
            maxLength={220}
            aria-label="سؤالك لميلا"
          />
          <button className="primary search-btn" type="submit" disabled={busy || question.trim().length < 3}>
            {busy ? '⏳' : 'اشرح ✨'}
          </button>
        </form>

        <div className="chips">
          {ASK_EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="chip tiny" onClick={() => setQuestion(ex)}>
              {ex}
            </button>
          ))}
        </div>

        {busy && <p className="note small">ميلا عم تفكّر وبتجهّز الشرح… خذ وقتك 💭</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="note small">🔒 سؤالك بينروح لجيميني بمفتاح ولي الأمر، والدرس بينحفظ على هالجهاز بس.</p>
      </section>

      <section className="card">
        <div className="row-head">
          <h2 className="title">كتبي 📚</h2>
          <button className="ghost slim" type="button" onClick={() => setAdding(!adding)}>
            {adding ? 'إلغاء' : '+ إضافة كتاب'}
          </button>
        </div>

        {adding ? (
          <form className="stack" onSubmit={addBook}>
            <label className="label" htmlFor="book-title">
              اسم الكتاب
            </label>
            <input
              id="book-title"
              className="input"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="مثلاً: رياضيات الصف الخامس"
              maxLength={60}
            />
            <span className="label">المادة</span>
            <div className="chips">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${bookSubject === s ? 'on' : ''}`}
                  onClick={() => setBookSubject(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <button className="primary" type="submit" disabled={bookTitle.trim().length < 2}>
              أضف الكتاب 📥
            </button>
            <p className="note small">بعد ما ينضاف، افتحه وصوّر أي صفحة — ميلا بترتّب الدروس وبتحفظها بالأرشيف.</p>
          </form>
        ) : books.length === 0 ? (
          <p className="note">ما في كتب لسا. ضيف كتابك الأول، وبعدها صوّر صفحاته وخلّي ميلا تشرحلك.</p>
        ) : (
          <div className="list">
            {books.map((b) => (
              <button key={b.id} className="row" type="button" onClick={() => onOpenBook(b.id)}>
                <span className="row-icon" aria-hidden="true">
                  {iconFor(b.subject)}
                </span>
                <span className="row-main">
                  <span className="row-title">{b.title}</span>
                  <span className="row-sub">
                    {b.subject} · {lessonCount(b.id) === 0 ? 'ما في دروس' : `${lessonCount(b.id)} درس`}
                  </span>
                </span>
                <span className="chev" aria-hidden="true">
                  ‹
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="card">
          <div className="row-head">
            <h2 className="title">آخر الدروس</h2>
            <span className="pill">🗂️ {lessons.length}</span>
          </div>
          <div className="list">
            {recent.map((l) => (
              <button key={l.id} className="row" type="button" onClick={() => onOpenLesson(l.id)}>
                {l.imageId ? (
                  <Shot id={l.imageId} className="row-thumb" />
                ) : (
                  <span className="row-icon" aria-hidden="true">
                    {iconFor(l.subject)}
                  </span>
                )}
                <span className="row-main">
                  <span className="row-title">{l.title}</span>
                  <span className="row-sub">
                    {prettyDate(l.createdAt)} · {l.done ? 'محفوظ ✓' : 'بدك تكمّله'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
