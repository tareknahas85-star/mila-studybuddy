import { loadLessons } from '../lib/store.ts'

interface Props {
  profile: string
  onDone: (question: string, correct: boolean) => void
}

/** شاشة المراجعة: تظهر أسئلة من الدروس المحفوظة لتكرار الحفظ. */
export default function Review({ profile, onDone }: Props) {
  const lessons = loadLessons(profile)

  // Find a completed lesson with quiz questions
  const completedLesson = lessons.find((l) => l.done && l.quiz && l.quiz.length > 0)

  if (!completedLesson) {
    return (
      <div className="stack">
        <section className="card">
          <div className="row-head">
            <h2 className="title">لا توجد أسئلة للمراجعة</h2>
            <button className="ghost slim" type="button" onClick={() => onDone('', true)}>
              إغلاق
            </button>
          </div>
          <p className="note small">
            لم تقم بحل أي دروس بها أسئلة خيارات بعد.
          </p>
        </section>
      </div>
    )
  }

  // Pick the first quiz question from the lesson
  const question = completedLesson.quiz[0]

  return (
    <div className="stack">
      <section className="card">
        <div className="row-head">
          <h2 className="title">مراجعة 📝</h2>
          <button className="ghost slim" type="button" onClick={() => onDone('', true)}>
            إغلاق
          </button>
        </div>
        <p className="note small">
          سؤال من درس: {completedLesson.title}
        </p>
      </section>

      <section className="card">
        <p className="question-text">{question.q}</p>
        <div className="options">
          {question.options.map((opt: string, i: number) => (
            <button
              key={i}
              type="button"
              className="option-btn"
              onClick={() => onDone(question.q, i === question.answer)}
            >
              {opt}
            </button>
          ))}
        </div>
        <p className="hint-text">{question.why}</p>
      </section>

      <section className="card">
        <button
          type="button"
          className="primary"
          onClick={() => onDone('', true)}
          aria-label="أجاب الصحيح"
        >
          أنا حفظته ✓
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => onDone('', false)}
          aria-label="أجاب الخطأ"
        >
          خطأ ❌
        </button>
      </section>
    </div>
  )
}
