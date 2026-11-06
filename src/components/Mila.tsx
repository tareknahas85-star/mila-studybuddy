import { useState } from 'react'
import type { Mood } from '../lib/store.ts'

const FACES: Record<Mood, { eyes: string; mouth: string; tint: string }> = {
  idle: { eyes: '•  •', mouth: '‿', tint: '#ffd9a0' },
  think: { eyes: '•  •', mouth: 'o', tint: '#ffe9b8' },
  laugh: { eyes: '^  ^', mouth: 'D', tint: '#ffc9a3' },
  tired: { eyes: '–  –', mouth: '︵', tint: '#e6d3c4' },
  proud: { eyes: '★  ★', mouth: '‿', tint: '#ffe0f0' },
}

export default function Mila({ mood = 'idle', line }: { mood?: Mood; line?: string }) {
  const face = FACES[mood]
  return (
    <div className="mila">
      <div className="mila-bubble" aria-live="polite">
        {line ?? 'أنا ميلا، رفيقتك بالدراسة 🌟'}
      </div>
      <div className="mila-face" style={{ background: face.tint }} aria-hidden="true">
        <span className="mila-eyes">{face.eyes}</span>
        <span className="mila-mouth">{face.mouth}</span>
      </div>
    </div>
  )
}

export function useMilaLine(initial = 'أنا ميلا، رفيقتك بالدراسة 🌟') {
  const [line, setLine] = useState(initial)
  return { line, say: setLine }
}
