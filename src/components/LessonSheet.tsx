import { useEffect, useState } from 'react'
import type { Lesson, Mood, SignalKind } from '../lib/store.ts'
import { prettyDate } from '../lib/img.ts'
import { speak, speechReady, stopSpeaking } from '../lib/speech.ts'
import { naturalReady, primeVoice, speakNatural, stopNatural } from '../lib/tts.ts'
import Shot from './Shot.tsx'

type Mode = 'text' | 'voice' | 'video'

interface Props {
  lesson: Lesson
  onBack: () => void
  onFinish: (lessonId: string, right: number, total: number) => void
  onSignal: (kind: SignalKind) => void
  onMood: (m: Mood) => void
  /** مفتاح جيميني (صوت طبيعي) — فاضي يعني صوت الجهاز. */
  apiKey: string
  /** اسم صوت ميلا من مكتبة جوجل. */
  voice: string
}

/** الدرس: شرح مكتوب، صوت ميلا الطبيعي بالشامي، فيديو، تلميحات، وبعدها أسئلة خيارات. */
export default function LessonSheet({ lesson, onBack, onFinish, onSignal, onMood, apiKey, voice }: Props) {
  const [mode, setMode] = useState<Mode>('text')
  const [playing, setPlaying] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [revealed, setRevealed] = useState(0)
  const [showPage, setShowPage] = useState(false)
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [right, setRight] = useState(0)
  const [finished, setFinished] = useState(false)

  // أول ما يفتح الدرس منسجّل إنه الطفل بيقرا.
  useEffect(() => {
    onSignal('text')
  }, [onSignal])

  useEffect(
    () => () => {
      stopSpeaking()
      stopNatural()
    },
    [],
  )

  const item = lesson.quiz[index]
  const caseTotal = lesson.quiz.length

  const speakLesson = () => {
    if (playing) {
      stopNatural()
      stopSpeaking()
      setPlaying(false)
      setPreparing(false)
      return
    }
    const text = [lesson.summary, ...lesson.steps].filter((p) => p !== '').join('. ')
    if (text.trim() === '') return
    if (!naturalReady(apiKey) && !speechReady()) return
    setPlaying(true)
    onSignal('voice')
    onMood('laugh')

    // الصوت الطبيعي من جيميني، وإذا ما زبط منرجّع لصوت الجهاز.
    if (naturalReady(apiKey)) {
      setPreparing(true)
      primeVoice()
      let fellBack = false
      const fallback = (): void => {
        if (fellBack) return
        fellBack = true
        setPreparing(false)
        if (!speechReady()) {
          setPlaying(false)
          return
        }
        speak(text, () => setPlaying(false))
      }
      speakNatural(
        { text, apiKey, voice },
        {
          onStart: () => setPreparing(false),
          onEnd: () => {
            setPlaying(false)
            setPreparing(false)
          },
          onError: fallback,
        },
      )
      return
    }

    setPreparing(false)
    speak(text, () => setPlaying(false))
  }

  const revealNext = () => {
    if (revealed >= lesson.hints.length) return
    setRevealed(revealed + 1)
    onSignal('hints')
  }

  const answer = (i: number) => {
    if (chosen !== null) return
    setChosen(i)
    if (i === item.answer) setRight(right + 1)
  }

  const next = () => {
    if (index + 1 < caseTotal) {
      setIndex(index + 1)
      setChosen(null)
      return
    }
    setFinished(true)
    onFinish(lesson.id, right, caseTotal)
  }

  const finishWithoutQuiz = () => {
    setFinished(true)
    onFinish(lesson.id, 0, 0)
  }

  if (finished) {
    return (
      <div className="card celebrate">
        <h2 className="title">برافو! خلصنا الدرس 🎉</h2>
        <p className="note">
          الدرس انحفظ بالأرشيف مع الصفحة — بترجعله وقت ما بدك من تبويب «دروسي»، وبتلاقي فيه نفس الشرح والأسئلة.
        </p>
        <div className="stats">
          <div className="stat">
            <strong>{right}</strong>
            <span>جواب صح ✓</span>
          </div>
          <div className="stat">
            <strong>{caseTotal}</strong>
            <span>أسئلة</span>
          </div>
          <div className="stat">
            <strong>⭐</strong>
            <span>نجمة إلك</span>
          </div>
        </div>
        <button className="primary" type="button" onClick={onBack}>
          رجوع 🗂️
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="lesson-head">
        <button className="back" type="button" onClick={onBack} aria-label="رجوع">
          ‹
        </button>
        <div className="lesson-title">
          <h2 className="title">{lesson.title}</h2>
          <span className="row-sub">
            {lesson.subject} · {prettyDate(lesson.createdAt)} {lesson.done ? '· محلول ✓' : ''}
          </span>
        </div>
      </div>

      {lesson.imageId && (
        <section className="card">
          <div className="row-head">
            <h3 className="small-title">صفحة الدرس 🖼️</h3>
            <button className="ghost slim" type="button" onClick={() => setShowPage(!showPage)}>
              {showPage ? 'خبّيها' : 'شوفها'}
            </button>
          </div>
          {showPage && <Shot id={lesson.imageId} className="preview" alt={`صفحة ${lesson.title}`} />}
        </section>
      )}

      <section className="card">
        <div className="seg" role="tablist" aria-label="طريقة الشرح">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'text'}
            className={`seg-btn ${mode === 'text' ? 'on' : ''}`}
            onClick={() => setMode('text')}
          >
            📖 كتابة
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'voice'}
            className={`seg-btn ${mode === 'voice' ? 'on' : ''}`}
            onClick={() => setMode('voice')}
          >
            🔊 صوت
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'video'}
            className={`seg-btn ${mode === 'video' ? 'on' : ''}`}
            onClick={() => setMode('video')}
          >
            🎬 فيديو
          </button>
        </div>

        {mode === 'text' && (
          <>
            {lesson.summary && <p className="greeting">{lesson.summary}</p>}
            <ol className="steps">
              {lesson.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </>
        )}

        {mode === 'voice' && (
          <div className="voice">
            <button
              className="primary"
              type="button"
              onClick={speakLesson}
              disabled={!naturalReady(apiKey) && !speechReady()}
            >
              {playing ? (preparing ? '⏳ ميلا عم تحضّر صوتها…' : '⏸️ وقّف') : '▶️ اسمع الشرح'}
            </button>
            <p className="note small">
              {naturalReady(apiKey)
                ? 'ميلا بتحكي بصوتها الطبيعي باللهجة الشامية. أول مرة بتاخد كام ثانية لتجهّز الصوت، وبعدها بينحفظ على الجهاز وبيشتغل بلا نت.'
                : speechReady()
                  ? 'ميلا بتحكي بصوت التلفون. ضيف مفتاح جيميني بقسم الأهل لتسمع صوتها الطبيعي.'
                  : 'جهازك ما فيه قارئ صوتي. ضيف مفتاح جيميني بقسم الأهل لتسمع صوت ميلا الطبيعي.'}
            </p>
            <p className="note">{lesson.summary}</p>
          </div>
        )}

        {mode === 'video' && (
          <div className="voice">
            <p className="note">بدك تشوف نفس الدرس مشروح بالحركة؟ ميلا دوّرتلك على فيديو قصير على يوتيوب:</p>
            <a
              className="primary"
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(lesson.videoQuery || `${lesson.subject} ${lesson.title}`)}`}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => onSignal('video')}
            >
              🎬 ابحث عن فيديو
            </a>
            <p className="note small">بيطلع بيوتيوب — ارجع للتطبيق بعد ما تخلص لتكمّل الأسئلة.</p>
          </div>
        )}
      </section>

      {lesson.hints.length > 0 && (
        <section className="card">
          <div className="row-head">
            <h3 className="small-title">تلميحات 💡</h3>
            <span className="pill">
              {revealed}/{lesson.hints.length}
            </span>
          </div>
          <div className="hints">
            {lesson.hints.slice(0, revealed).map((h, i) => (
              <p className="hint" key={i}>
                <span className="hint-num">{i + 1}</span>
                <span>{h}</span>
              </p>
            ))}
          </div>
          {revealed < lesson.hints.length ? (
            <button className="ghost" type="button" onClick={revealNext}>
              {revealed === 0 ? 'ادّيني تلميح 💡' : 'تلميح كمان 💡'}
            </button>
          ) : (
            <p className="note small">هي كل التلميحات — جرّب تحلّ هلق بلا ما تشوف الجواب 😉</p>
          )}
        </section>
      )}

      <section className="card">
        <h3 className="small-title">جرّب حالك ✏️</h3>
        {caseTotal === 0 ? (
          <>
            <p className="note">هالدرس ما فيه أسئلة. بس خلصنا الشرح؟</p>
            <button className="primary" type="button" onClick={finishWithoutQuiz}>
              خلّصه واحفظه ⭐
            </button>
          </>
        ) : (
          <div className="quiz">
            <div className="quiz-head">
              <span className="pill">
                سؤال {index + 1} من {caseTotal}
              </span>
              {chosen !== null && (
                <span className={chosen === item.answer ? 'ok' : 'note small'}>
                  {chosen === item.answer ? 'صح ✓ برافو' : 'قريب! شوف الجواب'}
                </span>
              )}
            </div>
            <p className="question">{item.q}</p>
            <div className="options">
              {item.options.map((opt, i) => {
                const state =
                  chosen === null ? '' : i === item.answer ? 'right' : i === chosen ? 'wrong' : ''
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`option ${state}`}
                    disabled={chosen !== null}
                    onClick={() => answer(i)}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            {chosen !== null && (
              <div className="answer">
                <p className="note">{item.why}</p>
                <button className="primary" type="button" onClick={next}>
                  {index + 1 < caseTotal ? 'السؤال اللي بعده ›' : 'خلّصنا الدرس ⭐'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  )
}
