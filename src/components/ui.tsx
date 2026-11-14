import { useEffect, useState, type ReactNode } from 'react'
import { companionSvg } from '../lib/companions.ts'
import type { Acc, CompId, CompMood } from '../lib/companions.ts'
import { stickerSvg } from '../lib/rewards.ts'
import lilyAvatar from '../assets/lily.jpg'
import royAvatar from '../assets/roy.jpg'

/** أرقام عربية-هندية للعرض. */
export const AR = (n: number | string): string => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

const ICONS = {
  star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  back: '<path d="M9 6l6 6-6 6"/>',
  fwd: '<path d="M15 6l-6 6 6 6"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
  album: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="10" cy="10" r="2.5"/><path d="M14 15l2-2 2 2M8 16h4"/>',
  cards: '<rect x="3" y="6" width="10" height="14" rx="2"/><path d="M9 4h10a2 2 0 0 1 2 2v12"/>',
  speaker: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  brush: '<path d="M14 4l6 6-8 8H6v-6z"/><path d="M4 20h4"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5a4.5 4.5 0 0 1 0 9.5z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14q4 4 8 0M9 9.5h.01M15 9.5h.01"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  del: '<path d="M20 6H9l-5 6 5 6h11z"/><path d="M13 10l4 4M17 10l-4 4"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
} as const

export type IconName = keyof typeof ICONS

export function Icon({
  name,
  size = 22,
  sw = 2.2,
  fill = 'none',
  stroke = 'currentColor',
}: {
  name: IconName
  size?: number
  sw?: number
  fill?: string
  stroke?: string
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}

/** الرفيق (SVG مرسوم من ثوابت، مو من إدخال المستخدم). */
export function Companion({
  id,
  mood = 'happy',
  size = 110,
  cls = 'idle',
  acc,
}: {
  id: CompId
  mood?: CompMood
  size?: number
  cls?: string
  acc?: Acc
}) {
  return <span className="svgwrap" dangerouslySetInnerHTML={{ __html: companionSvg(id, mood, size, cls, acc ?? {}) }} />
}

export function Sticker({ id, size = 60, rot = -8 }: { id: string; size?: number; rot?: number }) {
  return <span className="svgwrap" dangerouslySetInnerHTML={{ __html: stickerSvg(id, size, rot) }} />
}

const AV_COLORS: Record<string, string> = { a: '#FFE36E', b: '#9BE3C4', c: '#8FC9FF', d: '#B8A6FF' }
export const AVATAR_KEYS = ['lily', 'roy', 'a', 'b', 'c', 'd']

/** صورة الطالب: صورة مدمجة (ليلي/روي) أو حرف ملوّن. */
export function Avatar({ av, name, className = 'av' }: { av: string; name: string; className?: string }) {
  if (av.startsWith('data:image/')) {
    return <img className={className} src={av} alt="" />
  }
  if (av === 'lily' || av === 'roy') {
    return <img className={className} src={av === 'lily' ? lilyAvatar : royAvatar} alt="" />
  }
  return (
    <span className={className} style={{ background: AV_COLORS[av] ?? '#FFE36E' }} aria-hidden="true">
      {name.trim().charAt(0) || '؟'}
    </span>
  )
}

export function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div
      className="sheet-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet paper" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

export type PinResult = { ok: true } | { ok: false; msg: string }

/** لوحة أرقام للرمز: ٤ لـ ٦ أرقام. */
export function PinPad({
  title,
  sub,
  onSubmit,
  onClose,
  onForgot,
}: {
  title: string
  sub?: string
  onSubmit: (pin: string) => Promise<PinResult>
  onClose: () => void
  onForgot?: () => void
}) {
  const [buf, setBuf] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const press = async (k: string) => {
    if (busy) return
    if (k === 'del') {
      setBuf((b) => b.slice(0, -1))
      return
    }
    if (k === 'ok') {
      if (buf.length < 4) {
        setMsg('الرمز لازم يكون ٤ أرقام على الأقل')
        return
      }
      setBusy(true)
      const r = await onSubmit(buf)
      setBusy(false)
      if (!r.ok) {
        setBuf('')
        setMsg(r.msg)
      }
      return
    }
    if (buf.length < 6) {
      setBuf(buf + k)
      setMsg('')
    }
  }

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) void press(e.key)
      else if (e.key === 'Backspace') void press('del')
      else if (e.key === 'Enter') void press('ok')
    }
    document.addEventListener('keydown', kd)
    return () => document.removeEventListener('keydown', kd)
  })

  const n = Math.max(4, buf.length)
  return (
    <Sheet onClose={onClose} label={title}>
      <h2 className="display">{title}</h2>
      {sub && <p className="muted bold" style={{ margin: 0 }}>{sub}</p>}
      <div className="pin-dots" role="img" aria-label={`${AR(buf.length)} أرقام مدخلة`}>
        {Array.from({ length: n }, (_, i) => (
          <i key={i} className={i < buf.length ? 'on' : ''} />
        ))}
      </div>
      <div className="pin-msg" aria-live="polite">{msg}</div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button type="button" className="key" key={k} onClick={() => void press(k)}>
            {k}
          </button>
        ))}
        <button type="button" className="key" aria-label="مسح" onClick={() => void press('del')}>
          <Icon name="del" size={26} />
        </button>
        <button type="button" className="key" onClick={() => void press('0')}>
          0
        </button>
        <button type="button" className="key ok" aria-label="تأكيد" onClick={() => void press('ok')}>
          <Icon name="check" size={28} sw={3} />
        </button>
      </div>
      {onForgot && (
        <button type="button" className="btn ghost small" onClick={onForgot}>
          نسيت الرمز؟
        </button>
      )}
    </Sheet>
  )
}

export function dayLabel(key: string): string {
  const names = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
  return names[new Date(`${key}T12:00:00`).getDay()]
}
