import { useEffect, useMemo, useRef, useState } from 'react'
import { reexplain } from '../lib/ai.ts'
import { COMPS } from '../lib/companions.ts'
import type { CompMood } from '../lib/companions.ts'
import type { Lesson, Memory, ReviewSeed, SignalKind, Student } from '../lib/store.ts'
import LessonChat from './LessonChat.tsx'
import Shot from './Shot.tsx'
import SpeakButton from './SpeakButton.tsx'
import { AR, Companion, Icon, Sticker } from './ui.tsx'

type Page = { t: 'intro' } | { t: 'step'; i: number } | { t: 'mcq'; i: number } | { t: 'spot' }

export interface FinishInfo {
  sticker: string | null
  stars: number
  tired: boolean
  fresh: boolean
  /** حقق هدف الأسبوع بهالدرس: ستيكر إنجاز. */
  goal?: { sticker: string | null }
  /** ليش ما انعطت نجوم (سؤال حر، سريع، صفحة مكررة، أو سقف اليوم). */
  noStars?: string
}

interface Props {
  student: Student
  memory: Memory
  lesson: Lesson
  apiKey: string
  onBack: () => void
  onAnswer: (skill: string, ok: boolean, tag: string, seed?: ReviewSeed) => void
  onSignal: (k: SignalKind) => void
  onTime: (sec: number) => void
  onFinish: (lessonId: string, right: number, total: number, secs: number) => FinishInfo
  onAlbum: () => void
}

/** الدرس كقصة قصيرة: صفحة بصفحة، سؤال بسؤال، والغلط مو عقوبة. */
export default function LessonPlayer(p: Props) {
  const { student, memory, lesson, apiKey } = p
  const comp = COMPS[student.comp]
  const pages = useMemo<Page[]>(() => {
    const out: Page[] = [{ t: 'intro' }]
    lesson.steps.forEach((_, i) => out.push({ t: 'step', i }))
    lesson.quiz.forEach((_, i) => out.push({ t: 'mcq', i }))
    if (lesson.spot) out.push({ t: 'spot' })
    return out
  }, [lesson])

  const [idx, setIdx] = useState(0)
  const [alt, setAlt] = useState<Record<number, string>>({})
  const [altBusy, setAltBusy] = useState(false)
  const [altErr, setAltErr] = useState('')
  const [tried, setTried] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const [shake, setShake] = useState<number | null>(null)
  const [right, setRight] = useState(0)
  const [flip, setFlip] = useState(false)
  const [showPage, setShowPage] = useState(false)
  const [chat, setChat] = useState(false)
  const [result, setResult] = useState<FinishInfo | null>(null)
  const last = useRef(Date.now())
  const activeRef = useRef(0)
  const timeRef = useRef(p.onTime)
  timeRef.current = p.onTime

  const flush = () => {
    const sec = Math.min(120, Math.round((Date.now() - last.current) / 1000))
    last.current = Date.now()
    activeRef.current += sec
    if (sec > 0) timeRef.current(sec)
  }
  const flushRef = useRef(flush)
  flushRef.current = flush

  useEffect(() => {
    p.onSignal('text')
    return () => flushRef.current()
    // مرة وحدة عند فتح الدرس وعند إغلاقو.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goNext = () => {
    flush()
    setTried([])
    setSolved(false)
    setShake(null)
    setAltErr('')
    setFlip(true)
    if (idx + 1 < pages.length) {
      setIdx(idx + 1)
      return
    }
    setResult(p.onFinish(lesson.id, right, lesson.quiz.length, activeRef.current))
  }

  const retryLine = (n: number): string => {
    const hint = lesson.hints.length > 0 ? lesson.hints[Math.min(n - 1, lesson.hints.length - 1)] : ''
    return `${comp.lines.retry} ${hint}`.trim()
  }

  const explainAgain = async (i: number) => {
    setAltErr('')
    if (alt[i]) {
      setAlt((a) => {
        const { [i]: dropped, ...rest } = a
        void dropped
        return rest
      })
      return
    }
    if (apiKey.trim() === '') {
      setAltErr('بدّي مفتاح جيميني من قسم الأهل لأشرح بطريقة تانية.')
      return
    }
    setAltBusy(true)
    const res = await reexplain({
      apiKey,
      settings: { grade: student.grade, comp: student.comp, name: student.name },
      memory,
      lessonTitle: lesson.title,
      step: lesson.steps[i],
    })
    setAltBusy(false)
    if (!res.ok) {
      setAltErr(res.error)
      return
    }
    setAlt((a) => ({ ...a, [i]: res.data }))
  }

  const answerMcq = (i: number, item: Lesson['quiz'][number]) => {
    const correct = item.answer
    const errs = item.errs
    if (i === correct) {
      if (tried.length === 0) setRight((r) => r + 1)
      p.onAnswer(lesson.title, tried.length === 0, '')
      setSolved(true)
      setShake(null)
    } else {
      p.onAnswer(lesson.title, false, errs?.[i] ?? '', { lessonId: lesson.id, q: item.q, options: item.options, answer: item.answer, why: item.why })
      setTried([...tried, i])
      setShake(i)
      p.onSignal('hints')
    }
  }

  const answerSpot = (i: number, bad: number) => {
    if (i === bad) {
      p.onAnswer(lesson.title, tried.length === 0, '')
      setSolved(true)
      setShake(null)
    } else {
      p.onAnswer(lesson.title, false, 'ما راجع الخطوات منيح')
      setTried([...tried, i])
      setShake(i)
    }
  }

  if (result) {
    return (
      <main className="screen paper">
        <div className="done-wrap">
          <Companion id={student.comp} acc={student.acc} size={120} mood="cheer" cls="bounce" />
          <h2 className="display">{result.fresh ? (result.sticker ? 'ستيكر جديد لدفترك!' : 'برافو، خلّصت الدرس!') : 'راجعت الدرس، برافو!'}</h2>
          {result.fresh && result.sticker && (
            <div className="reward">
              <Sticker id={result.sticker} size={130} rot={-10} />
            </div>
          )}
          {result.stars > 0 && result.sticker === null && <p className="muted bold">جمعت كل الستيكرات، يا بطل!</p>}
          {result.goal && (
            <div className="why" style={{ maxWidth: 320 }}>
              <b>حققت هدف الأسبوع!</b> ربحت ستيكر إنجاز
              {result.goal.sticker && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                  <Sticker id={result.goal.sticker} size={80} rot={6} />
                </div>
              )}
            </div>
          )}
          {result.stars > 0 && (
            <div className="muted bold" style={{ fontSize: 18 }}>
              +{AR(result.stars)} {result.stars === 1 ? 'نجمة' : 'نجمات'} ({AR(right)} من {AR(lesson.quiz.length)} صح من أول مرة)
            </div>
          )}
          {result.fresh && result.stars === 0 && result.noStars && (
            <div className="hint" style={{ maxWidth: 320 }}>
              {result.noStars}
            </div>
          )}
          {result.tired && (
            <div className="note" style={{ maxWidth: 320 }}>
              <div className="tape" style={{ top: -10, left: '40%' }} />
              {comp.lines.rest}
            </div>
          )}
          <button type="button" className="btn yellow" style={{ minWidth: 240 }} onClick={result.fresh && result.sticker ? p.onAlbum : p.onBack}>
            {result.fresh && result.sticker ? 'لزّقو بالألبوم' : 'رجوع'}
          </button>
          {result.fresh && result.sticker && (
            <button type="button" className="btn ghost" onClick={p.onBack}>
              رجوع للكتاب
            </button>
          )}
        </div>
      </main>
    )
  }

  const page = pages[idx]
  const spoken = [lesson.summary, ...lesson.steps].filter((x) => x !== '').join('. ')
  const mood: CompMood = solved ? 'cheer' : tried.length > 0 ? 'think' : 'happy'
  const nextLabel = idx + 1 < pages.length ? 'الصفحة الجاية' : 'خلّصنا'
  const ytHref = `https://www.youtube.com/results?search_query=${encodeURIComponent(lesson.videoQuery || `${lesson.subject} ${lesson.title}`)}`

  const chatBtn =
    apiKey.trim() !== '' ? (
      <button type="button" className="btn small" onClick={() => setChat(true)}>
        <Icon name="smile" size={20} /> ناقش {comp.name} بالدرس
      </button>
    ) : null

  let body: React.ReactNode = null
  if (page.t === 'intro') {
    body = (
      <>
        <div className="intro">
          <Companion id={student.comp} acc={student.acc} size={150} cls="bounce" mood="happy" />
          <div className="bubble" style={{ width: '100%' }}>
            {lesson.summary || lesson.title}
          </div>
        </div>
        <SpeakButton key="intro" text={spoken} apiKey={apiKey} voice={student.voice} name={comp.name} onPlay={() => p.onSignal('voice')} />
        {chatBtn}
        {lesson.imageId !== '' && (
          <div className="stack" style={{ gap: 8 }}>
            <button type="button" className="btn small" onClick={() => setShowPage(!showPage)}>
              <Icon name="img" size={20} /> {showPage ? 'خبّي الصفحة' : 'شوف الصفحة'}
            </button>
            {showPage && (
              <div className="taped-photo">
                <div className="tape" style={{ top: -10, left: '30%', transform: 'rotate(-4deg)' }} />
                <Shot id={lesson.imageId} className="" alt={`صفحة ${lesson.title}`} />
              </div>
            )}
          </div>
        )}
        <div className="page-foot">
          <a className="btn" href={ytHref} target="_blank" rel="noreferrer noopener" onClick={() => p.onSignal('video')}>
            <Icon name="play" size={20} /> فيديو
          </a>
          <button type="button" className="btn yellow" onClick={goNext}>
            يلا <Icon name="fwd" size={20} sw={2.8} />
          </button>
        </div>
      </>
    )
  } else if (page.t === 'step') {
    const text = alt[page.i] ?? lesson.steps[page.i]
    body = (
      <>
        <div className="say-row">
          <Companion id={student.comp} acc={student.acc} size={70} mood={altBusy ? 'think' : 'happy'} />
          <div className="bubble grow">{altBusy ? 'لحظة، عم فكّر بطريقة تانية…' : text}</div>
        </div>
        <SpeakButton
          key={`s${page.i}${alt[page.i] ? 'a' : ''}`}
          text={text}
          apiKey={apiKey}
          voice={student.voice}
          name={comp.name}
          onPlay={() => p.onSignal('voice')}
        />
        {chatBtn}
        {altErr && (
          <p className="error" role="alert">
            {altErr}
          </p>
        )}
        <div className="page-foot">
          <button type="button" className="btn" onClick={() => void explainAgain(page.i)} disabled={altBusy}>
            {alt[page.i] ? 'الشرح الأصلي' : 'ما فهمت، اشرح غير شكل'}
          </button>
          <button type="button" className="btn yellow" onClick={goNext}>
            فهمت <Icon name="check" size={20} sw={2.8} />
          </button>
        </div>
      </>
    )
  } else if (page.t === 'mcq') {
    const item = lesson.quiz[page.i]
    body = (
      <>
        <div className="say-row">
          <Companion id={student.comp} acc={student.acc} size={64} mood={mood} />
          <div className="bubble grow">{item.q}</div>
        </div>
        <div className="opts">
          {item.options.map((o, i) => {
            const wrong = tried.includes(i)
            const ok = solved && i === item.answer
            return (
              <button
                key={o}
                type="button"
                className={`opt ${wrong ? 'wrong' : ''} ${ok ? 'right' : ''} ${shake === i ? 'shake' : ''}`}
                disabled={wrong || solved}
                onClick={() => answerMcq(i, item)}
              >
                <span>{o}</span>
                {ok && <Icon name="check" size={24} sw={3} />}
              </button>
            )
          })}
        </div>
        {!solved && tried.length > 0 && (
          <div className="hint">
            <Icon name="bulb" size={20} /> {retryLine(tried.length)}
          </div>
        )}
        {solved && (
          <>
            <div className="why">
              <b>{comp.lines.win}</b> {item.why}
            </div>
            <div className="page-foot">
              <button type="button" className="btn yellow" onClick={goNext}>
                {nextLabel} <Icon name="fwd" size={20} sw={2.8} />
              </button>
            </div>
          </>
        )}
      </>
    )
  } else if (lesson.spot) {
    const sp = lesson.spot
    body = (
      <>
        <div className="say-row">
          <Companion id={student.comp} acc={student.acc} size={64} mood={solved ? 'wow' : 'think'} />
          <div className="bubble grow">{sp.q}</div>
        </div>
        <div className="spot-lines">
          {sp.lines.map((l, i) => (
            <button
              key={l}
              type="button"
              className={`spot-line ${solved && i === sp.bad ? 'right' : ''} ${tried.includes(i) ? 'wrong' : ''} ${shake === i ? 'shake' : ''}`}
              disabled={solved || tried.includes(i)}
              onClick={() => answerSpot(i, sp.bad)}
            >
              <span className="n">{AR(i + 1)}</span>
              <span>{l}</span>
            </button>
          ))}
        </div>
        {!solved && tried.length > 0 && (
          <div className="hint">
            <Icon name="bulb" size={20} /> هاي الخطوة صح. {retryLine(tried.length)}
          </div>
        )}
        {solved && (
          <>
            <div className="why">
              <b>{comp.lines.win}</b> {sp.why}
            </div>
            <div className="page-foot">
              <button type="button" className="btn yellow" onClick={goNext}>
                {nextLabel} <Icon name="fwd" size={20} sw={2.8} />
              </button>
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <main className="screen">
      <div className="lesson-top">
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            flush()
            p.onBack()
          }}
          aria-label="سكّر الدرس"
        >
          <Icon name="back" size={22} sw={2.6} />
        </button>
        <div className="display lesson-name">{lesson.title}</div>
        <div className="tabs" role="img" aria-label={`صفحة ${AR(idx + 1)} من ${AR(pages.length)}`}>
          {pages.map((_, i) => (
            <span key={i} className={`tab ${i < idx ? 'done' : i === idx ? 'now' : ''}`} />
          ))}
        </div>
      </div>
      <div className={`page paper ${flip ? 'flip' : ''}`} key={idx}>
        {body}
      </div>
      {chat && (
        <LessonChat student={student} memory={memory} lesson={lesson} apiKey={apiKey} onClose={() => setChat(false)} onVoiceUse={() => p.onSignal('voice')} />
      )}
    </main>
  )
}
