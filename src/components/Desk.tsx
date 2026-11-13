import { COMPS } from '../lib/companions.ts'
import type { Book, Lesson, Progress, Student } from '../lib/store.ts'
import { BOOK_COLORS, SUBJECT_COLOR } from '../lib/rewards.ts'
import { speak, speechReady } from '../lib/speech.ts'
import { AR, Avatar, Companion, Icon, Sticker } from './ui.tsx'

const PLANT_LABEL = ['بذرة', 'نبتت!', 'عم تكبر', 'زهّرت!']

function Plant({ stage }: { stage: number }) {
  const parts = [
    '<ellipse cx="40" cy="60" rx="4" ry="3" fill="#9A6332" stroke="#2B2A33" stroke-width="2"/>',
    '<path d="M40 62V48" stroke="#2B2A33" stroke-width="3"/><path d="M40 52c-8 0-12-5-12-10 7 0 11 4 12 10z" fill="#9BE3C4" stroke="#2B2A33" stroke-width="2.5"/>',
    '<path d="M40 62V36" stroke="#2B2A33" stroke-width="3"/><path d="M40 52c-10 0-15-6-15-12 9 0 14 5 15 12zM40 44c9-1 13-7 13-13-8 1-12 6-13 13z" fill="#9BE3C4" stroke="#2B2A33" stroke-width="2.5"/>',
    '<path d="M40 62V30" stroke="#2B2A33" stroke-width="3"/><path d="M40 54c-10 0-15-6-15-12 9 0 14 5 15 12zM40 46c9-1 13-7 13-13-8 1-12 6-13 13z" fill="#9BE3C4" stroke="#2B2A33" stroke-width="2.5"/><g fill="#fff" stroke="#2B2A33" stroke-width="2"><circle cx="40" cy="18" r="6"/><circle cx="32" cy="24" r="6"/><circle cx="48" cy="24" r="6"/><circle cx="35" cy="32" r="6"/><circle cx="45" cy="32" r="6"/></g><circle cx="40" cy="26" r="4.5" fill="#FFE36E" stroke="#2B2A33" stroke-width="2"/>',
  ]
  const s = Math.min(3, stage)
  const pot =
    '<path d="M22 70h36l-5 26H27z" fill="#FFB680" stroke="#2B2A33" stroke-width="3" stroke-linejoin="round"/><rect x="18" y="62" width="44" height="10" rx="3" fill="#FF8FA3" stroke="#2B2A33" stroke-width="3"/>'
  return (
    <svg
      role="img"
      aria-label={`نبتتك: ${PLANT_LABEL[s]}`}
      width="50"
      height="62"
      viewBox="0 0 80 100"
      dangerouslySetInnerHTML={{ __html: parts[s] + pot }}
    />
  )
}

interface Props {
  student: Student
  progress: Progress
  books: Book[]
  lessons: Lesson[]
  hwPending: number
  limitReached: boolean
  tired: boolean
  onWho: () => void
  onParent: () => void
  onBook: (id: string) => void
  onContinue: (lessonId: string, bookId: string) => void
  onAlbum: () => void
  onGame: () => void
  onCustomize: () => void
  onAsk: () => void
  onAddBook: () => void
  onSnap: () => void
  onHw: () => void
  onPlant: () => void
}

/** المكتب: رف الكتب، ورقة الرفيق، وأغراض الطالب. */
export default function Desk(p: Props) {
  const { student: s, progress, books, lessons } = p
  const comp = COMPS[s.comp]
  const next = lessons.find((l) => !l.done)
  const doneN = progress.lessonsDone

  let note: string
  if (p.limitReached || p.tired) note = comp.lines.rest
  else if (p.hwPending > 0) note = 'في واجب جديد من الأهل! دوّر على الشارة الصفرا.'
  else if (lessons.length === 0) note = comp.lines.hi(s.name)
  else if (next) note = comp.lines.back(s.name, next.title)
  else note = 'خلّصت كل الدروس! صوّر صفحة جديدة ومنعملها درس.'

  const free = lessons.filter((l) => l.bookId === '')
  const shelf: Array<{ id: string; title: string; subject: string; count: number; done: number }> = []
  if (free.length > 0) shelf.push({ id: '', title: 'أسئلتي', subject: 'سؤال', count: free.length, done: free.filter((l) => l.done).length })
  books.forEach((b) => {
    const ls = lessons.filter((l) => l.bookId === b.id)
    shelf.push({ id: b.id, title: b.title, subject: b.subject, count: ls.length, done: ls.filter((l) => l.done).length })
  })

  return (
    <main className="screen">
      <div className="topbar">
        <button type="button" className="me" onClick={p.onWho} aria-label="تبديل الطالب">
          <Avatar av={s.av} name={s.name} />
          <span>{s.name}</span>
        </button>
        <div className="stars">
          <Icon name="star" size={18} sw={1.6} fill="#fff" stroke="#2B2A33" />
          <span>{AR(progress.stars)}</span>
        </div>
        <button type="button" className="icon-btn" onClick={p.onParent} aria-label="قسم الأهل">
          <Icon name="lock" size={20} />
        </button>
      </div>

      <section className="shelf-wrap" aria-label="رف الكتب">
        <div className="shelf">
          {shelf.map((b, i, arr) => {
            const cover = progress.covers[b.id] ?? {}
            const color = cover.color ?? SUBJECT_COLOR[b.subject] ?? BOOK_COLORS[i % BOOK_COLORS.length]
            const full = b.count > 0 && b.done === b.count
            return (
              <button
                key={b.id || 'free'}
                type="button"
                className={`spine ${i === arr.length - 1 && arr.length > 3 ? 'lean' : ''}`}
                style={{ height: 172 + Math.min(b.count, 6) * 6, background: color }}
                onClick={() => p.onBook(b.id)}
                aria-label={`كتاب ${b.title}، ${AR(b.done)} من ${AR(b.count)} دروس`}
              >
                <span className="band" style={{ top: 14 }} />
                <span className="t">{b.title}</span>
                <span className="dot">{cover.sticker ? <Sticker id={cover.sticker} size={26} rot={0} /> : <Icon name={full ? 'check' : 'star'} size={16} sw={2.4} />}</span>
                <span className="band" style={{ bottom: 52 }} />
              </button>
            )
          })}
          <button type="button" className="add-book" onClick={p.onAddBook} aria-label="إضافة كتاب">
            <Icon name="plus" size={24} sw={2.6} />
          </button>
        </div>
        <div className="plank" />
      </section>

      <section className="desk-area">
        <div className="note">
          <div className="tape pinky" style={{ top: -10, right: '30%', transform: 'rotate(-5deg)' }} />
          {note}
          {speechReady() && (
            <button type="button" className="speak-btn" aria-label="اسمع" onClick={() => speak(note)}>
              <Icon name="speaker" size={22} sw={2} />
            </button>
          )}
        </div>
        <button type="button" className="buddy-spot" onClick={p.onCustomize} aria-label="زيّن رفيقك">
          <Companion id={s.comp} acc={s.acc} size={108} mood={doneN > 0 ? 'happy' : 'cheer'} cls={doneN > 0 ? 'idle' : 'bounce'} />
        </button>
      </section>

      {p.hwPending > 0 && (
        <div className="continue">
          <button type="button" className="btn yellow" onClick={p.onHw}>
            <span>واجب من الأهل ({AR(p.hwPending)})</span>
            <Icon name="send" size={24} sw={2.4} />
          </button>
        </div>
      )}

      {next && !p.limitReached && (
        <div className="continue">
          <button type="button" className="btn accent" onClick={() => p.onContinue(next.id, next.bookId)}>
            <span>
              {doneN > 0 ? 'كمّل' : 'بلّش'}: {next.title}
            </span>
            <Icon name="fwd" size={24} sw={2.8} />
          </button>
        </div>
      )}

      <section className="objects" aria-label="أغراض المكتب">
        <button type="button" className="obj" onClick={p.onAsk} disabled={p.limitReached}>
          <Icon name="search" size={32} sw={2} />
          اسأل {comp.name}
        </button>
        <button type="button" className="obj" onClick={p.onAlbum}>
          <span className="badge">{AR(progress.stickers.length)}</span>
          <Icon name="album" size={32} sw={2} />
          ألبوم الستيكرات
        </button>
        <button type="button" className="obj" onClick={p.onGame}>
          <Icon name="cards" size={32} sw={2} />
          لعبة المراجعة
        </button>
        <button type="button" className="obj" onClick={p.onCustomize}>
          <Icon name="brush" size={32} sw={2} />
          زيّن رفيقك
        </button>
        <button type="button" className="obj" onClick={p.onPlant}>
          <Plant stage={doneN} />
          نبتتي
        </button>
        <button type="button" className="obj" onClick={p.onSnap} disabled={p.limitReached}>
          <Icon name="cam" size={32} sw={2} />
          صوّر صفحة
        </button>
      </section>
      <div className="foot" />
    </main>
  )
}
