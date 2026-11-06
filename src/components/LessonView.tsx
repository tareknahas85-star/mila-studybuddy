import { useState } from 'react'
import { LESSONS, type Lesson } from '../lib/lessons.ts'

interface Props {
  childName: string
  streak: number
  lessonsDone: number
  onFinish: (stars: number) => void
}

const SUBJECT_ICON: Record<string, string> = {
  'رياضيات': '🔢',
  'لغة عربية': '📖',
  'علوم': '🔬',
}

/** درس سقراطي: تلميحات تتصاعد، والجواب بيظهر بس بعد ما يجرّب الطفل. */
export default function LessonView({ childName, streak, lessonsDone, onFinish }: Props) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [shown, setShown] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const start = (l: Lesson) => {
    setLesson(l)
    setStepIndex(0)
    setShown(1)
    setRevealed(false)
  }

  if (!lesson) {
    return (
      <div className="card">
        <h2 className="title">شو بندرس اليوم يا {childName}؟ 📚</h2>
        <div className="pills">
          <span className="pill">{streak > 0 ? `🔥 ${streak} أيام متتالية` : '🔥 ابدأ سلسلتك اليوم'}</span>
          <span className="pill">🏅 {lessonsDone} دروس منجزة</span>
        </div>
        <div className="list">
          {LESSONS.map((l) => (
            <button key={l.id} className="row" onClick={() => start(l)}>
              <span className="row-icon" aria-hidden="true">
                {SUBJECT_ICON[l.subject] ?? '📚'}
              </span>
              <span className="row-main">
                <span className="row-title">{l.title}</span>
                <span className="row-sub">{l.steps.length === 1 ? 'سؤال واحد' : `${l.steps.length} أسئلة`}</span>
              </span>
              <span className="badge">{l.subject}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const step = lesson.steps[stepIndex]
  const last = stepIndex === lesson.steps.length - 1

  const next = () => {
    if (!last) {
      setStepIndex(stepIndex + 1)
      setRevealed(false)
      setShown(1)
      return
    }
    onFinish(lesson.steps.length)
    setLesson(null)
  }

  return (
    <div className="card">
      <div className="row-head">
        <h2 className="title">{lesson.title}</h2>
        <span className="badge">{lesson.subject}</span>
      </div>
      <p className="row-sub">
        السؤال {stepIndex + 1} من {lesson.steps.length}
      </p>

      <p className="question">{step.question}</p>

      <div className="hints">
        {step.hints.slice(0, shown).map((h, i) => (
          <p className="hint" key={i}>
            <span className="hint-num">{i + 1}</span>
            {h}
          </p>
        ))}
      </div>

      {!revealed ? (
        <div className="actions">
          {shown < step.hints.length && (
            <button className="primary" type="button" onClick={() => setShown(shown + 1)}>
              تلميح كمان 💡
            </button>
          )}
          <button className="ghost" type="button" onClick={() => setRevealed(true)}>
            جرّبت — ورّيني الحل
          </button>
        </div>
      ) : (
        <div className="answer">
          <p>
            <strong>الحل:</strong> {step.answer}
          </p>
          <button className="primary" type="button" onClick={next}>
            {last ? 'خلصنا الدرس ⭐' : 'السؤال اللي بعده ➡️'}
          </button>
        </div>
      )}

      <button className="ghost" type="button" onClick={() => setLesson(null)}>
        رجوع للدروس
      </button>
    </div>
  )
}
