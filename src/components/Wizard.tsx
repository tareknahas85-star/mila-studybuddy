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
      <h1 className="title">أهلاً! حضّري التطبيق 🛠️</h1>
      <p className="note">هالشاشة لولي الأمر مرة واحدة بس. بعدها الطفل بيفتح على دفتره، وما بيقدر يغيّر شي.</p>

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
        اسم الطفل(ة)
      </label>
      <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="مثلاً: ليان" />

      <span className="label">الصف</span>
      <div className="chips">
        {GRADES.map((g) => (
          <button type="button" key={g} className={`chip ${g === grade ? 'on' : ''}`} onClick={() => setGrade(g)}>
            {g}
          </button>
        ))}
      </div>

      <span className="label">الدفتر</span>
      <div className="chips">
        <button type="button" className={`chip ${gender === 'f' ? 'on' : ''}`} onClick={() => setGender('f')}>
          بنات 🌸
        </button>
        <button type="button" className={`chip ${gender === 'm' ? 'on' : ''}`} onClick={() => setGender('m')}>
          صبيان 🚀
        </button>
      </div>

      <label className="label" htmlFor="key">
        مفتاح جيميني المجاني (اختياري)
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
        المفتاح بيضل على هالجهاز بس، والطفل ما بيشوفه. بدونه الدروس الجاهزة والصوت بيشتغلوا عادي، بس قراءة الصور لأ.
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      <button className="primary" type="submit">
        حفظ وفتح الدفتر ✨
      </button>
    </form>
  )
}
