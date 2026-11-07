import type { Book, Lesson } from '../lib/store.ts'
import { prettyDate } from '../lib/img.ts'
import { iconFor } from '../lib/subjects.ts'
import Shot from './Shot.tsx'

interface Props {
  lessons: Lesson[]
  books: Book[]
  onOpenLesson: (id: string) => void
  onDeleteLesson: (id: string) => void
}

/** الأرشيف: كل درس وصورة انحفظوا على هالجهاز، مع إمكانية الحذف. */
export default function Library({ lessons, books, onOpenLesson, onDeleteLesson }: Props) {
  const bookName = (id: string) => books.find((b) => b.id === id)?.title ?? 'سؤال حر'

  const remove = (lesson: Lesson) => {
    const ok = window.confirm(`بدك تحذف «${lesson.title}» من الأرشيف؟ ما في رجعة بعدها.`)
    if (ok) onDeleteLesson(lesson.id)
  }

  return (
    <>
      <section className="card">
        <div className="row-head">
          <h2 className="title">دروسي 🗂️</h2>
          <span className="pill">{lessons.length} درس محفوظ</span>
        </div>
        <p className="note small">
          كل درس حلّيته، وكل صورة حلّلتها ميلا، محفوظين هون على الجهاز. بترجع لأي درس وقت ما بدك.
        </p>
      </section>

      {lessons.length === 0 ? (
        <section className="card">
          <p className="note">
            لسا ما في دروس. اكتب سؤال بالرئيسية، أو ضيف كتاب وصوّر صفحة منه — وأول درس بينحفظ هون.
          </p>
        </section>
      ) : (
        <section className="card">
          <div className="list">
            {lessons.map((l) => (
              <div className="arch" key={l.id}>
                <button className="row arch-row" type="button" onClick={() => onOpenLesson(l.id)}>
                  {l.imageId ? (
                    <Shot id={l.imageId} className="row-thumb" />
                  ) : (
                    <span className="row-icon" aria-hidden="true">
                      {iconFor(l.subject)}
                    </span>
                  )}
                  <span className="row-main">
                    <span className="row-title">{l.title}</span>
                    <span className="row-sub">
                      {l.subject} · {bookName(l.bookId)} · {prettyDate(l.createdAt)}
                    </span>
                    <span className="row-sub">
                      {l.done ? `محلول ✓ ${l.right}/${l.total}` : 'بدك تحلّه — الشرح محفوظ'}
                    </span>
                  </span>
                </button>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label={`حذف ${l.title}`}
                  onClick={() => remove(l)}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
