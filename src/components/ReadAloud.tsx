import { useEffect, useRef, useState } from 'react'
import { evaluateReading } from '../lib/ai.ts'
import type { ReadResult } from '../lib/ai.ts'
import { blobToWavBase64, startRecording } from '../lib/audio.ts'
import type { Recording } from '../lib/audio.ts'
import type { Lesson, Memory, Student } from '../lib/store.ts'
import { AR, Companion, Icon } from './ui.tsx'

const MAX_SEC = 45

/** اقرا بصوتك: الطالب بيقرا فقرة من درسو، والرفيق بيسمع وبيصحّح النطق بلطف. التسجيل ما بينحفظ. */
export default function ReadAloud({
  student,
  memory,
  lessons,
  apiKey,
  onScore,
  onBack,
}: {
  student: Student
  memory: Memory
  lessons: Lesson[]
  apiKey: string
  onScore: (key: string, score: number) => void
  onBack: () => void
}) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [passage, setPassage] = useState('')
  const [phase, setPhase] = useState<'idle' | 'rec' | 'wait' | 'done'>('idle')
  const [sec, setSec] = useState(0)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<ReadResult | null>(null)
  const recRef = useRef<Recording | null>(null)
  const timer = useRef<number | null>(null)
  const secRef = useRef(0)

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearInterval(timer.current)
      timer.current = null
    }
  }
  useEffect(
    () => () => {
      clearTimer()
      recRef.current?.cancel()
    },
    [],
  )

  const list = [...lessons].sort((a, b) => Number(b.done) - Number(a.done)).slice(0, 20)
  const passages = lesson ? [lesson.summary, ...lesson.steps].filter((t) => t !== '' && t.length <= 220).slice(0, 6) : []

  const finish = async () => {
    clearTimer()
    const rec = recRef.current
    recRef.current = null
    if (!rec) return
    setPhase('wait')
    try {
      const blob = await rec.stop()
      const wav = await blobToWavBase64(blob)
      const r = await evaluateReading({
        apiKey,
        settings: { grade: student.grade, comp: student.comp, name: student.name },
        memory,
        text: passage,
        audioBase64: wav,
        mime: 'audio/wav',
      })
      if (!r.ok) {
        setErr(r.error)
        setPhase('idle')
        return
      }
      setRes(r.data)
      setPhase('done')
      onScore(`${lesson?.id ?? ''}|${passage.slice(0, 40)}`, r.data.score)
    } catch {
      setErr('ما قدرنا نعالج التسجيل. جرّب مرة تانية.')
      setPhase('idle')
    }
  }

  const start = async () => {
    setErr('')
    setRes(null)
    const r = await startRecording()
    if (!r.ok) {
      setErr(r.error)
      return
    }
    recRef.current = r.rec
    secRef.current = 0
    setSec(0)
    setPhase('rec')
    timer.current = window.setInterval(() => {
      secRef.current += 1
      setSec(secRef.current)
      if (secRef.current >= MAX_SEC) void finish()
    }, 1000)
  }

  const head = (
    <div className="book-head pad">
      <button
        type="button"
        className="icon-btn"
        aria-label="رجوع"
        onClick={() => {
          if (phase === 'rec' || phase === 'wait') return
          if (passage !== '') {
            setPassage('')
            setRes(null)
            setPhase('idle')
          } else if (lesson) setLesson(null)
          else onBack()
        }}
      >
        <Icon name="back" size={22} sw={2.6} />
      </button>
      <div className="display" style={{ fontSize: 26 }}>
        اقرا بصوتك
      </div>
    </div>
  )

  if (apiKey.trim() === '') {
    return (
      <main className="screen paper">
        {head}
        <div className="say-row pad">
          <Companion id={student.comp} acc={student.acc} size={70} mood="think" />
          <div className="bubble grow">بدّي مفتاح جيميني من قسم الأهل لأسمعك.</div>
        </div>
      </main>
    )
  }

  if (!lesson) {
    return (
      <main className="screen paper">
        {head}
        <div className="stack pad">
          <div className="say-row">
            <Companion id={student.comp} acc={student.acc} size={70} mood="happy" />
            <div className="bubble grow">اختار درس، وأقرا منو فقرة بصوت عالي وأنا بسمعك.</div>
          </div>
          {list.length === 0 ? (
            <p className="muted bold">لسا ما في دروس.</p>
          ) : (
            list.map((l) => (
              <button key={l.id} type="button" className="list-btn" onClick={() => setLesson(l)}>
                <Icon name="book" size={24} />
                <span className="grow">{l.title}</span>
              </button>
            ))
          )}
        </div>
      </main>
    )
  }

  if (passage === '') {
    return (
      <main className="screen paper">
        {head}
        <div className="stack pad">
          <div className="bubble">اختار الفقرة اللي بدك تقراها:</div>
          {passages.length === 0 ? (
            <p className="muted bold">فقرات هالدرس طويلة. جرّب درس تاني.</p>
          ) : (
            passages.map((t) => (
              <button key={t} type="button" className="list-btn" onClick={() => setPassage(t)}>
                <span className="grow">{t}</span>
              </button>
            ))
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="screen paper">
      {head}
      <div className="stack pad">
        <div className="read-text" lang="ar">
          {passage}
        </div>
        {phase === 'idle' && !res && (
          <button type="button" className="btn accent" onClick={() => void start()}>
            <Icon name="mic" size={24} sw={2.4} /> اضغط واقرا
          </button>
        )}
        {phase === 'rec' && (
          <>
            <div className="rec-live" role="status">
              <span className="pulse" aria-hidden="true" /> عم نسمعك… {AR(sec)}
            </div>
            <button type="button" className="btn yellow" onClick={() => void finish()}>
              <Icon name="stop" size={22} /> خلّصت
            </button>
          </>
        )}
        {phase === 'wait' && (
          <div className="say-row">
            <Companion id={student.comp} acc={student.acc} size={64} mood="think" />
            <div className="bubble grow">عم سمّع التسجيل… لحظة.</div>
          </div>
        )}
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
        {phase === 'done' && res && (
          <>
            <div className="say-row">
              <Companion id={student.comp} acc={student.acc} size={80} mood={res.score >= 2 ? 'cheer' : 'happy'} cls={res.score >= 2 ? 'bounce' : 'idle'} />
              <div className="bubble grow">{res.praise}</div>
            </div>
            <div className="row" style={{ justifyContent: 'center' }} role="img" aria-label={`${AR(res.score)} من ٣`}>
              {[1, 2, 3].map((n) => (
                <Icon key={n} name="star" size={36} sw={1.8} fill={n <= res.score ? '#FFE36E' : 'none'} stroke="currentColor" />
              ))}
            </div>
            {res.fixes.map((f) => (
              <div className="hint" key={f.word}>
                <b>{f.word}</b> {f.tip}
              </div>
            ))}
            <button
              type="button"
              className="btn yellow"
              onClick={() => {
                setRes(null)
                setPhase('idle')
              }}
            >
              اقرا مرة تانية
            </button>
            <button type="button" className="btn ghost" onClick={onBack}>
              عالمكتب
            </button>
          </>
        )}
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>التسجيل بينبعت للتحليل بس وما بينحفظ.</p>
      </div>
    </main>
  )
}
