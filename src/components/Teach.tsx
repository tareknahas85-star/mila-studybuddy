import { useState } from 'react'
import { evaluateTeaching } from '../lib/ai.ts'
import type { TeachResult } from '../lib/ai.ts'
import { COMPS } from '../lib/companions.ts'
import type { Lesson, Memory, Student } from '../lib/store.ts'
import { AR, Companion, Icon } from './ui.tsx'

/** علّم رفيقك: الرفيق بيتظاهر إنو ما فهم، والطالب بيشرحلو بكلامو. الشرح لغيرك أقوى طريقة تثبيت. */
export default function Teach({
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
  onScore: (lessonId: string, score: number) => void
  onBack: () => void
}) {
  const comp = COMPS[student.comp]
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<TeachResult | null>(null)

  const list = [...lessons].sort((a, b) => Number(b.done) - Number(a.done)).slice(0, 20)

  const send = async () => {
    if (!lesson || busy) return
    setBusy(true)
    setErr('')
    const r = await evaluateTeaching({
      apiKey,
      settings: { grade: student.grade, comp: student.comp, name: student.name },
      memory,
      lessonTitle: lesson.title,
      facts: [lesson.summary, ...lesson.steps].filter((x) => x !== '').join(' '),
      explanation: text.trim(),
    })
    setBusy(false)
    if (!r.ok) {
      setErr(r.error)
      return
    }
    setRes(r.data)
    onScore(lesson.id, r.data.score)
  }

  const head = (
    <div className="book-head pad">
      <button
        type="button"
        className="icon-btn"
        aria-label="رجوع"
        onClick={() => {
          if (lesson && !res) setLesson(null)
          else if (res) {
            setRes(null)
            setText('')
            setLesson(null)
          } else onBack()
        }}
      >
        <Icon name="back" size={22} sw={2.6} />
      </button>
      <div className="display" style={{ fontSize: 26 }}>
        علّم {comp.name}
      </div>
    </div>
  )

  if (apiKey.trim() === '') {
    return (
      <main className="screen paper">
        {head}
        <div className="say-row pad">
          <Companion id={student.comp} acc={student.acc} size={70} mood="think" />
          <div className="bubble grow">بدّي مفتاح جيميني من قسم الأهل لأفهم شرحك وأرد عليك.</div>
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
            <Companion id={student.comp} acc={student.acc} size={70} mood="think" />
            <div className="bubble grow">ما فهمت شي من دروسك! اختار درس وعلّمني ياه بكلامك.</div>
          </div>
          {list.length === 0 ? (
            <p className="muted bold">لسا ما في دروس. اسأل سؤال أو صوّر صفحة أول.</p>
          ) : (
            list.map((l) => (
              <button key={l.id} type="button" className="list-btn" onClick={() => setLesson(l)}>
                <Icon name="bulb" size={24} />
                <span className="grow">{l.title}</span>
                {l.done && <Icon name="check" size={20} sw={3} />}
              </button>
            ))
          )}
        </div>
      </main>
    )
  }

  if (res) {
    return (
      <main className="screen paper">
        {head}
        <div className="stack pad">
          <div className="say-row">
            <Companion id={student.comp} acc={student.acc} size={80} mood={res.score >= 2 ? 'cheer' : 'think'} cls={res.score >= 2 ? 'bounce' : 'idle'} />
            <div className="bubble grow">{res.praise}</div>
          </div>
          <div className="row" style={{ justifyContent: 'center' }} role="img" aria-label={`${AR(res.score)} من ٣`}>
            {[1, 2, 3].map((n) => (
              <Icon key={n} name="star" size={36} sw={1.8} fill={n <= res.score ? '#FFE36E' : 'none'} stroke="currentColor" />
            ))}
          </div>
          {res.gap !== '' && (
            <div className="hint">
              <Icon name="bulb" size={20} /> {res.gap}
            </div>
          )}
          {res.question !== '' && (
            <div className="why">
              <b>سؤالي إلك:</b> {res.question}
            </div>
          )}
          <button
            type="button"
            className="btn yellow"
            onClick={() => {
              setRes(null)
              setText('')
            }}
          >
            علّمني مرة تانية
          </button>
          <button type="button" className="btn ghost" onClick={onBack}>
            عالمكتب
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="screen paper">
      {head}
      <div className="stack pad">
        <div className="say-row">
          <Companion id={student.comp} acc={student.acc} size={70} mood={busy ? 'think' : 'wow'} />
          <div className="bubble grow">{busy ? 'عم بفكّر بشرحك…' : `ما فهمت «${lesson.title}». شرحلي ياه خطوة خطوة؟`}</div>
        </div>
        <textarea
          className="input area"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اشرحلي بكلامك…"
          maxLength={600}
          aria-label="شرحك"
        />
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
        <button type="button" className="btn yellow" disabled={busy || text.trim().length < 15} onClick={() => void send()}>
          {busy ? '…' : 'ابعت الشرح'}
        </button>
        {text.trim().length < 15 && <p className="muted" style={{ margin: 0, fontSize: 14 }}>اكتب جملتين على الأقل.</p>}
      </div>
    </main>
  )
}
