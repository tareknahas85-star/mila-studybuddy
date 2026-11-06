import avatar from '../assets/mila-face.jpg'
import type { Mood } from '../lib/store.ts'

const MOODS: Record<Mood, { badge: string; ring: string; tilt: string; label: string }> = {
  idle: { badge: '💫', ring: '#ffd9a0', tilt: '0deg', label: 'ميلا هادية وعم تستنى' },
  think: { badge: '💭', ring: '#8fb8e6', tilt: '-3deg', label: 'ميلا عم تفكّر معك' },
  laugh: { badge: '🎉', ring: '#ffb3c7', tilt: '3deg', label: 'ميلا مبسوطة' },
  tired: { badge: '💙', ring: '#a9c7e8', tilt: '0deg', label: 'ميلا بتطبطب عليك' },
  proud: { badge: '⭐', ring: '#ffd166', tilt: '0deg', label: 'ميلا فخورة فيك' },
}

/** ميلا: نفس أفاتار الموقع الأول، وبتتغيّر نظرتها/لون إطارها حسب الحالة. */
export default function Mila({ mood = 'idle', line }: { mood?: Mood; line?: string }) {
  const m = MOODS[mood]
  return (
    <div className="mila" aria-label={m.label}>
      <div className="mila-bubble" aria-live="polite">
        {line ?? 'أنا ميلا، رفيقتك بالدراسة 🌟'}
      </div>
      <div className="mila-avatar" style={{ borderColor: m.ring, transform: `rotate(${m.tilt})` }}>
        <img src={avatar} alt="ميلا" />
        <span className="mila-badge" aria-hidden="true">
          {m.badge}
        </span>
      </div>
    </div>
  )
}
