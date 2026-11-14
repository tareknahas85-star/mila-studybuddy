import { useState } from 'react'
import { askMila } from '../lib/ai.ts'
import type { LessonDraft } from '../lib/ai.ts'
import { COMPS, COMP_ORDER } from '../lib/companions.ts'
import type { AccId } from '../lib/companions.ts'
import { ACCS, ACC_ICON, BOOK_COLORS, COMP_COST, SKINS, isUnlocked } from '../lib/rewards.ts'
import type { SkinId } from '../lib/rewards.ts'
import type { Book, Homework, Memory, Progress, Student } from '../lib/store.ts'
import { CompCard } from './forms.tsx'
import { AR, Companion, Icon, Sheet, Sticker } from './ui.tsx'

/** زيّن رفيقك: الرفيق، الثيم، والإكسسوارات. التغيير بيبين فوراً ورا الشاشة. */
export function CustomizeSheet({
  student,
  progress,
  onChange,
  onClose,
}: {
  student: Student
  progress: Progress
  onChange: (patch: Partial<Student>) => void
  onClose: () => void
}) {
  const stars = progress.stars
  return (
    <Sheet onClose={onClose} label="زيّن رفيقك">
      <h2 className="display">زيّن رفيقك</h2>
      <div className="field">
        الرفيق
        <div className="comp-grid">
          {COMP_ORDER.map((id) => {
            const locked = !isUnlocked(progress, 'comp', id, COMP_COST[id]) && student.comp !== id
            return (
              <CompCard
                key={id}
                id={id}
                pressed={student.comp === id}
                lockLeft={locked ? Math.max(1, COMP_COST[id] - stars) : 0}
                onPick={() => onChange({ comp: id, voice: COMPS[id].voice })}
              />
            )
          })}
        </div>
      </div>
      <div className="field">
        الثيم
        <div className="skin-grid">
          {SKINS.map((k) => {
            const locked = !isUnlocked(progress, 'skin', k.id, k.cost) && student.skin !== k.id
            return (
              <button
                key={k.id}
                type="button"
                className="skin"
                aria-pressed={student.skin === k.id}
                disabled={locked}
                aria-label={`${k.n}${locked ? '، مقفول' : ''}`}
                onClick={() => onChange({ skin: k.id as SkinId })}
              >
                <span className="prev" style={{ background: k.desk }}>
                  {k.bars.map((c, i) => (
                    <i key={c} style={{ height: [34, 44, 26][i], background: c }} />
                  ))}
                  <i style={{ height: 6, width: 26, background: k.paper, marginInlineStart: 'auto' }} />
                </span>
                <span className="nm">{k.n}</span>
                {locked && (
                  <span className="lockd">
                    <Icon name="lock" size={22} />
                    <span>
                      {AR(Math.max(1, k.cost - stars))} <Icon name="star" size={14} sw={2} />
                    </span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="field">
        إكسسوارات الرفيق
        <div className="acc-row">
          {ACCS.map((a) => {
            const locked = !isUnlocked(progress, 'acc', a.id, a.cost) && !student.acc[a.id]
            return (
              <button
                key={a.id}
                type="button"
                className="acc"
                aria-pressed={!!student.acc[a.id]}
                disabled={locked}
                aria-label={`${a.n}${locked ? '، مقفول' : ''}`}
                onClick={() => onChange({ acc: { ...student.acc, [a.id as AccId]: !student.acc[a.id as AccId] } })}
              >
                <svg
                  aria-hidden="true"
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: ACC_ICON[a.id] }}
                />
                {a.n}
                {locked && (
                  <span className="row" style={{ gap: 2 }}>
                    <Icon name="lock" size={13} /> {AR(Math.max(1, a.cost - stars))} <Icon name="star" size={12} sw={2} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <p className="muted bold" style={{ margin: 0 }}>كل ما بتجمع نجوم أكتر، بتفتح ثيمات وإكسسوارات جديدة.</p>
      <button type="button" className="btn yellow" onClick={onClose}>
        تمام
      </button>
    </Sheet>
  )
}

/** اسأل رفيقك سؤال حر: بيصير درس بدفتر "أسئلتي". */
export function AskSheet({
  student,
  memory,
  apiKey,
  onDraft,
  onClose,
}: {
  student: Student
  memory: Memory
  apiKey: string
  onDraft: (d: LessonDraft) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const name = COMPS[student.comp].name
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = q.trim()
    if (text.length < 3 || busy) return
    setBusy(true)
    setErr('')
    const res = await askMila({ apiKey, settings: { grade: student.grade, comp: student.comp, name: student.name }, memory, question: text })
    setBusy(false)
    if (!res.ok) {
      setErr(res.error)
      return
    }
    onDraft(res.data)
  }
  return (
    <Sheet onClose={onClose} label={`اسأل ${name}`}>
      <div className="say-row">
        <Companion id={student.comp} acc={student.acc} size={70} mood={busy ? 'think' : 'happy'} />
        <div className="bubble grow">{busy ? 'عم فكّر… لحظة.' : 'شو بدك تفهم اليوم؟ اسأل أي شي.'}</div>
      </div>
      <form className="stack" onSubmit={(e) => void submit(e)}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="مثلاً: شو دورة الماء بالطبيعة؟"
          maxLength={220}
          aria-label="سؤالك"
        />
        {err && (
          <p className="error" role="alert">
            {err}
          </p>
        )}
        <button className="btn yellow" type="submit" disabled={busy || q.trim().length < 3}>
          {busy ? '…' : 'اشرحلي'}
        </button>
      </form>
    </Sheet>
  )
}

/** زيّن غلاف كتاب: لون وستيكر من ستيكراتك. */
export function DecorateSheet({
  book,
  progress,
  onPick,
  onClose,
}: {
  book: Book
  progress: Progress
  onPick: (patch: { color?: string; sticker?: string }) => void
  onClose: () => void
}) {
  const cur = progress.covers[book.id] ?? {}
  return (
    <Sheet onClose={onClose} label="زيّن الغلاف">
      <h2 className="display">زيّن غلاف {book.title}</h2>
      <div className="field">
        اللون
        <div className="swatches">
          {BOOK_COLORS.map((c) => (
            <button key={c} type="button" className="sw" style={{ background: c }} aria-pressed={cur.color === c} aria-label="لون" onClick={() => onPick({ color: c })} />
          ))}
        </div>
      </div>
      <div className="field">
        الستيكر (من ستيكراتك)
        <div className="swatches">
          {progress.stickers.map((s) => (
            <button key={s} type="button" className="sw sticker-sw" aria-pressed={cur.sticker === s} aria-label="ستيكر" onClick={() => onPick({ sticker: s })}>
              <Sticker id={s} size={58} rot={0} />
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="btn yellow" onClick={onClose}>
        تمام
      </button>
    </Sheet>
  )
}

/** واجب من الأهل: الصفحة المصوّرة والرسالة. */
export function HomeworkSheet({
  student,
  items,
  onDone,
  onClose,
}: {
  student: Student
  items: Homework[]
  onDone: (id: string) => void
  onClose: () => void
}) {
  return (
    <Sheet onClose={onClose} label="واجب من الأهل">
      <h2 className="display">واجب من الأهل</h2>
      {items.map((h) => (
        <div className="stack" key={h.id}>
          {h.photo !== '' && (
            <div className="taped-photo" style={{ alignSelf: 'center' }}>
              <div className="tape" style={{ top: -10, left: '30%', transform: 'rotate(-4deg)' }} />
              <img src={h.photo} alt="صفحة الواجب" />
            </div>
          )}
          <div className="say-row">
            <Companion id={student.comp} acc={student.acc} size={64} />
            <div className="bubble grow">{h.msg !== '' ? h.msg : 'الأهل بعتولك واجب.'}</div>
          </div>
          <button type="button" className="btn mint" onClick={() => onDone(h.id)}>
            خلّصت الواجب <Icon name="check" size={22} sw={3} />
          </button>
        </div>
      ))}
      <button type="button" className="btn ghost" onClick={onClose}>
        مو هلق
      </button>
    </Sheet>
  )
}

/** اختيار كتاب لتصوير صفحة. */
export function PickBookSheet({ books, hasFree, onPick, onClose }: { books: Book[]; hasFree: boolean; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} label="اختار الكتاب">
      <h2 className="display">لأي كتاب هالصفحة؟</h2>
      {hasFree && (
        <button type="button" className="list-btn" onClick={() => onPick('')}>
          <Icon name="book" size={24} />
          <span className="grow">أسئلتي</span>
        </button>
      )}
      {books.map((b) => (
        <button key={b.id} type="button" className="list-btn" onClick={() => onPick(b.id)}>
          <Icon name="book" size={24} />
          <span className="grow">{b.title}</span>
        </button>
      ))}
    </Sheet>
  )
}

/** رسالة قصيرة من الرفيق. */
export function NoteSheet({ student, text, onClose }: { student: Student; text: string; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} label="رسالة">
      <div className="say-row">
        <Companion id={student.comp} acc={student.acc} size={70} />
        <div className="bubble grow">{text}</div>
      </div>
      <button type="button" className="btn yellow" onClick={onClose}>
        تمام
      </button>
    </Sheet>
  )
}
