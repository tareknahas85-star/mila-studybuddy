import { useEffect, useRef, useState } from 'react'
import { chatTurn } from '../lib/ai.ts'
import type { ChatMsg } from '../lib/ai.ts'
import { blobToWavBase64, startRecording } from '../lib/audio.ts'
import type { Recording } from '../lib/audio.ts'
import { COMPS } from '../lib/companions.ts'
import type { Lesson, Memory, Student } from '../lib/store.ts'
import SpeakButton from './SpeakButton.tsx'
import { Companion, Icon, Sheet } from './ui.tsx'

/** نقاش مباشر مع الرفيق عن الدرس: الطالب بيكتب أو بيبعت رسالة صوتية، والرفيق بيسأل وبيلمّح. */
export default function LessonChat({
  student,
  memory,
  lesson,
  apiKey,
  onClose,
  onVoiceUse,
}: {
  student: Student
  memory: Memory
  lesson: Lesson
  apiKey: string
  onClose: () => void
  onVoiceUse: () => void
}) {
  const comp = COMPS[student.comp]
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ role: 'buddy', text: `خلّينا نحكي عن «${lesson.title}». شو أكتر شي مو واضح إلك؟ أو احكيلي شو فهمت.` }])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [rec, setRec] = useState(false)
  const [err, setErr] = useState('')
  const recRef = useRef<Recording | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [msgs, busy])
  useEffect(() => () => recRef.current?.cancel(), [])

  const ctx = { title: lesson.title, summary: lesson.summary, steps: lesson.steps }
  const settings = { grade: student.grade, comp: student.comp, name: student.name }

  const send = async (t: string) => {
    const clean = t.trim()
    if (clean === '' || busy) return
    setErr('')
    setText('')
    const next: ChatMsg[] = [...msgs, { role: 'me', text: clean }]
    setMsgs(next)
    setBusy(true)
    const r = await chatTurn({ apiKey, settings, memory, lesson: ctx, history: msgs, text: clean })
    setBusy(false)
    if (!r.ok) {
      setErr(r.error)
      return
    }
    setMsgs([...next, { role: 'buddy', text: r.data.reply }])
  }

  const startVoice = async () => {
    if (busy || rec) return
    setErr('')
    const r = await startRecording()
    if (!r.ok) {
      setErr(r.error)
      return
    }
    recRef.current = r.rec
    setRec(true)
  }

  const stopVoice = async () => {
    const r = recRef.current
    recRef.current = null
    setRec(false)
    if (!r) return
    setBusy(true)
    onVoiceUse()
    try {
      const wav = await blobToWavBase64(await r.stop())
      const res = await chatTurn({ apiKey, settings, memory, lesson: ctx, history: msgs, audioBase64: wav, mime: 'audio/wav' })
      if (!res.ok) {
        setErr(res.error)
        return
      }
      setMsgs([...msgs, { role: 'me', text: res.data.heard !== '' ? res.data.heard : '(رسالة صوتية)' }, { role: 'buddy', text: res.data.reply }])
    } catch {
      setErr('ما قدرنا نعالج التسجيل. جرّب مرة تانية.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose} label={`نقاش مع ${comp.name}`}>
      <div className="row">
        <Companion id={student.comp} acc={student.acc} size={56} mood={busy ? 'think' : 'happy'} />
        <h2 className="display grow">ناقش {comp.name}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="سكّر">
          <Icon name="back" size={22} sw={2.6} />
        </button>
      </div>
      <div className="chat-log" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.text}</div>
            {m.role === 'buddy' && i > 0 && (
              <SpeakButton text={m.text} apiKey={apiKey} voice={student.voice} name={comp.name} onPlay={onVoiceUse} />
            )}
          </div>
        ))}
        {busy && (
          <div className="msg buddy">
            <div className="bubble">عم فكّر…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          void send(text)
        }}
      >
        <input className="input grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب…" maxLength={300} aria-label="رسالتك" disabled={rec} />
        {rec ? (
          <button type="button" className="btn accent" onClick={() => void stopVoice()}>
            <Icon name="stop" size={22} /> خلّصت
          </button>
        ) : (
          <>
            <button type="button" className="icon-btn" onClick={() => void startVoice()} aria-label="رسالة صوتية" disabled={busy}>
              <Icon name="mic" size={22} sw={2.2} />
            </button>
            <button type="submit" className="btn yellow" disabled={busy || text.trim() === ''}>
              ابعت
            </button>
          </>
        )}
      </form>
    </Sheet>
  )
}
