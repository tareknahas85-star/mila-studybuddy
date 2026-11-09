// شخصية التطبيق: الشكل (أفاتار + جنس) بيتبع الجنس، والاسم بيسمّيه ولي الأمر.
// صوت بنت = شكل ليلي، وصوت صبي = شكل روي — وكل طالب إله اسم شخصية مساعدة خاص فيه.
import type { Gender, Settings } from './store.ts'
import { VOICES } from './tts.ts'
import lilyAvatar from '../assets/lily.jpg'
import royAvatar from '../assets/roy.jpg'

export type PersonaId = 'lily' | 'roy'

export interface Persona {
  id: PersonaId
  name: string
  gender: Gender
  avatar: string
  /** أول جملة بتقولها الشخصية. */
  intro: string
  /** جملة قصيرة لتجربة الصوت من قسم الأهل. */
  sample: string
}

function sampleFor(name: string, gender: Gender): string {
  return `أهلين! أنا ${name}، ${gender === 'f' ? 'رفيقتك' : 'رفيقك'} بالدراسة. يلا نحلّ سوا ونتعلّم شي جديد اليوم.`
}

function introFor(name: string, gender: Gender): string {
  return `أنا ${name}، ${gender === 'f' ? 'رفيقتك' : 'رفيقك'} بالدراسة 🌟`
}

function make(id: PersonaId, name: string, gender: Gender, avatar: string): Persona {
  return { id, name, gender, avatar, intro: introFor(name, gender), sample: sampleFor(name, gender) }
}

export const PERSONAS: Record<PersonaId, Persona> = {
  lily: make('lily', 'ليلي', 'f', lilyAvatar),
  roy: make('roy', 'روي', 'm', royAvatar),
}

/** الاسم الافتراضي للشخصية حسب الجنس (لما ولي الأمر ما يكتب اسم). */
export function defaultAssistantFor(gender: Gender): string {
  return gender === 'm' ? PERSONAS.roy.name : PERSONAS.lily.name
}

function withName(base: Persona, name: string): Persona {
  const clean = name.trim() || base.name
  return { ...base, name: clean, intro: introFor(clean, base.gender), sample: sampleFor(clean, base.gender) }
}

/** شخصية الطالب (الاسم والأفاتار): الاسم من ولي الأمر، والشكل حسب الجنس. */
export function personaFor(settings: Pick<Settings, 'gender' | 'assistantName'>): Persona {
  return withName(settings.gender === 'm' ? PERSONAS.roy : PERSONAS.lily, settings.assistantName)
}

/** الشخصية اللي بتحكي بالصوت المختار: صوت بنت = شكل ليلي، صوت صبي = شكل روي. */
export function voicePersonaFor(voice: string, assistantName = ''): Persona {
  const group = VOICES.find((v) => v.id === voice)?.group
  return withName(group === 'صبي' ? PERSONAS.roy : PERSONAS.lily, assistantName)
}

/** الصوت الافتراضي حسب الجنس وقت التحضير. */
export function defaultVoiceFor(gender: Gender): string {
  return gender === 'm' ? 'Puck' : 'Sulafat'
}
