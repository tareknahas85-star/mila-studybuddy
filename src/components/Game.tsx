import { useEffect, useRef, useState } from 'react'
import type { Lesson, Student } from '../lib/store.ts'
import { Companion, Icon } from './ui.tsx'

interface Card {
  i: number
  k: number
  t: string
  up: boolean
  got: boolean
}

const clip = (t: string, n: number): string => (t.length > n ? `${t.slice(0, n - 1)}…` : t)

/** بيختار ٣ أزواج (سؤال وجوابو) مختلفة: لا سؤال ولا جواب بيتكرر، حتى لو أجوبة الدروس قصيرة ومتشابهة. */
function pickPairs(pool: Array<[string, string]>): Array<[string, string]> | null {
  const usedQ = new Set<string>()
  const usedA = new Set<string>()
  const out: Array<[string, string]> = []
  for (const [q, a] of pool.sort(() => Math.random() - 0.5)) {
    if (usedQ.has(q) || usedA.has(a)) continue
    usedQ.add(q)
    usedA.add(a)
    out.push([q, a])
    if (out.length === 3) return out
  }
  return null
}

function build(lessons: Lesson[]): Card[] | null {
  const done = lessons.filter((l) => l.done)
  const source = done.length >= 2 ? done : lessons
  const fromQuiz: Array<[string, string]> = []
  for (const l of source) {
    for (const q of l.quiz) {
      const a = q.options[q.answer]
      if (a && a.length <= 50) fromQuiz.push([q.q, a])
    }
  }
  const fromSummary: Array<[string, string]> = []
  for (const l of lessons) if (l.summary !== '' && l.summary.length <= 90) fromSummary.push([l.title, l.summary])
  // الأسئلة أول، وإذا ما كفّت (أو كلها متشابهة) منلعب بعناوين الدروس وملخّصاتها.
  const pick = pickPairs(fromQuiz) ?? pickPairs(fromSummary)
  if (!pick) return null
  const cards: Array<Omit<Card, 'i'>> = []
  pick.forEach((pr, k) => {
    cards.push({ k, t: clip(pr[0], 80), up: false, got: false })
    cards.push({ k, t: clip(pr[1], 80), up: false, got: false })
  })
  return cards.sort(() => Math.random() - 0.5).map((c, i) => ({ ...c, i }))
}
/** لعبة المراجعة: كل سؤال إلو جوابو، من دروس الطالب نفسو. */
export default function Game({ student, lessons, onBack, onWin }: { student: Student; lessons: Lesson[]; onBack: () => void; onWin: () => void }) {
  const [cards, setCards] = useState<Card[] | null>(() => build(lessons))
  const [lock, setLock] = useState(false)
  const winRef = useRef(false)

  const won = cards !== null && cards.every((c) => c.got)
  useEffect(() => {
    if (won && !winRef.current) {
      winRef.current = true
      onWin()
    }
  }, [won, onWin])

  const flip = (i: number) => {
    if (!cards || lock) return
    const c = cards[i]
    if (c.up || c.got) return
    const next = cards.map((x) => (x.i === i ? { ...x, up: true } : x))
    setCards(next)
    const ups = next.filter((x) => x.up && !x.got)
    if (ups.length === 2) {
      setLock(true)
      const match = ups[0].k === ups[1].k
      window.setTimeout(
        () => {
          setCards((cur) =>
            (cur ?? []).map((x) => (x.up && !x.got ? (match ? { ...x, got: true, up: false } : { ...x, up: false }) : x)),
          )
          setLock(false)
        },
        match ? 450 : 1000,
      )
    }
  }

  const again = () => {
    winRef.current = false
    setCards(build(lessons))
  }

  return (
    <main className="screen paper">
      <div className="book-head pad">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="رجوع للمكتب">
          <Icon name="back" size={22} sw={2.6} />
        </button>
        <div className="display" style={{ fontSize: 26 }}>
          لعبة المراجعة
        </div>
      </div>
      {cards === null ? (
        <div className="say-row pad">
          <Companion id={student.comp} acc={student.acc} size={64} mood="think" />
          <div className="bubble grow">لازم تحلّ كم درس أول، وبعدها منلعب بأسئلتك.</div>
        </div>
      ) : (
        <>
          <div className="say-row pad">
            <Companion id={student.comp} acc={student.acc} size={60} mood={won ? 'cheer' : 'happy'} cls={won ? 'bounce' : 'idle'} />
            <div className="bubble grow">{won ? 'فزت! برافو عليك.' : 'اقلب كرتين: كل سؤال إلو جوابو. لاقي الأزواج!'}</div>
          </div>
          <div className="cards">
            {cards.map((c) => (
              <button
                key={c.i}
                type="button"
                className={`mcard ${c.up ? 'up' : ''} ${c.got ? 'got' : ''}`}
                aria-label={c.up || c.got ? c.t : 'كرت مقلوب'}
                onClick={() => flip(c.i)}
              >
                <span className="in">
                  <span className="f">
                    <Icon name="star" size={34} sw={1.8} fill="#fff" stroke="#2B2A33" />
                  </span>
                  <span className="b">{c.t}</span>
                </span>
              </button>
            ))}
          </div>
          {won && (
            <div className="row pad" style={{ paddingTop: 18 }}>
              <button type="button" className="btn grow" onClick={again}>
                كمان مرة
              </button>
              <button type="button" className="btn yellow grow" onClick={onBack}>
                عالمكتب
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
