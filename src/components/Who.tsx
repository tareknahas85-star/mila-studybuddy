import { COMPS } from '../lib/companions.ts'
import type { Student } from '../lib/store.ts'
import { Avatar, Companion, Icon } from './ui.tsx'

/** مين عم يدرس اليوم؟ */
export default function Who({
  students,
  paired,
  onPick,
  onAdd,
  onParent,
  onPair,
}: {
  students: Student[]
  paired: boolean
  onPick: (id: string) => void
  onAdd: () => void
  onParent: () => void
  onPair: () => void
}) {
  return (
    <main className="screen paper who">
      <div>
        <div className="label-tag">StudyBuddy</div>
        <h1 className="display" style={{ marginTop: 8 }}>مين عم يدرس اليوم؟</h1>
      </div>
      <div className="who-grid">
        {students.map((s) => (
          <button key={s.id} type="button" className="polaroid" onClick={() => onPick(s.id)}>
            <div className="tape" style={{ top: -10, left: '35%', transform: 'rotate(4deg)' }} />
            <Avatar av={s.av} name={s.name} className="ph" />
            <span className="nm">{s.name}</span>
            <span className="comp">
              <Companion id={s.comp} size={46} acc={s.acc} />
            </span>
            <span className="sr">{COMPS[s.comp].name} رفيقو</span>
          </button>
        ))}
        <button type="button" className="polaroid add" onClick={onAdd}>
          <Icon name="plus" size={30} sw={2.6} />
          طالب جديد
        </button>
      </div>
      <div className="foot col">
        {paired ? (
          <span className="sync">
            <Icon name="cloud" size={16} sw={2.4} /> مربوط بجهاز الأهل
          </span>
        ) : (
          <button type="button" className="btn ghost small" onClick={onPair}>
            <Icon name="cloud" size={20} /> اربط بجهاز الأهل
          </button>
        )}
        <button type="button" className="btn ghost small" onClick={onParent}>
          <Icon name="lock" size={20} /> قسم الأهل
        </button>
      </div>
    </main>
  )
}
