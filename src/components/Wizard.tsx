import { useState } from 'react'
import type { Gender, Settings } from '../lib/store.ts'
import { uid } from '../lib/store.ts'
import { defaultAssistantFor, defaultVoiceFor, personaFor } from '../lib/persona.ts'

const GRADES = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس']

const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '').slice(0, 6)

/** أول تشغيل: ولي الأمر بيحضّر التطبيق — اسم الطالب، رقم سري، اسم الشخصية، ومفتاح مجاني اختياري. */
export default function Wizard({ initial, onDone }: { initial: Settings; onDone: (s: Settings) => void }) {
  const [childName, setChildName] = useState(initial.childName)
  const [pin, setPin] = useState(initial.parentPin)
  const [grade, setGrade] = useState(initial.grade)
  const [gender, setGender] = useState<Gender>(initial.gender)
  const [assistant, setAssistant] = useState(initial.assistantName || defaultAssistantFor(initial.gender))
  const [key, setKey] = useState(initial.geminiKey)
  const [error, setError] = useState('')

  const persona = personaFor({ gender, assistantName: assistant })

  const pickGender = (next: Gender) => {
    // لو اسم الشخصية كان الاسم الافتراضي، بنبدّله حسب الجنس الجديد.
    if (assistant === defaultAssistantFor(gender)) setAssistant(defaultAssistantFor(next))
    setGender(next)
    setError('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (childName.trim().length < 2) return setError('اكتب اسم الطالب (حرفين على الأقل).')
    if (pin.length < 4) return setError('رقم ولي الأمر لازم يكون ٤ أرقام على الأقل.')
    setError('')
    onDone({
      childName: childName.trim(),
      assistantName: assistant.trim() || defaultAssistantFor(gender),
      grade,
      gender,
      parentPin: pin,
      geminiKey: key.trim(),
      voice: defaultVoiceFor(gender),
      profile: uid(),
    })
  }

  return (
    <form className="card wizard" onSubmit={submit} noValidate>
      <h1 className="title">حضّر التطبيق 🛠️</h1>
      <p className="note">هالشاشة لولي الأمر مرة واحدة بس. بعدها الطالب بيفتح على دفتره، وما بيقدر يغيّر شي.</p>

      <label className="label" htmlFor="child">
        اسم الطالب
      </label>
      <input
        id="child"
        className="input"
        value={childName}
        onChange={(e) => setChildName(e.target.value)}
        maxLength={20}
        autoComplete="off"
      />

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
        <button type="button" className={`chip ${gender === 'f' ? 'on' : ''}`} onClick={() => pickGender('f')} aria-pressed={gender === 'f'}>
          طالبة
        </button>
        <button type="button" className={`chip ${gender === 'm' ? 'on' : ''}`} onClick={() => pickGender('m')} aria-pressed={gender === 'm'}>
          طالب
        </button>
      </div>

      <label className="label" htmlFor="assistant">
        اسم الشخصية المساعدة
      </label>
      <input
        id="assistant"
        className="input"
        value={assistant}
        onChange={(e) => setAssistant(e.target.value)}
        maxLength={20}
        autoComplete="off"
      />

      <div className="persona-line">
        <img src={persona.avatar} alt={persona.name} />
        <div>
          <strong>{persona.name}</strong>
          <span className="note small">
            {gender === 'f' ? 'هي رفيقة الطالبة بالدراسة، وصوتها بنت.' : 'هو رفيق الطالب بالدراسة، وصوته صبي.'}
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

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button className="primary" type="submit">
        حفظ وفتح الدفتر ✨
      </button>
    </form>
  )
}
