// صوت الدراسة: على التلفون بيستعمل قارئ أندرويد الأصلي (عربي وأوفلاين)،
// وعلى المتصفح بيستعمل Web Speech API. النص نفسه شامي حنون من جيميني.
import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'

let active = false
let watchdog: number | null = null

const isNative = (): boolean => Capacitor.isNativePlatform()
const hasWebSpeech = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window

export function speechReady(): boolean {
  return isNative() || hasWebSpeech()
}

export function isSpeaking(): boolean {
  return active
}

function clearWatchdog(): void {
  if (watchdog !== null) {
    window.clearTimeout(watchdog)
    watchdog = null
  }
}

export function stopSpeaking(): void {
  active = false
  clearWatchdog()
  if (isNative()) {
    void TextToSpeech.stop().catch(() => undefined)
    return
  }
  if (hasWebSpeech()) window.speechSynthesis.cancel()
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!hasWebSpeech()) return null
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

/** قارئ أندرويد الأصلي: بيشتغل على التلفون حتى بلا إنترنت. */
async function speakNative(text: string, onDone?: () => void): Promise<void> {
  active = true
  try {
    const languages = await TextToSpeech.getSupportedLanguages().catch(() => ({ languages: [] }))
    const lang = languages.languages.find((l) => l.toLowerCase().startsWith('ar')) ?? 'ar-SA'
    const voices = await TextToSpeech.getSupportedVoices().catch(() => ({ voices: [] }))
    const arabic = voices.voices.findIndex((v) => (v.lang ?? '').toLowerCase().startsWith('ar'))
    await TextToSpeech.stop().catch(() => undefined)
    await TextToSpeech.speak({
      text,
      lang,
      rate: 0.95,
      pitch: 1,
      volume: 1,
      ...(arabic >= 0 ? { voice: arabic } : {}),
      category: 'ambient',
    })
  } catch {
    // ما في قارئ على الجهاز: منكمّل بلا صوت وما بنعلّق الواجهة.
  }
  active = false
  onDone?.()
}

export function speak(text: string, onDone?: () => void): void {
  const pieces = chunk(text)
  if (pieces.length === 0) {
    onDone?.()
    return
  }

  if (isNative()) {
    stopSpeaking()
    void speakNative(pieces.join(' '), onDone)
    return
  }

  if (!hasWebSpeech()) {
    onDone?.()
    return
  }

  stopSpeaking()
  const voice = pickVoice()
  const synth = window.speechSynthesis
  active = true
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    active = false
    clearWatchdog()
    onDone?.()
  }

  pieces.forEach((piece, index) => {
    const utter = new SpeechSynthesisUtterance(piece)
    if (voice) utter.voice = voice
    utter.lang = voice?.lang ?? 'ar-SA'
    utter.rate = 0.94
    utter.pitch = 1
    utter.volume = 1
    utter.onerror = finish
    if (index === pieces.length - 1) utter.onend = finish
    synth.speak(utter)
  })

  // إذا المتصفح ما لقى صوت يقرا فيه، الشرح بيضل ساكت — فمنرجّع الزر لحالته.
  clearWatchdog()
  watchdog = window.setTimeout(() => {
    if (!synth.speaking && !synth.pending) finish()
  }, 2500)
}
