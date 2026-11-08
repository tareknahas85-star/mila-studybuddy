import type { Mood } from '../lib/store.ts'
import type { Persona } from '../lib/persona.ts'

interface Props {
  persona: Persona
  mood?: Mood
  line?: string
}

/** أفاتار الشخصية (ليلي أو روي) مع فقاعة كلام ومزاج بيتغيّر حسب الحالة. */
export default function Buddy({ persona, mood = 'idle', line }: Props) {
  const fem = persona.gender === 'f'
  const moods: Record<Mood, { badge: string; ring: string; tilt: string; label: string }> = {
    idle: {
      badge: '💫',
      ring: '#ffd9a0',
      tilt: '0deg',
      label: `${persona.name} ${fem ? 'هادية وعم تستنى' : 'هادي وعم ينتظر'}`,
    },
    think: {
      badge: '💭',
      ring: '#8fb8e6',
      tilt: '-3deg',
      label: `${persona.name} عم ${fem ? 'تفكّر' : 'يفكّر'} معك`,
    },
    laugh: { badge: '🎉', ring: '#ffb3c7', tilt: '3deg', label: `${persona.name} ${fem ? 'مبسوطة' : 'مبسوط'}` },
    tired: { badge: '💙', ring: '#a9c7e8', tilt: '0deg', label: `${persona.name} ${fem ? 'بتطبطب' : 'بيطبطب'} عليك` },
    proud: { badge: '⭐', ring: '#ffd166', tilt: '0deg', label: `${persona.name} ${fem ? 'فخورة' : 'فخور'} فيك` },
  }
  const m = moods[mood]
  return (
    <div className="mila" aria-label={m.label}>
      <div className="mila-bubble" aria-live="polite">
        {line ?? persona.intro}
      </div>
      <div className="mila-avatar" style={{ borderColor: m.ring, transform: `rotate(${m.tilt})` }}>
        <img src={persona.avatar} alt={persona.name} />
        <span className="mila-badge" aria-hidden="true">
          {m.badge}
        </span>
      </div>
    </div>
  )
}
