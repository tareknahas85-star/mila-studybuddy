import { useEffect, useRef, useState } from 'react'
import { analyzePage, askMila, type LessonDraft } from '../lib/ai.ts'
import type { Book, Lesson, Memory, Mood, Settings, SignalKind } from '../lib/store.ts'
import { uid } from '../lib/store.ts'
import { prepareImage, prettyDate } from '../lib/img.ts'
import { saveImage } from '../lib/archive.ts'
import { iconFor } from '../lib/subjects.ts'
import Shot from './Shot.tsx'

interface Props {
  settings: Settings
  memory: Memory
  book: Book
  lessons: Lesson[]
  onBack: () => void
  onSavePages: (drafts: LessonDraft[], imageId: string) => void
  onAskSave: (draft: LessonDraft) => void
  onOpenLesson: (id: string) => void
  onMood: (m: Mood) => void
  onSignal: (kind: SignalKind) => void
}

interface ShotState {
  id: string
  blob: Blob
  dataUrl: string
  url: string
}

/** جوّا الكتاب: بحث مربوط بجيميني + تصوير صفحة من الكاميرا أو المعرض وترتيب دروسها. */
export default function BookView({
  settings,
  memory,
  book,
  lessons,
  onBack,
  onSavePages,
  onAskSave,
  onOpenLesson,
  onMood,
  onSignal,
}: Props) {
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [shot, setShot] = useState<ShotState | null>(null)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const shotRef = useRef<ShotState | null>(null)

  useEffect(() => {
    shotRef.current = shot
  }, [shot])

  // تنظيف روابط المعاينة لما نطلع من الشاشة.
  useEffect(
    () => () => {
      if (shotRef.current) URL.revokeObjectURL(shotRef.current.url)
    },
    [],
  )

  const ask = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (q.length < 3 || asking) return
    setAsking(true)
    setError('')
    setNotice('')
    onMood('think')
    const res = await askMila({ apiKey: settings.geminiKey, settings, memory, question: q, bookTitle: book.title })
    setAsking(false)
    if (!res.ok) {
      setError(res.error)
      onMood('tired')
      return
    }
    onSignal('asked')
    onMood('laugh')
    setQuestion('')
    onAskSave(res.data)
  }

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setNotice('')
    const prep = await prepareImage(file)
    if (!prep) {
      setError('ما قدرنا نفتح الصورة. جرّب صورة تانية من المعرض.')
      return
    }
    if (shotRef.current) URL.revokeObjectURL(shotRef.current.url)
    setShot({ id: uid(), blob: prep.blob, dataUrl: prep.dataUrl, url: URL.createObjectURL(prep.blob) })
  }

  const dropShot = () => {
    if (shot) URL.revokeObjectURL(shot.url)
    setShot(null)
  }

  const analyze = async () => {
    if (!shot || reading) return
    setReading(true)
    setError('')
    setNotice('')
    onMood('think')
    const res = await analyzePage({
      apiKey: settings.geminiKey,
      settings,
      memory,
      imageDataUrl: shot.dataUrl,
      bookTitle: book.title,
    })
    if (!res.ok) {
      setReading(false)
      setError(res.error)
      onMood('tired')
      return
    }
    const stored = await saveImage(shot.id, shot.blob)
    const imageId = stored ? shot.id : ''
    onSavePages(res.data.lessons, imageId)
    onSignal('photos')
    setReading(false)
    onMood('laugh')
    URL.revokeObjectURL(shot.url)
    setShot(null)
    const n = res.data.lessons.length
    setNotice(
      n === 1
        ? 'حفظنا درس واحد بالأرشيف، والصورة محفوظة معه 🗂️'
        : `لقينا ${n} دروس بالصفحة وحفظناهم كلهم مع الصورة 🗂️`,
    )
  }

  return (
    <>
      <div className="lesson-head">
        <button className="back" type="button" onClick={onBack} aria-label="رجوع">
          ‹
        </button>
        <div className="lesson-title">
          <h2 className="title">{book.title}</h2>
          <span className="row-sub">
            {iconFor(book.subject)} {book.subject} · {lessons.length === 0 ? 'ما في دروس' : `${lessons.length} درس`}
          </span>
        </div>
      </div>

      <section className="card">
        <h3 className="small-title">اسأل عن شي بهالكتاب 🔎</h3>
        <form className="search" onSubmit={ask}>
          <input
            className="input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="مثلاً: شو المطلوب بالتمرين ٣؟"
            maxLength={220}
            aria-label="سؤال عن الكتاب"
          />
          <button className="primary search-btn" type="submit" disabled={asking || question.trim().length < 3}>
            {asking ? '⏳' : 'اشرح'}
          </button>
        </form>
        {asking && <p className="note small">عم ندوّر بالكتاب ونجهّز الشرح… 💭</p>}
      </section>

      <section className="card">
        <h3 className="small-title">صوّر صفحة 📸</h3>
        <p className="note small">من الكتاب، أو دفترك، أو السبورة — منقرا كل شي ومنرتّب الدروس.</p>

        {shot ? (
          <>
            <img className="preview" src={shot.url} alt="الصفحة اللي صوّرتها" />
            <div className="shot-actions">
              <button className="primary" type="button" onClick={analyze} disabled={reading}>
                {reading ? 'عم نقرا الصفحة… ⏳' : 'حلّل الصفحة ✨'}
              </button>
              <button className="ghost" type="button" onClick={dropShot} disabled={reading}>
                غيّر الصورة
              </button>
            </div>
          </>
        ) : (
          <div className="shot-zone">
            <label className="shot-btn">
              <input type="file" accept="image/*" capture="environment" onChange={pick} hidden />
              <span aria-hidden="true">📷</span> صوّر بالكاميرا
            </label>
            <label className="shot-btn">
              <input type="file" accept="image/*" onChange={pick} hidden />
              <span aria-hidden="true">🖼️</span> من المعرض
            </label>
          </div>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="ok">{notice}</p>}
      </section>

      <section className="card">
        <div className="row-head">
          <h3 className="small-title">دروس الكتاب</h3>
          {lessons.length > 0 && <span className="pill">🗂️ {lessons.length}</span>}
        </div>
        {lessons.length === 0 ? (
          <p className="note">بعد ما تحلّل أول صفحة، دروسها بتنزل هون وبتضل محفوظة على الجهاز.</p>
        ) : (
          <div className="list">
            {lessons.map((l) => (
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
                    {prettyDate(l.createdAt)} · {l.done ? `محلول ${l.right}/${l.total} ✓` : 'بدك تحلّه'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
