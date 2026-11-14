import { COMPS } from '../lib/companions.ts'
import { MISSIONS, itemName, levelOf, metricValue, nextUnlock } from '../lib/rewards.ts'
import type { Progress, Student } from '../lib/store.ts'
import { AR, Companion, Icon } from './ui.tsx'

/** مهمّاتي: مراحل، كل مرحلة أصعب من اللي قبلها، وجايزتها غرض لرفيقك. */
export default function Missions({ student, progress, onBack }: { student: Student; progress: Progress; onBack: () => void }) {
  const comp = COMPS[student.comp]
  const lv = levelOf(progress.stars)
  const nu = nextUnlock(progress)
  const lvPct = lv.next ? Math.min(100, Math.round((progress.stars / lv.next) * 100)) : 100
  return (
    <main className="screen paper">
      <div className="book-head pad">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="رجوع للمكتب">
          <Icon name="back" size={22} sw={2.6} />
        </button>
        <div className="display" style={{ fontSize: 26 }}>
          مهمّاتي
        </div>
      </div>

      <div className="stack pad" style={{ paddingBottom: 24 }}>
        <section className="panel">
          <div className="row">
            <Companion id={student.comp} acc={student.acc} size={60} mood="cheer" />
            <div className="grow">
              <div className="display" style={{ fontSize: 22 }}>
                المستوى {AR(lv.level)}: {lv.name}
              </div>
              <div className="muted bold" style={{ fontSize: 15 }}>
                {AR(progress.stars)} نجمة {lv.next ? `من ${AR(lv.next)} للمستوى الجاي` : '(أعلى مستوى!)'}
              </div>
            </div>
          </div>
          <div className="meter">
            <div className="trk">
              <div className="fil" style={{ width: `${lvPct}%` }} />
            </div>
          </div>
          {nu && (
            <p className="muted bold" style={{ margin: 0 }}>
              باقي {AR(nu.left)} نجوم لتفتح {nu.name}. والنجوم من دروس الكتب بس.
            </p>
          )}
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            المهمّات بتفتحلك أغراض لـ{comp.name} بدون ما تستنى النجوم.
          </p>
        </section>

        {MISSIONS.map((m) => {
          const v = metricValue(m.id, progress)
          return (
            <section className="panel" key={m.id}>
              <h3>
                {m.n}
                <span className="muted bold" style={{ fontSize: 15, marginInlineStart: 'auto' }}>
                  {AR(v)} {m.unit}
                </span>
              </h3>
              {m.stages.map((s, i) => {
                const done = progress.claimed.includes(`${m.id}:${i}`)
                const pct = Math.min(100, Math.round((v / s.target) * 100))
                return (
                  <div className={`stage ${done ? 'done' : ''}`} key={s.target}>
                    <div className="row">
                      <span className="stage-n">{done ? <Icon name="check" size={18} sw={3} /> : AR(i + 1)}</span>
                      <span className="grow bold">
                        {AR(s.target)} {m.unit}
                      </span>
                      <span className="chip good">{itemName(s.reward)}</span>
                    </div>
                    {!done && (
                      <div className="meter">
                        <div className="trk">
                          <div className="fil mid" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </main>
  )
}
