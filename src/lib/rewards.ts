// المكافآت: ستيكرات بتنربح بالدروس، وثيمات وإكسسوارات بتنفتح بالنجوم (بلا عقوبات ولا خسارة).
import type { AccId } from './companions.ts'

export type SkinId = 'notebook' | 'ocean' | 'forest' | 'sweets' | 'desert' | 'space'

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
]

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
  for (const c of COLLS) for (const id of c.items) if (!owned.includes(id)) return id
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
  { id: 'forest', n: 'غابة', cost: 0, desk: '#D8E7C2', paper: '#FBFAF1', bars: ['#7BC98F', '#8B6A43', '#FFB680'] },
  { id: 'sweets', n: 'حلويات', cost: 10, desk: '#FBD9E8', paper: '#FFF7FB', bars: ['#F7A8C8', '#B8A6FF', '#FFE36E'] },
  { id: 'desert', n: 'صحرا', cost: 16, desk: '#F3D9AE', paper: '#FFF9EE', bars: ['#E8B079', '#FF9F80', '#FFE36E'] },
  { id: 'space', n: 'فضا', cost: 24, desk: '#12142B', paper: '#1E2140', bars: ['#6F5BD6', '#FF8FA3', '#FFE36E'] },
]

export const ACCS: Array<{ id: AccId; n: string; cost: number }> = [
  { id: 'glasses', n: 'نضارة', cost: 4 },
  { id: 'hat', n: 'طاقية', cost: 8 },
  { id: 'scarf', n: 'شال', cost: 12 },
]

export const ACC_ICON: Record<AccId, string> = {
  glasses: '<circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/><path d="M11 13h2"/>',
  hat: '<path d="M5 19L12 3l7 16z"/><circle cx="12" cy="3" r="1.5"/>',
  scarf: '<path d="M4 8q8 5 16 0v4q-8 5-16 0z"/><path d="M15 12v7l2-1.5 2 1.5v-8"/>',
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
