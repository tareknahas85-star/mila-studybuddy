import { useEffect, useState } from 'react'
import { speak, speechReady, stopSpeaking } from '../lib/speech.ts'
import { naturalReady, primeVoice, speakNatural, stopNatural } from '../lib/tts.ts'
import { Icon } from './ui.tsx'

/** زر السماع: صوت الرفيق الطبيعي (جيميني) أو صوت الجهاز. */
export default function SpeakButton({
  text,
  apiKey,
  voice,
  name,
  onPlay,
}: {
  text: string
  apiKey: string
  voice: string
  name: string
  onPlay: () => void
}) {
  const [playing, setPlaying] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [note, setNote] = useState('')
  const [offer, setOffer] = useState(false)

  useEffect(
    () => () => {
      stopSpeaking()
      stopNatural()
    },
    [],
  )

  if (!naturalReady(apiKey) && !speechReady()) return null

  const toggle = () => {
    if (playing) {
      stopNatural()
      stopSpeaking()
      setPlaying(false)
      setPreparing(false)
      return
    }
    if (text.trim() === '') return
    setNote('')
    setOffer(false)
    setPlaying(true)
    onPlay()
    if (naturalReady(apiKey)) {
      setPreparing(true)
      primeVoice()
      let failed = false
      speakNatural(
        { text, apiKey, voice },
        {
          onStart: () => setPreparing(false),
          onEnd: () => {
            setPlaying(false)
            setPreparing(false)
          },
          onError: () => {
            if (failed) return
            failed = true
            setPreparing(false)
            setPlaying(false)
            setOffer(speechReady())
            setNote(`صوت ${name} الطبيعي ما كان جاهز هلق. جرّب مرة تانية، أو اسمع بصوت الجهاز.`)
          },
        },
      )
      return
    }
    speak(text, () => setPlaying(false))
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <button type="button" className="btn small" onClick={toggle} aria-pressed={playing}>
        <Icon name={playing ? 'stop' : 'speaker'} size={20} />
        {playing ? (preparing ? 'عم يحضّر صوتو…' : 'وقّف') : `اسمع ${name}`}
      </button>
      {offer && (
        <button
          type="button"
          className="btn ghost small"
          onClick={() => {
            setOffer(false)
            setNote('')
            setPlaying(true)
            speak(text, () => setPlaying(false))
          }}
        >
          اسمع بصوت الجهاز
        </button>
      )}
      {note && <p className="muted" style={{ margin: 0, fontSize: 14 }}>{note}</p>}
    </div>
  )
}
