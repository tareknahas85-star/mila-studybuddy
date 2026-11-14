// المكافآت: ستيكرات بتنربح بالدروس، وثيمات وإكسسوارات بتنفتح بالنجوم (بلا عقوبات ولا خسارة).
import { COMPS } from './companions.ts'
import type { AccId, CompId } from './companions.ts'
import { currentStreak } from './store.ts'
import type { Progress } from './store.ts'

export type SkinId = 'notebook' | 'ocean' | 'forest' | 'sweets' | 'desert' | 'space' | 'sunset' | 'snow'

export interface Sticker {
  n: string
  bg: string
  shape: 'c' | 'r'
  p: string
}

export const STK: Record<string, Sticker> = {
  star: { n: 'نجمة', bg: '#FFE36E', shape: 'c', p: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" fill="#fff"/>' },
  moon: { n: 'قمر', bg: '#B8A6FF', shape: 'r', p: '<path d="M19 14.5A8 8 0 1 1 9.5 5a6.5 6.5 0 0 0 9.5 9.5z" fill="#fff"/>' },
  rocket: { n: 'صاروخ', bg: '#8FC9FF', shape: 'c', p: '<path d="M12 3c3 2 4.5 5.5 4 10l-4 3-4-3c-.5-4.5 1-8 4-10z" fill="#fff"/><circle cx="12" cy="9.5" r="1.6" fill="#8FC9FF"/><path d="M8 13l-2.5 3 3 .5M16 13l2.5 3-3 .5M10.5 17.5L12 21l1.5-3.5"/>' },
  planet: { n: 'كوكب', bg: '#FF8FA3', shape: 'r', p: '<circle cx="12" cy="12" r="5" fill="#fff"/><path d="M3 15c3-1 15-6 18-8"/>' },
  pizza: { n: 'بيتزا', bg: '#FFB680', shape: 'c', p: '<path d="M12 21L3 6c5.5-3 12.5-3 18 0z" fill="#FFF6D6"/><circle cx="10" cy="9" r="1.3" fill="#2B2A33"/><circle cx="14" cy="12" r="1.3" fill="#2B2A33"/><circle cx="12" cy="15.5" r="1" fill="#2B2A33"/>' },
  apple: { n: 'تفاحة', bg: '#FF8FA3', shape: 'r', p: '<path d="M12 8c-2-2-7-1.5-7 4s3.5 8 5 8c1 0 1.2-.6 2-.6s1 .6 2 .6c1.5 0 5-3 5-8s-5-6-7-4z" fill="#fff"/><path d="M12 8c0-2 1-4 3-5"/>' },
  icecream: { n: 'بوظة', bg: '#9BE3C4', shape: 'c', p: '<path d="M8 11l4 10 4-10z" fill="#FFE9B8"/><path d="M7 11a5 5 0 0 1 10 0z" fill="#fff"/>' },
  cake: { n: 'كاتو', bg: '#B8A6FF', shape: 'r', p: '<rect x="5" y="11" width="14" height="9" rx="1.5" fill="#fff"/><path d="M5 14c2 1.5 4 1.5 7 0s5-1.5 7 0M12 7v4"/><path d="M12 4.5c.8 1 .8 2 0 2.5-.8-.5-.8-1.5 0-2.5z" fill="#FF8FA3"/>' },
  leaf: { n: 'ورقة', bg: '#9BE3C4', shape: 'r', p: '<path d="M5 19C5 10 11 5 19 5c0 8-5 14-14 14z" fill="#fff"/><path d="M5 19l7-7"/>' },
  jasmine: { n: 'ياسمينة', bg: '#FFE36E', shape: 'c', p: '<g fill="#fff"><ellipse cx="12" cy="6.5" rx="2.6" ry="3.6"/><ellipse cx="17.2" cy="10.4" rx="2.6" ry="3.6" transform="rotate(72 17.2 10.4)"/><ellipse cx="15.2" cy="16.6" rx="2.6" ry="3.6" transform="rotate(144 15.2 16.6)"/><ellipse cx="8.8" cy="16.6" rx="2.6" ry="3.6" transform="rotate(216 8.8 16.6)"/><ellipse cx="6.8" cy="10.4" rx="2.6" ry="3.6" transform="rotate(288 6.8 10.4)"/></g><circle cx="12" cy="12" r="2" fill="#FFB680"/>' },
  sun: { n: 'شمس', bg: '#FFB680', shape: 'c', p: '<circle cx="12" cy="12" r="4.5" fill="#FFE36E"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>' },
  drop: { n: 'نقطة مي', bg: '#8FC9FF', shape: 'r', p: '<path d="M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z" fill="#fff"/>' },
}

export const COLLS: Array<{ id: string; n: string; items: string[] }> = [
  { id: 'space', n: 'الفضا', items: ['star', 'moon', 'rocket', 'planet'] },
  { id: 'yum', n: 'طيّبات', items: ['pizza', 'apple', 'icecream', 'cake'] },
  { id: 'nature', n: 'الطبيعة', items: ['leaf', 'jasmine', 'sun', 'drop'] },
  { id: 'ach', n: 'إنجازات', items: ['trophy', 'medal', 'crown', 'heart'] },
]

// ستيكرات الإنجازات: بتنربح بأهداف الأسبوع وبس، مو بالدروس العادية.
Object.assign(STK, {
  trophy: { n: 'كأس', bg: '#FFE36E', shape: 'c', p: '<path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="#fff"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8"/>' },
  medal: { n: 'ميدالية', bg: '#FF8FA3', shape: 'c', p: '<circle cx="12" cy="14.5" r="5" fill="#fff"/><path d="M8 3l3 6M16 3l-3 6"/>' },
  crown: { n: 'تاج', bg: '#B8A6FF', shape: 'r', p: '<path d="M4 18l-1-10 5 4 4-7 4 7 5-4-1 10z" fill="#fff"/>' },
  heart: { n: 'قلب', bg: '#9BE3C4', shape: 'r', p: '<path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20z" fill="#fff"/>' },
} satisfies Record<string, Sticker>)

export const STICKER_TOTAL = COLLS.reduce((a, c) => a + c.items.length, 0)

export function stickerSvg(id: string, size = 60, rot = -8): string {
  const s = STK[id]
  if (!s) return ''
  const outer = s.shape === 'c' ? 'rx="30"' : 'rx="16"'
  const inner = s.shape === 'c' ? 'rx="24"' : 'rx="11"'
  return `<svg role="img" aria-label="ستيكر ${s.n}" width="${size}" height="${size}" viewBox="0 0 64 64" style="transform:rotate(${rot}deg);flex:none"><rect x="3" y="3" width="58" height="58" ${outer} fill="#fff" stroke="#2B2A33" stroke-width="2.5"/><rect x="8" y="8" width="48" height="48" ${inner} fill="${s.bg}"/><g transform="translate(14 14) scale(1.5)" stroke="#2B2A33" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" fill="none">${s.p}</g></svg>`
}

/** أول ستيكر لسا ما انربح، بترتيب المجموعات. إذا خلصوا كلهم بيرجع null. */
export function nextSticker(owned: string[]): string | null {
  for (const c of COLLS) {
    if (c.id === 'ach') continue
    for (const id of c.items) if (!owned.includes(id)) return id
  }
  return null
}

/** ستيكر إنجاز لهدف الأسبوع. */
export function nextAchievement(owned: string[]): string | null {
  const ach = COLLS.find((c) => c.id === 'ach')
  for (const id of ach?.items ?? []) if (!owned.includes(id)) return id
  return null
}

export interface SkinInfo {
  id: SkinId
  n: string
  cost: number
  desk: string
  paper: string
  bars: [string, string, string]
}

export const SKINS: SkinInfo[] = [
  { id: 'notebook', n: 'دفتر المدرسة', cost: 0, desk: '#F4E3C8', paper: '#FFFDF6', bars: ['#FF8FA3', '#FFE36E', '#9BE3C4'] },
  { id: 'ocean', n: 'بحر', cost: 0, desk: '#BFE6F2', paper: '#F2FBFF', bars: ['#5BC0DE', '#FF9F80', '#FFE36E'] },
  { id: 'forest', n: 'غابة', cost: 12, desk: '#D8E7C2', paper: '#FBFAF1', bars: ['#7BC98F', '#8B6A43', '#FFB680'] },
  { id: 'sweets', n: 'حلويات', cost: 30, desk: '#FBD9E8', paper: '#FFF7FB', bars: ['#F7A8C8', '#B8A6FF', '#FFE36E'] },
  { id: 'desert', n: 'صحرا', cost: 55, desk: '#F3D9AE', paper: '#FFF9EE', bars: ['#E8B079', '#FF9F80', '#FFE36E'] },
  { id: 'sunset', n: 'غروب', cost: 85, desk: '#FFC9A8', paper: '#FFF1E6', bars: ['#FF7A59', '#B8A6FF', '#FFE36E'] },
  { id: 'snow', n: 'ثلج', cost: 120, desk: '#DCE9F5', paper: '#F7FBFF', bars: ['#8FC9FF', '#FFFFFF', '#B8A6FF'] },
  { id: 'space', n: 'فضا', cost: 160, desk: '#12142B', paper: '#1E2140', bars: ['#6F5BD6', '#FF8FA3', '#FFE36E'] },
]

export const ACCS: Array<{ id: AccId; n: string; cost: number }> = [
  { id: 'glasses', n: 'نضارة', cost: 6 },
  { id: 'hat', n: 'طاقية', cost: 12 },
  { id: 'scarf', n: 'شال', cost: 20 },
  { id: 'bow', n: 'فيونكة', cost: 35 },
  { id: 'headphones', n: 'سماعات', cost: 60 },
  { id: 'crown', n: 'تاج', cost: 100 },
]

export const ACC_ICON: Record<AccId, string> = {
  glasses: '<circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/><path d="M11 13h2"/>',
  hat: '<path d="M5 19L12 3l7 16z"/><circle cx="12" cy="3" r="1.5"/>',
  scarf: '<path d="M4 8q8 5 16 0v4q-8 5-16 0z"/><path d="M15 12v7l2-1.5 2 1.5v-8"/>',
  bow: '<path d="M12 12l-7-4v8zM12 12l7-4v8z"/><circle cx="12" cy="12" r="1.6"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  crown: '<path d="M4 18l-1-10 5 4 4-7 4 7 5-4-1 10z"/>',
}

/** ألوان كعب الكتاب حسب المادة. */
export const SUBJECT_COLOR: Record<string, string> = {
  رياضيات: '#FF8FA3',
  علوم: '#9BE3C4',
  'لغة عربية': '#B8A6FF',
  إنجليزي: '#8FC9FF',
  اجتماعيات: '#FFB680',
  'تربية إسلامية': '#FFE36E',
}
export const BOOK_COLORS = ['#FF8FA3', '#9BE3C4', '#B8A6FF', '#8FC9FF', '#FFE36E', '#FFB680']

// ---------- فتح الأغراض: بالنجوم (من دروس الكتب بس) أو بالمهمّات ----------
export type ItemKind = 'comp' | 'acc' | 'skin'

/** أسعار الشخصيات بالنجوم الإجمالية. المختارة حالياً ما بتنقفل أبداً (حتى لو من نسخة قديمة). */
export const COMP_COST: Record<CompId, number> = {
  buddy: 0,
  yasmina: 0,
  turtle: 8,
  robo: 25,
  fanous: 45,
  cat: 70,
  bunny: 100,
  panda: 140,
  dino: 180,
  owl: 240,
}

export function isUnlocked(p: Progress, kind: ItemKind, id: string, cost: number): boolean {
  return cost === 0 || p.stars >= cost || p.unlocked.includes(`${kind}:${id}`)
}

interface Item {
  kind: ItemKind
  id: string
  name: string
  cost: number
}

export const ALL_ITEMS: Item[] = [
  ...(Object.keys(COMP_COST) as CompId[]).map((id) => ({ kind: 'comp' as const, id, name: COMPS[id].name, cost: COMP_COST[id] })),
  ...ACCS.map((a) => ({ kind: 'acc' as const, id: a.id as string, name: a.n, cost: a.cost })),
  ...SKINS.map((s) => ({ kind: 'skin' as const, id: s.id as string, name: `ثيم ${s.n}`, cost: s.cost })),
]

export function itemName(ref: string): string {
  const [kind, id] = ref.split(':')
  return ALL_ITEMS.find((i) => i.kind === kind && i.id === id)?.name ?? ref
}

/** أقرب غرض مقفول بالنجوم: "باقي ٣ نجوم لتفتح القطة". */
export function nextUnlock(p: Progress): { name: string; left: number } | null {
  let best: Item | null = null
  for (const i of ALL_ITEMS) {
    if (isUnlocked(p, i.kind, i.id, i.cost)) continue
    if (best === null || i.cost < best.cost) best = i
  }
  return best ? { name: best.name, left: best.cost - p.stars } : null
}

export const LEVELS: Array<{ at: number; name: string }> = [
  { at: 0, name: 'مبتدئ' },
  { at: 8, name: 'مستكشف' },
  { at: 25, name: 'مجتهد' },
  { at: 45, name: 'بطل' },
  { at: 70, name: 'نجم' },
  { at: 100, name: 'عبقري' },
  { at: 140, name: 'أسطورة' },
  { at: 180, name: 'ملك الدروس' },
  { at: 240, name: 'حكيم' },
]

export function levelOf(stars: number): { level: number; name: string; next: number | null } {
  let idx = 0
  LEVELS.forEach((l, i) => {
    if (stars >= l.at) idx = i
  })
  return { level: idx + 1, name: LEVELS[idx].name, next: LEVELS[idx + 1]?.at ?? null }
}

// ---------- المهمّات: مراحل، كل مرحلة أصعب، وجايزتها غرض لرفيقك ----------
export interface Mission {
  id: string
  n: string
  unit: string
  stages: Array<{ target: number; reward: string }>
}

export const MISSIONS: Mission[] = [
  { id: 'streak', n: 'سلسلة الأيام', unit: 'يوم متتالي', stages: [{ target: 3, reward: 'acc:bow' }, { target: 7, reward: 'skin:sunset' }, { target: 14, reward: 'comp:cat' }] },
  { id: 'perfect', n: 'بلا غلط', unit: 'درس بلا غلط', stages: [{ target: 1, reward: 'acc:glasses' }, { target: 5, reward: 'acc:headphones' }, { target: 15, reward: 'comp:panda' }] },
  { id: 'lessons', n: 'ماراثون الدروس', unit: 'درس', stages: [{ target: 5, reward: 'skin:forest' }, { target: 20, reward: 'acc:crown' }, { target: 50, reward: 'comp:dino' }] },
  { id: 'review', n: 'حافظ الذاكرة', unit: 'سؤال انحفظ', stages: [{ target: 3, reward: 'acc:hat' }, { target: 10, reward: 'skin:snow' }, { target: 25, reward: 'comp:bunny' }] },
  { id: 'teach', n: 'معلّم صغير', unit: 'شرح ناجح', stages: [{ target: 3, reward: 'acc:scarf' }, { target: 10, reward: 'comp:fanous' }, { target: 25, reward: 'skin:space' }] },
  { id: 'reader', n: 'قارئ شاطر', unit: 'قراءة ناجحة', stages: [{ target: 3, reward: 'comp:robo' }, { target: 10, reward: 'skin:desert' }, { target: 25, reward: 'comp:owl' }] },
]

export function metricValue(id: string, p: Progress): number {
  switch (id) {
    case 'streak':
      return currentStreak(p)
    case 'lessons':
      return p.lessonsDone
    default:
      return p.counts[id] ?? 0
  }
}

/** بيفتح أي مرحلة وصلها الطالب. بيرجّع التقدم المحدّث + المراحل الجديدة (للإعلان). */
export function claimMissions(p: Progress): { progress: Progress; fresh: Array<{ mission: string; reward: string }> } {
  const claimed = [...p.claimed]
  const unlocked = [...p.unlocked]
  const fresh: Array<{ mission: string; reward: string }> = []
  for (const m of MISSIONS) {
    const v = metricValue(m.id, p)
    m.stages.forEach((s, i) => {
      const key = `${m.id}:${i}`
      if (!claimed.includes(key) && v >= s.target) {
        claimed.push(key)
        if (!unlocked.includes(s.reward)) unlocked.push(s.reward)
        fresh.push({ mission: m.n, reward: s.reward })
      }
    })
  }
  return fresh.length === 0 ? { progress: p, fresh } : { progress: { ...p, claimed, unlocked }, fresh }
}