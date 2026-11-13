import { useEffect, useRef, useState } from 'react'
import { analyzePage, askMila } from '../lib/ai.ts'
import type { LessonDraft } from '../lib/ai.ts'
import { saveImage } from '../lib/archive.ts'
import { COMPS } from '../lib/companions.ts'
import { prepareImage } from '../lib/img.ts'
import { stickerSvg } from '../lib/rewards.ts'
import type { Lesson, Memory, SignalKind, Student } from '../lib/store.ts'
import { uid } from '../lib/store.ts'
import { AR, Companion, Icon, Sheet, Sticker } from './ui.tsx'

interface ShotState {
  id: string
  blob: Blob
  dataUrl: string
  url: string
}

interface Props {
  student: Student
  memory: Memory
  apiKey: string
  book: { id: string; title: string; subject: string; color: string }
  cover: { color?: string; sticker?: string }
  lessons: Lesson[]
  onBack: () => void
  onSavePages: (drafts: LessonDraft[], imageId: string) => void
  onAskSave: (draft: LessonDraft) => void
  onOpenLesson: (id: string) => void
  onSignal: (kind: SignalKind) => void
  onDelete: (id: string) => void
  onDecorate: () => void
}

/** جوّا الكتاب: غلاف بينفتح، فهرس بالدروس، تصوير صفحة، وسؤال عن الكتاب. */
export default function BookView(p: Props) {
  const { student, memory, apiKey, book, lessons } = p
  const comp = COMPS[student.comp]
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>('closed')
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [shot, setShot] = useState<ShotState | null>(null)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  const shotRef = useRef<ShotState | null>(null)

  useEffect(() => {
    shotRef.current = shot
  }, [shot])

  useEffect(() => {
    const a = window.setTimeout(() => setPhase('opening'), 250)
    const b = window.setTimeout(() => setPhase('open'), 1200)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [])

  useEffect(
    () => () => {
      if (shotRef.current) URL.revokeObjectURL(shotRef.current.url)
    },
    [],
  )

  const coverColor = p.cover.color ?? book.color
  const settings = { grade: student.grade, comp: student.comp, name: student.name }

  const ask = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (q.length < 3 || asking) return
    setAsking(true)
    setError('')
    setNotice('')
    const res = await askMila({ apiKey, settings, memory, question: q, bookTitle: book.title })
    setAsking(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    p.onSignal('asked')
    setQuestion('')
    p.onAskSave(res.data)
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
    const res = await analyzePage({ apiKey, settings, memory, imageDataUrl: shot.dataUrl, bookTitle: book.id === '' ? undefined : book.title })
    if (!res.ok) {
      setReading(false)
      setError(res.error)
      return
    }
    const stored = await saveImage(shot.id, shot.blob)
    p.onSavePages(res.data.lessons, stored ? shot.id : '')
    p.onSignal('photos')
    setReading(false)
    URL.revokeObjectURL(shot.url)
    setShot(null)
    const n = res.data.lessons.length
    setNotice(n === 1 ? 'لزقنا الدرس بالفهرس، والصفحة محفوظة معو.' : `لقينا ${AR(n)} دروس بالصفحة ولزقناهم كلهم بالفهرس.`)
  }

  const target = lessons.find((l) => l.id === confirm)

  return (
    <main className="screen">
      <div className="book-stage">
        <div className="book-head">
          <button type="button" className="icon-btn" onClick={p.onBack} aria-label="رجوع للمكتب">
            <Icon name="back" size={22} sw={2.6} />
          </button>
          <div className="display" style={{ fontSize: 24, flex: 1 }}>
            {book.title}
          </div>
          {book.id !== '' && (
            <button type="button" className="btn small" onClick={p.onDecorate}>
              <Icon name="brush" size={20} /> زيّن الغلاف
            </button>
          )}
        </div>

        <div className="book">
          {phase !== 'open' && (
            <div className={`cover ${phase === 'opening' ? 'open' : ''}`} style={{ background: coverColor }}>
              <div className="tape" style={{ top: 20, left: 26, transform: 'rotate(-12deg)' }} />
              <div className="cover-title">
                <div className="ct display">{book.title}</div>
                <div className="bold" style={{ fontSize: 16, textAlign: 'center' }}>
                  كتاب {student.name}
                </div>
              </div>
              <span className="svgwrap" dangerouslySetInnerHTML={{ __html: stickerSvg(p.cover.sticker ?? 'star', 90, 10) }} />
            </div>
          )}

          <div className="pages paper">
            <h2 className="display" style={{ margin: 0, fontSize: 28 }}>
              الفهرس
            </h2>
            {lessons.length === 0 ? (
              <p className="muted bold" style={{ margin: 0, lineHeight: 1.7 }}>
                لسا ما في دروس. صوّر أول صفحة أو اسأل {comp.name} عن شي بالكتاب.
              </p>
            ) : (
              <ol className="toc-list">
                {lessons.map((l, i) => (
                  <li key={l.id} className="toc-item">
                    <button type="button" className="toc-row" onClick={() => p.onOpenLesson(l.id)}>
                      <span className="slot">
                        {l.done ? <Sticker id="star" size={44} rot={-8} /> : <span className="slot-dash" aria-label="لسا ما انحل" />}
                      </span>
                      <span className="toc-title">{l.title}</span>
                      <span className="lead" />
                      <span className="pg">{AR(lessons.length - i)}</span>
                    </button>
                    <button type="button" className="icon-btn tiny" aria-label={`امسح ${l.title}`} onClick={() => setConfirm(l.id)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </li>
                ))}
              </ol>
            )}

            <div className="stack">
              <h3 className="display" style={{ margin: 0, fontSize: 20 }}>
                صوّر صفحة
              </h3>
              {shot ? (
                <>
                  <div className="taped-photo">
                    <div className="tape" style={{ top: -10, left: '30%', transform: 'rotate(-4deg)' }} />
                    <img src={shot.url} alt="الصفحة اللي صوّرتها" />
                  </div>
                  <div className="row">
                    <button type="button" className="btn yellow grow" onClick={() => void analyze()} disabled={reading}>
                      {reading ? 'عم نقرا الصفحة…' : 'حلّل الصفحة'}
                    </button>
                    <button type="button" className="btn" onClick={dropShot} disabled={reading}>
                      غيّر
                    </button>
                  </div>
                  {reading && (
                    <div className="say-row">
                      <Companion id={student.comp} acc={student.acc} size={56} mood="think" />
                      <div className="bubble grow">عم بقرا الصفحة وبرتّب الدروس… لحظة.</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="row">
                  <label className="photo-card grow">
                    <Icon name="cam" size={28} sw={2} />
                    <span>كاميرا</span>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => void pick(e)} hidden />
                  </label>
                  <label className="photo-card grow">
                    <Icon name="img" size={28} sw={2} />
                    <span>من المعرض</span>
                    <input type="file" accept="image/*" onChange={(e) => void pick(e)} hidden />
                  </label>
                </div>
              )}
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                من الكتاب أو الدفتر أو السبورة. بتصير دروس هون.
              </p>
            </div>

            <form className="stack" onSubmit={(e) => void ask(e)}>
              <h3 className="display" style={{ margin: 0, fontSize: 20 }}>
                اسأل عن شي بالكتاب
              </h3>
              <div className="row">
                <input
                  className="input grow"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="مثلاً: شو المطلوب بالتمرين ٣؟"
                  maxLength={220}
                  aria-label="سؤال عن الكتاب"
                />
                <button className="btn yellow" type="submit" disabled={asking || question.trim().length < 3}>
                  {asking ? '…' : 'اشرح'}
                </button>
              </div>
            </form>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {notice && <p className="ok">{notice}</p>}
          </div>
        </div>
      </div>

      {target && (
        <Sheet onClose={() => setConfirm(null)} label="مسح الدرس">
          <h2 className="display">نمسح «{target.title}»؟</h2>
          <p className="muted bold" style={{ margin: 0 }}>
            بيروح الدرس والصفحة المحفوظة معو.
          </p>
          <button
            type="button"
            className="btn accent"
            onClick={() => {
              p.onDelete(target.id)
              setConfirm(null)
            }}
          >
            امسح
          </button>
          <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>
            لا، خلّيه
          </button>
        </Sheet>
      )}
    </main>
  )
}
