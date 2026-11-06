import { useState } from 'react'

const digits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '').slice(0, 6)

/** بوابة ولي الأمر: بتمنع الطفل من قسم الأهل (المفتاح، الاسم، تصفير التقدّم). */
export default function Lock({ pin, title, onUnlock, onCancel }: { pin: string; title: string; onUnlock: () => void; onCancel?: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value !== pin) {
      setError('الرقم غلط.')
      setValue('')
      return
    }
    setError('')
    onUnlock()
  }

  return (
    <form className="card lock" onSubmit={submit} noValidate>
      <h2 className="title">🔒 {title}</h2>
      <p className="note">رقم ولي الأمر بس.</p>
      <input
        className="input"
        type="password"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(digits(e.target.value))}
        placeholder="••••"
        autoFocus
      />
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" type="submit">
        فتح
      </button>
      {onCancel && (
        <button type="button" className="ghost" onClick={onCancel}>
          رجوع
        </button>
      )}
    </form>
  )
}
