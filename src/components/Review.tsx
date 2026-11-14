import { useMemo, useState } from 'react'
import { COMPS } from '../lib/companions.ts'
import { dueItems } from '../lib/store.ts'
import type { Memory, Student } from '../lib/store.ts'
import { AR, Companion, Icon } from './ui.tsx'

/** مراجعة اليوم: الأسئلة اللي غلط فيها الطالب قبل، بترجع بعد يوم وتلاتة وسبعة وأربعتعش يوم. */
export default function Review({
  student,
  memory,
  onGrade,
  onFinish,
  onBack,
}: {
  student: Student
  memory: Memory
  onGrade: (id: string, ok: boolean) => void
  onFinish: (correct: number, total: number) => void
  onBack: () => void
}) {
  const comp = COMPS[student.comp]
  const queue = useMemo(() => dueItems(memory).slice(0, 8), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [right, setRight] = useState(0)
  const [done, setDone] = useState(false)

  const head = (
    <div className="book-head pad">
      <button type="button" className="icon-btn" onClick={onBack} aria-label="رجوع للمكتب">
        <Icon name="back" size={22} sw={2.6} />
      </button>
      <div className="display" style={{ fontSize: 26 }}>
        مراجعة اليوم
      </div>
    </div>
  )

  if (queue.length === 0) {
    const next = memory.review.reduce<number>((a, r) => (a === 0 || r.due < a ? r.due : a), 0)
    const days = next > 0 ? Math.max(1, Math.ceil((next - Date.now()) / 86400000)) : 0
    return (
      <main className="screen paper">
        {head}
        <div className="say-row pad">
          <Companion id={student.comp} acc={student.acc} size={70} mood="cheer" />
          <div className="bubble grow">
            {memory.review.length === 0
              ? 'ما في أسئلة للمراجعة. لما تغلط بسؤال بدرس، برجّعلك ياه بعد يوم لنتأكد إنو انحفظ.'
              : `خلّصت مراجعة اليوم! السؤال الجاي بعد ${AR(days)} ${days === 1 ? 'يوم' : 'أيام'}.`}
          </div>
        </div>
      </main>
    )
  }

  if (done) {
    return (
      <main className="screen paper">
        {head}
        <div className="done-wrap">
          <Companion id={student.comp} acc={student.acc} size={120} mood="cheer" cls="bounce" />
          <h2 className="display">خلّصنا المراجعة!</h2>
          <p className="muted bold" style={{ fontSize: 18, margin: 0 }}>
            {AR(right)} من {AR(queue.length)} صح. {right === queue.length ? comp.lines.win : 'الأسئلة الغلط بترجع بكرا، وهيك بتثبت.'}
          </p>
          <button type="button" className="btn yellow" style={{ minWidth: 240 }} onClick={onBack}>
            عالمكتب
          </button>
        </div>
      </main>
    )
  }

  const item = queue[idx]
  const answer = (i: number) => {
    if (chosen !== null) return
    setChosen(i)
    const ok = i === item.answer
    if (ok) setRight((r) => r + 1)
    onGrade(item.id, ok)
  }
  const next = () => {
    if (idx + 1 < queue.length) {
      setIdx(idx + 1)
      setChosen(null)
      return
    }
    setDone(true)
    onFinish(right, queue.length)
  }

  return (
    <main className="screen paper">
      {head}
      <div className="stack pad">
        <span className="label-tag" style={{ alignSelf: 'flex-start' }}>
          سؤال {AR(idx + 1)} من {AR(queue.length)}
        </span>
        <div className="say-row">
          <Companion id={student.comp} acc={student.acc} size={64} mood={chosen === null ? 'happy' : chosen === item.answer ? 'cheer' : 'think'} />
          <div className="bubble grow">{item.q}</div>
        </div>
        <div className="opts">
          {item.options.map((o, i) => (
            <button
              key={o}
              type="button"
              className={`opt ${chosen !== null && i === item.answer ? 'right' : ''} ${chosen === i && i !== item.answer ? 'wrong' : ''}`}
              disabled={chosen !== null}
              onClick={() => answer(i)}
            >
              <span>{o}</span>
              {chosen !== null && i === item.answer && <Icon name="check" size={24} sw={3} />}
            </button>
          ))}
        </div>
        {chosen !== null && (
          <>
            <div className={chosen === item.answer ? 'why' : 'hint'}>
              <b>{chosen === item.answer ? comp.lines.win : 'ولا يهمك، بترجع بكرا.'}</b> {item.why}
            </div>
            <button type="button" className="btn yellow" onClick={next}>
              {idx + 1 < queue.length ? 'السؤال الجاي' : 'خلّصنا'} <Icon name="fwd" size={20} sw={2.8} />
            </button>
          </>
        )}
      </div>
    </main>
  )
}
