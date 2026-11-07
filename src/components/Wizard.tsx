import { useState } from 'react'
import type { Gender, Settings } from '../lib/store.ts'

const GRADES = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس']

const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '').slice(0, 6)

/** أول تشغيل: ولي الأمر هو اللي بيحضّر التطبيق — رقم سري، بيانات الطفل، ومفتاح مجاني اختياري. */
export default function Wizard({ initial, onDone }: { initial: Settings; onDone: (s: Settings) => void }) {
  const [pin, setPin] = useState(initial.parentPin)
  const [name, setName] = useState(initial.childName)
  const [grade, setGrade] = useState(initial.grade)
  const [gender, setGender] = useState<Gender>(initial.gender)
  const [key, setKey] = useState(initial.geminiKey)
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) return setError('رقم ولي الأمر لازم يكون ٤ أرقام على الأقل.')
    if (name.trim().length < 2) return setError('اكتب اسم الطفل (حرفين على الأقل).')
    setError('')
    onDone({ childName: name.trim(), grade, gender, parentPin: pin, geminiKey: key.trim() })
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

      <label className="label" htmlFor="name">
        اسم الطالب (الطالبة)
      </label>
      <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="مثلاً: ليلي أو روي" />

      <span className="label">الصف</span>
      <div className="chips">
        {GRADES.map((g) => (
          <button type="button" key={g} className={`chip ${g === grade ? 'on' : ''}`} onClick={() => setGrade(g)}>
            {g}
          </button>
        ))}
      </div>

      <span className="label">الجنس</span>
      <div className="chips">
        <button type="button" className={`chip ${gender === 'm' ? 'on' : ''}`} onClick={() => setGender('m')}>
          طالب
        </button>
        <button type="button" className={`chip ${gender === 'f' ? 'on' : ''}`} onClick={() => setGender('f')}>
          طالبة
        </button>
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
