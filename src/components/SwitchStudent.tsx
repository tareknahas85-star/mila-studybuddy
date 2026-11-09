import { useState } from 'react'
import { PERSONAS, defaultAssistantFor, defaultVoiceFor } from '../lib/persona.ts'
import {
  MAX_STUDENTS,
  createStudent,
  listProfiles,
  loadLessons,
  loadProgress,
  loadSettings,
  type Gender,
  type ProfileId,
} from '../lib/store.ts'

const GRADES = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس']

interface Props {
  active: ProfileId
  onPick: (profile: ProfileId) => void
  onClose: () => void
}

/** اختيار الطالب: كل حساب إله نجومه ودروسه وذاكرته لحاله، وأي حدا بيقدر يضيف طالب جديد. */
export default function SwitchStudent({ active, onPick, onClose }: Props) {
  const [adding, setAdding] = useState(false)
  const [childName, setChildName] = useState('')
  const [gender, setGender] = useState<Gender>('f')
  const [assistant, setAssistant] = useState(defaultAssistantFor('f'))
  const [grade, setGrade] = useState(GRADES[4])
  const [error, setError] = useState('')

  const ids = listProfiles()
  const full = ids.length >= MAX_STUDENTS

  const pickGender = (next: Gender) => {
    // لو اسم الشخصية كان الاسم الافتراضي، بنبدّله حسب الجنس الجديد.
    if (assistant === defaultAssistantFor(gender)) setAssistant(defaultAssistantFor(next))
    setGender(next)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = childName.trim()
    if (name.length < 2) return setError('اكتب اسم الطالب (حرفين على الأقل).')
    const id = createStudent({
      childName: name,
      assistantName: assistant.trim() || defaultAssistantFor(gender),
      grade,
      gender,
      voice: defaultVoiceFor(gender),
    })
    if (!id) return setError(`وصلنا الحد الأقصى (${MAX_STUDENTS} طلاب).`)
    onPick(id)
  }

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
          {ids.map((id) => {
            const s = loadSettings(id)
            const face = PERSONAS[s.gender === 'm' ? 'roy' : 'lily']
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
                <img className="persona-face" src={face.avatar} alt={s.assistantName} />
                <span className="row-main">
                  <span className="row-title">
                    {s.childName || 'طالب'}
                    {isActive ? ' · مفتوح هلق' : ''}
                  </span>
                  <span className="row-sub">
                    مع {s.assistantName} · ⭐ {progress.stars} نجمة · {lessons.length} درس
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

      <section className="card">
        {!adding ? (
          <button className="primary" type="button" disabled={full} onClick={() => setAdding(true)}>
            {full ? `وصلنا الحد (${MAX_STUDENTS} طلاب)` : '➕ أضف طالب جديد'}
          </button>
        ) : (
          <form onSubmit={submit} noValidate>
            <h3 className="small-title">طالب جديد</h3>
            <label className="label" htmlFor="new-name">
              اسم الطالب
            </label>
            <input
              id="new-name"
              className="input"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              maxLength={20}
              autoComplete="off"
            />

            <span className="label">مين الطالب؟</span>
            <div className="chips">
              <button type="button" className={`chip ${gender === 'f' ? 'on' : ''}`} onClick={() => pickGender('f')} aria-pressed={gender === 'f'}>
                طالبة
              </button>
              <button type="button" className={`chip ${gender === 'm' ? 'on' : ''}`} onClick={() => pickGender('m')} aria-pressed={gender === 'm'}>
                طالب
              </button>
            </div>

            <label className="label" htmlFor="new-assistant">
              اسم الشخصية المساعدة
            </label>
            <input
              id="new-assistant"
              className="input"
              value={assistant}
              onChange={(e) => setAssistant(e.target.value)}
              maxLength={20}
              autoComplete="off"
            />

            <span className="label">الصف</span>
            <div className="chips">
              {GRADES.map((g) => (
                <button type="button" key={g} className={`chip ${g === grade ? 'on' : ''}`} onClick={() => setGrade(g)}>
                  {g}
                </button>
              ))}
            </div>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" type="submit">
              أضف وافتح ✨
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setAdding(false)
                setError('')
              }}
            >
              إلغاء
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
