// شخصية التطبيق بتتغيّر حسب الصوت اللي بيختاره الأهل:
// صوت بنت = ليلي، وصوت صبي = روي. كل شخصية إلها أفاتار وجملة تعريف.
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

export const PERSONAS: Record<PersonaId, Persona> = {
  lily: {
    id: 'lily',
    name: 'ليلي',
    gender: 'f',
    avatar: lilyAvatar,
    intro: 'أنا ليلي، رفيقتك بالدراسة 🌟',
    sample: 'أهلين! أنا ليلي، رفيقتك بالدراسة. يلا نحلّ سوا ونتعلّم شي جديد اليوم.',
  },
  roy: {
    id: 'roy',
    name: 'روي',
    gender: 'm',
    avatar: royAvatar,
    intro: 'أنا روي، رفيقك بالدراسة 🌟',
    sample: 'أهلين! أنا روي، رفيقك بالدراسة. يلا نحلّ سوا ونتعلّم شي جديد اليوم.',
  },
}

/** شخصية الطالب (الأفاتار والاسم) بتتبع الجنس اللي اختاره وقت التحضير. */
export function personaFor(settings: Pick<Settings, 'gender'>): Persona {
  return settings.gender === 'm' ? PERSONAS.roy : PERSONAS.lily
}

/** الشخصية اللي بتحكي بالصوت المختار: صوت بنت = ليلي، صوت صبي = روي. */
export function voicePersonaFor(voice: string): Persona {
  const group = VOICES.find((v) => v.id === voice)?.group
  return group === 'صبي' ? PERSONAS.roy : PERSONAS.lily
}

/** الصوت الافتراضي حسب الجنس وقت التحضير. */
export function defaultVoiceFor(gender: Gender): string {
  return gender === 'm' ? 'Puck' : 'Sulafat'
}
