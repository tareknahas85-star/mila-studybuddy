import { useState } from 'react'
import type { Gender, Settings } from '../lib/store.ts'
import { PERSONAS, defaultVoiceFor } from '../lib/persona.ts'

const GRADES = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس']

const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '').slice(0, 6)

/** أول تشغيل: ولي الأمر هو اللي بيحضّر التطبيق — رقم سري، شخصية الطفل، ومفتاح مجاني اختياري. */
export default function Wizard({ initial, onDone }: { initial: Settings; onDone: (s: Settings) => void }) {
  const [pin, setPin] = useState(initial.parentPin)
  const [grade, setGrade] = useState(initial.grade)
  const [gender, setGender] = useState<Gender>(initial.gender)
  const [key, setKey] = useState(initial.geminiKey)
  const [error, setError] = useState('')

  const persona = PERSONAS[gender === 'm' ? 'roy' : 'lily']

  const pickGender = (next: Gender) => {
    setGender(next)
    setError('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) return setError('رقم ولي الأمر لازم يكون ٤ أرقام على الأقل.')
    setError('')
    onDone({
      childName: persona.name,
      grade,
      gender,
      parentPin: pin,
      geminiKey: key.trim(),
      voice: defaultVoiceFor(gender),
    })
  }

  return (
    <form className="card wizard" onSubmit={submit} noValidate>
      <h1 className="title">حضّر التطبيق 🛠️</h1>
      <p className="note">هالشاشة لولي الأمر مرة واحدة بس. بعدها الطالب بيفتح على دفتره، وما بيقدر يغيّر شي.</p>

      <label className="label" htmlFor="pin">
        رقم ولي الأمر
      </label>
      <input
        id="pin"
        className="input"
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(digits(e.target.value))}
        placeholder="٤ أرقام"
      />

      <span className="label">مين الطالب؟</span>
      <div className="chips">
        <button
          type="button"
          className={`chip ${gender === 'f' ? 'on' : ''}`}
          onClick={() => pickGender('f')}
          aria-pressed={gender === 'f'}
        >
          طالبة
        </button>
        <button
          type="button"
          className={`chip ${gender === 'm' ? 'on' : ''}`}
          onClick={() => pickGender('m')}
          aria-pressed={gender === 'm'}
        >
          طالب
        </button>
      </div>

      <div className="persona-line">
        <img src={persona.avatar} alt={persona.name} />
        <div>
          <strong>{persona.name}</strong>
          <span className="note small">
            {gender === 'f' ? 'هي رفيقتك بالدراسة، وصوتها بنت.' : 'هو رفيقك بالدراسة، وصوته صبي.'}
          </span>
        </div>
      </div>

      <span className="label">الصف</span>
      <div className="chips">
        {GRADES.map((g) => (
          <button type="button" key={g} className={`chip ${g === grade ? 'on' : ''}`} onClick={() => setGrade(g)}>
            {g}
          </button>
        ))}
      </div>

      <label className="label" htmlFor="key">
        مفتاح جيميني المجاني
      </label>
      <input
        id="key"
        className="input ltr"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="AIza..."
        autoComplete="off"
      />
      <p className="note small">
        من <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer noopener">Google AI Studio</a> — مجاني.
        المفتاح بيضل على هالجهاز بس، والطالب ما بيشوفه. بدونه البحث وقراءة الصور ما بيشتغلوا.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      <button className="primary" type="submit">
        حفظ وفتح الدفتر ✨
      </button>
    </form>
  )
}
