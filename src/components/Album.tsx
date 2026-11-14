import { COLLS, STICKER_TOTAL, STK } from '../lib/rewards.ts'
import { COMPS } from '../lib/companions.ts'
import type { Progress, Student } from '../lib/store.ts'
import { AR, Companion, Icon, Sticker } from './ui.tsx'

/** ألبوم الستيكرات: مجموعات، وكل ستيكر بيتلزق بعد درس. */
export default function Album({ student, progress, onBack }: { student: Student; progress: Progress; onBack: () => void }) {
  const own = progress.stickers
  const comp = COMPS[student.comp]
  return (
    <main className="screen paper">
      <div className="book-head pad">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="رجوع للمكتب">
          <Icon name="back" size={22} sw={2.6} />
        </button>
        <div className="display" style={{ fontSize: 26 }}>
          ألبوم الستيكرات
        </div>
        <span className="label-tag" style={{ marginInlineStart: 'auto' }}>
          {AR(own.length)} من {AR(STICKER_TOTAL)}
        </span>
      </div>
      <div className="album">
        {COLLS.map((c) => {
          const got = c.items.filter((i) => own.includes(i)).length
          const tail = got === c.items.length ? ' كاملة!' : got === c.items.length - 1 ? ' بقي واحد!' : ''
          return (
            <section className="coll" key={c.id}>
              <h3 className="display">
                {c.n}{' '}
                <span className="muted bold" style={{ fontFamily: 'Tajawal', fontSize: 16 }}>
                  {AR(got)}/{AR(c.items.length)}
                  {tail}
                </span>
              </h3>
              <div className="coll-grid">
                {c.items.map((i, k) =>
                  own.includes(i) ? (
                    <div className="stk" key={i}>
                      <Sticker id={i} size={72} rot={[-8, 6, -4, 9][k % 4]} />
                      <span>{STK[i].n}</span>
                    </div>
                  ) : (
                    <div className="slot-empty" key={i} aria-label="ستيكر لسا ما انربح">
                      ؟
                    </div>
                  ),
                )}
              </div>
            </section>
          )
        })}
        <div className="say-row">
          <Companion id={student.comp} acc={student.acc} size={60} />
          <div className="bubble grow">كل درس بتخلّصو بيعطيك ستيكر. بيضل بالألبوم لأنو إلك، وما بيروح.</div>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          {comp.name} بيستنّى ستيكر جديد.
        </p>
      </div>
    </main>
  )
}
