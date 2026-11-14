import { useState } from 'react'
import { COMPS, COMP_ORDER } from '../lib/companions.ts'
import type { CompId } from '../lib/companions.ts'
import { squareAvatar } from '../lib/img.ts'
import { uid } from '../lib/store.ts'
import type { Gender, Student } from '../lib/store.ts'
import { SUBJECT_COLOR } from '../lib/rewards.ts'
import { COMP_COST } from '../lib/rewards.ts'
import { AR, AVATAR_KEYS, Avatar, Companion, Icon } from './ui.tsx'

export const GRADES = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس']
export const SUBJECT_LIST = Object.keys(SUBJECT_COLOR)

/** إضافة طالب: الاسم، الصف، الصورة (أفاتار الطالب)، والرفيق اللي بيدرّسو. */
export function StudentForm({ onSave, submitLabel = 'احفظ' }: { onSave: (s: Student) => void; submitLabel?: string }) {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('الصف الخامس')
  const [gender, setGender] = useState<Gender>('f')
  const [av, setAv] = useState('a')
  const [comp, setComp] = useState<CompId>('buddy')
  const [err, setErr] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (n.length < 2) {
      setErr('اكتب اسم الطالب.')
      return
    }
    onSave({
      id: uid(),
      name: n,
      grade,
      gender,
      av,
      comp,
      skin: 'notebook',
      acc: {},
      voice: COMPS[comp].voice,
      limitMin: 0,
      goal: 3,
      canEdit: false,
      starCap: 3,
    })
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <label className="field">
        الاسم
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoComplete="off" />
      </label>
      <div className="field">
        الصف
        <div className="chips">
          {GRADES.map((g) => (
            <button type="button" key={g} className="chip pick" aria-pressed={g === grade} onClick={() => setGrade(g)}>
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        بنت ولّا صبي؟
        <div className="seg">
          <button type="button" className="btn pick" aria-pressed={gender === 'f'} onClick={() => setGender('f')}>
            بنت
          </button>
          <button type="button" className="btn pick" aria-pressed={gender === 'm'} onClick={() => setGender('m')}>
            صبي
          </button>
        </div>
      </div>
      <div className="field">
        الصورة
        <div className="av-pick">
          <label className={`av-upload ${av.startsWith('data:') ? 'on' : ''}`} aria-label="ارفع صورة الطالب">
            {av.startsWith('data:') ? <Avatar av={av} name={name || 'ع'} className="av-fill" /> : <Icon name="cam" size={28} sw={2} />}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void squareAvatar(f).then((d) => d && setAv(d))
              }}
            />
          </label>
          {AVATAR_KEYS.map((k) => (
            <button type="button" key={k} aria-pressed={k === av} aria-label="صورة" onClick={() => setAv(k)}>
              <Avatar av={k} name={name || 'ع'} className="av-fill" />
            </button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>ارفع صورة الطالب، أو اختار لون. بتضل على الجهاز.</span>
      </div>
      <div className="field">
        الرفيق
        <div className="comp-grid">
          {COMP_ORDER.filter((id) => COMP_COST[id] === 0).map((id) => (
            <CompCard key={id} id={id} pressed={id === comp} onPick={() => setComp(id)} />
          ))}
        </div>
      </div>
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
      <button className="btn yellow" type="submit">
        {submitLabel}
      </button>
    </form>
  )
}

export function CompCard({ id, pressed, onPick, lockLeft = 0 }: { id: CompId; pressed: boolean; onPick: () => void; lockLeft?: number }) {
  const c = COMPS[id]
  return (
    <button
      type="button"
      className={`comp-card ${lockLeft > 0 ? 'locked' : ''}`}
      aria-pressed={pressed}
      onClick={onPick}
      disabled={lockLeft > 0}
      aria-label={lockLeft > 0 ? `${c.name}، مقفول، باقي ${AR(lockLeft)} نجوم` : c.name}
    >
      <Companion id={id} size={64} acc={{}} />
      <b>{c.name}</b>
      <small>
        {c.tag}
        <br />
        {c.desc}
      </small>
      {lockLeft > 0 && (
        <span className="comp-lock">
          <Icon name="lock" size={16} /> {AR(lockLeft)} <Icon name="star" size={14} sw={2} />
        </span>
      )}
    </button>
  )
}

/** إضافة كتاب: الاسم والمادة. */
export function BookForm({ onSave }: { onSave: (title: string, subject: string) => void }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState(SUBJECT_LIST[0])
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        if (title.trim().length >= 2) onSave(title.trim(), subject)
      }}
    >
      <label className="field">
        اسم الكتاب
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} placeholder="مثلاً: رياضيات ٥" autoComplete="off" />
      </label>
      <div className="field">
        المادة
        <div className="chips">
          {SUBJECT_LIST.map((s) => (
            <button type="button" key={s} className="chip pick" aria-pressed={s === subject} onClick={() => setSubject(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <button className="btn yellow" type="submit" disabled={title.trim().length < 2}>
        <Icon name="plus" size={22} sw={2.6} /> أضف الكتاب
      </button>
    </form>
  )
}
