// فحص التحديثات من GitHub Releases (مستودع عام، بلا حساب ولا مفتاح).
// التحديث بينزل كملف APK وبيتثبّت فوق النسخة الموجودة: بيانات الطلاب بتضل لأنو معرّف التطبيق والتوقيع ثابتين.
declare const __APP_VERSION__: string

export const REPO = 'tareknahas85-star/studybuddy'
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'

const KEY = 'sb.update.v1'
const EVERY_MS = 12 * 3600 * 1000

export interface UpdateInfo {
  version: string
  notes: string
  /** رابط تنزيل الـAPK مباشرة. */
  apk: string
  /** صفحة الريليس. */
  page: string
}

interface State {
  checkedAt: number
  info: UpdateInfo | null
  /** النسخة اللي الطالب أو الأهل قالوا "لاحقاً" عنها. */
  later: string
  laterAt: number
}

const parts = (v: string): number[] =>
  v
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0)

export function isNewer(candidate: string, current: string): boolean {
  const a = parts(candidate)
  const b = parts(current)
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { checkedAt: 0, info: null, later: '', laterAt: 0, ...(JSON.parse(raw) as Partial<State>) }
  } catch {
    // تخزين محجوب أو تالف: منبلّش من جديد.
  }
  return { checkedAt: 0, info: null, later: '', laterAt: 0 }
}

function save(s: State): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // ما في شي نعمله.
  }
}

/** إذا في نسخة أحدث وما انأجّلت: بترجّع معلوماتها. بيسأل GitHub مرة كل ١٢ ساعة، أو دايماً مع force. */
export async function checkUpdate(force = false): Promise<{ ok: true; info: UpdateInfo | null } | { ok: false; error: string }> {
  const st = load()
  const fresh = Date.now() - st.checkedAt < EVERY_MS
  if (!force && fresh) return { ok: true, info: visible(st) }
  try {
    const ctl = new AbortController()
    const timer = window.setTimeout(() => ctl.abort(), 9000)
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' }, signal: ctl.signal })
    window.clearTimeout(timer)
    if (!res.ok) throw new Error(`http-${res.status}`)
    const j = (await res.json()) as { tag_name?: string; body?: string; html_url?: string; assets?: Array<{ name?: string; browser_download_url?: string }> }
    const tag = typeof j.tag_name === 'string' ? j.tag_name : ''
    const apk = (j.assets ?? []).find((a) => typeof a.name === 'string' && a.name.endsWith('.apk') && typeof a.browser_download_url === 'string')
    const newer = tag !== '' && !!apk && isNewer(tag, APP_VERSION)
    const info: UpdateInfo | null = newer
      ? { version: tag.replace(/^v/i, ''), notes: (j.body ?? '').slice(0, 1200), apk: apk?.browser_download_url ?? '', page: j.html_url ?? `https://github.com/${REPO}/releases` }
      : null
    const next: State = { ...st, checkedAt: Date.now(), info, ...(force ? { later: '', laterAt: 0 } : {}) }
    save(next)
    return { ok: true, info: visible(next) }
  } catch {
    return { ok: false, error: 'ما قدرنا نفحص التحديثات. تأكد إنو في نت وجرّب مرة تانية.' }
  }
}

/** "لاحقاً" بتخبّي البانر للنسخة نفسها ٣ أيام، ونسخة أحدث بترجّعو. */
function visible(st: State): UpdateInfo | null {
  if (!st.info) return null
  if (st.later === st.info.version && Date.now() - st.laterAt < 3 * 86400000) return null
  return st.info
}

export function updateLater(version: string): void {
  save({ ...load(), later: version, laterAt: Date.now() })
}

/** بيفتح تنزيل الـAPK بمتصفح الجهاز (أندرويد بيعرض التثبيت فوق النسخة الموجودة). */
export function openUpdate(info: UpdateInfo): void {
  window.open(info.apk, '_blank', 'noopener')
}
