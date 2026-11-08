import { PERSONAS } from '../lib/persona.ts'
import { PROFILES, loadLessons, loadProgress, type ProfileId } from '../lib/store.ts'

interface Props {
  active: ProfileId
  onPick: (profile: ProfileId) => void
  onClose: () => void
}

/** اختيار الطالب: كل حساب إله نجومه ودروسه وذاكرته لحاله. */
export default function SwitchStudent({ active, onPick, onClose }: Props) {
  return (
    <div className="stack">
      <section className="card">
        <div className="row-head">
          <h2 className="title">مين بدك تفتح؟ 👤</h2>
          <button className="ghost slim" type="button" onClick={onClose}>
            إلغاء
          </button>
        </div>
        <p className="note small">
          كل طالب إله حسابه لحاله: النجوم، الدروس، الكتب، والذاكرة منفصلين تمامًا. رقم ولي الأمر والمفتاح مشتركين.
        </p>
      </section>

      <section className="card">
        <div className="list">
          {PROFILES.map((id) => {
            const persona = PERSONAS[id]
            const progress = loadProgress(id)
            const lessons = loadLessons(id)
            const isActive = id === active
            return (
              <button
                key={id}
                type="button"
                className={`row persona-row ${isActive ? 'on' : ''}`}
                onClick={() => onPick(id)}
              >
                <img className="persona-face" src={persona.avatar} alt={persona.name} />
                <span className="row-main">
                  <span className="row-title">
                    {persona.name}
                    {isActive ? ' · مفتوح هلق' : ''}
                  </span>
                  <span className="row-sub">
                    ⭐ {progress.stars} نجمة · {lessons.length} درس
                  </span>
                </span>
                <span className="chev" aria-hidden="true">
                  {isActive ? '✓' : '‹'}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
