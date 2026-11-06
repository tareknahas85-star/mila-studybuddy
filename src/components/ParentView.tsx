import { useState } from 'react'
import type { Progress, Settings } from '../lib/store.ts'
import { currentStreak } from '../lib/store.ts'

interface Props {
  settings: Settings
  progress: Progress
  onSave: (s: Settings) => void
  onReset: () => void
}

/** قسم الأهل: كل شي محلي — المفتاح، بيانات الطفل، والتقدّم. */
export default function ParentView({ settings, progress, onSave, onReset }: Props) {
  const [name, setName] = useState(settings.childName)
  const [key, setKey] = useState(settings.geminiKey)
  const [saved, setSaved] = useState('')

  const save = () => {
    onSave({ ...settings, childName: name.trim() || settings.childName, geminiKey: key.trim() })
    setSaved('انحفظ ✅')
    window.setTimeout(() => setSaved(''), 2500)
  }

  return (
    <div className="card">
      <h2 className="title">👨‍👩‍👧 قسم الأهل</h2>

      <div className="stats">
        <div className="stat">
          <strong>{progress.stars}</strong>
          <span>نجوم ⭐</span>
        </div>
        <div className="stat">
          <strong>{currentStreak(progress)}</strong>
          <span>أيام متتالية 🔥</span>
        </div>
        <div className="stat">
          <strong>{progress.lessonsDone}</strong>
          <span>دروس 🎓</span>
        </div>
      </div>

      <label className="label" htmlFor="p-name">
        اسم الطفل(ة)
      </label>
      <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />

      <label className="label" htmlFor="p-key">
        مفتاح جيميني (لميزة قراءة الصور)
      </label>
      <input
        id="p-key"
        className="input ltr"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="AIza..."
        autoComplete="off"
      />
      <p className="note small">بيضل على هالجهاز بس. إذا انحذف، الدروس الجاهزة بضل تشتغل.</p>

      {saved && <p className="ok">{saved}</p>}
      <button className="primary" type="button" onClick={save}>
        حفظ التغييرات 💾
      </button>

      <button className="danger" type="button" onClick={onReset}>
        تصفير التقدّم
      </button>

      <p className="note small">
        التطبيق بلا حسابات وبلا سيرفر: كل البيانات (الاسم، التقدّم، المفتاح) محفوظة على هالجهاز فقط، وما بتنطلع منه.
      </p>
    </div>
  )
}
