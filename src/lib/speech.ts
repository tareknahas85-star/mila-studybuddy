// صوت ميلا: بيستعمل صوت الجهاز العربي (Web Speech API) — مجاني وبيشتغل حتى أوفلاين.
// النص نفسه مكتوب بلهجة شامية حنونة من جيميني، والصوت بيرتّله بصوت عربي متوفر على الجهاز.
let active = false

export function speechReady(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function isSpeaking(): boolean {
  return active
}

export function stopSpeaking(): void {
  active = false
  if (speechReady()) window.speechSynthesis.cancel()
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechReady()) return null
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ar'))
  if (voices.length === 0) return null
  // الشامي أولًا، بعدها أي صوت عربي.
  const order = ['ar-sy', 'ar-lb', 'ar-jo', 'ar-ps', 'ar-eg', 'ar-sa', 'ar']
  for (const lang of order) {
    const hit = voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(lang))
    if (hit) return hit
  }
  return voices[0]
}

/** تقسيم النص لجمل قصيرة: بعض محرّكات الصوت بتقطع النص الطويل. */
function chunk(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean === '') return []
  const parts = clean.split(/(?<=[.!؟?\n:])\s+/)
  const out: string[] = []
  let current = ''
  for (const part of parts) {
    if (current.length + part.length > 150 && current !== '') {
      out.push(current.trim())
      current = part
    } else {
      current = current === '' ? part : `${current} ${part}`
    }
  }
  if (current.trim() !== '') out.push(current.trim())
  return out
}

export function speak(text: string, onDone?: () => void): void {
  if (!speechReady()) return
  stopSpeaking()
  const pieces = chunk(text)
  if (pieces.length === 0) return

  const voice = pickVoice()
  const synth = window.speechSynthesis
  active = true

  pieces.forEach((piece, index) => {
    const utter = new SpeechSynthesisUtterance(piece)
    if (voice) utter.voice = voice
    utter.lang = voice?.lang ?? 'ar-SA'
    utter.rate = 0.94
    utter.pitch = 1.15
    utter.volume = 1
    if (index === pieces.length - 1) {
      utter.onend = () => {
        active = false
        onDone?.()
      }
    }
    utter.onerror = () => {
      active = false
      onDone?.()
    }
    synth.speak(utter)
  })
}
