// رفقاء الدراسة: خمس شخصيات مرسومة بـSVG، كل وحدة إلها شكل وتعابير وطبع بيغيّر طريقة كلامها.
// الطالب بيختار رفيقه، وصور الطلاب (ليلي/روي...) هي أفاتار الطالب نفسه مو الرفيق.
export type CompId = 'buddy' | 'yasmina' | 'fanous' | 'robo' | 'turtle'
export type CompMood = 'happy' | 'think' | 'wow' | 'cheer'
export type AccId = 'glasses' | 'hat' | 'scarf'
export type Acc = Partial<Record<AccId, boolean>>

const INK = '#2B2A33'

export interface Lines {
  hi: (name: string) => string
  back: (name: string, lesson: string) => string
  retry: string
  win: string
  rest: string
}

export interface CompMeta {
  id: CompId
  name: string
  tag: string
  desc: string
  /** جنس الرفيق نفسه (للمتكلّم بالبرومبت)، مو جنس الطالب. */
  gender: 'm' | 'f'
  /** الصوت الافتراضي من مكتبة جوجل. */
  voice: string
  /** طبعه بجملة وحدة، بتروح لجيميني. */
  trait: string
  lines: Lines
  cx: number
  ey: number
  my: number
  dx: number
  cdx: number
  top: number
  neck: number
  sw: number
  body: (m: CompMood) => string
}

function face(m: CompMood, cx: number, ey: number, my: number, dx: number, cdx: number): string {
  const L = cx - dx
  const R = cx + dx
  let eyes: string
  if (m === 'cheer') {
    eyes = `<path d="M${L - 7} ${ey + 1}q7-9 14 0M${R - 7} ${ey + 1}q7-9 14 0" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`
  } else {
    const px = m === 'think' ? 2 : 1
    const py = m === 'think' ? -5 : 1.5
    eyes = [L, R]
      .map(
        (x) =>
          `<g class="eye"><ellipse cx="${x}" cy="${ey}" rx="6.5" ry="8" fill="#fff" stroke="${INK}" stroke-width="2.5"/><circle cx="${x + px}" cy="${ey + py}" r="3.6" fill="${INK}"/><circle cx="${x + px + 1.3}" cy="${ey + py - 1.5}" r="1.2" fill="#fff"/></g>`,
      )
      .join('')
  }
  const mouths: Record<CompMood, string> = {
    happy: `<path d="M${cx - 9} ${my}q9 8 18 0" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
    think: `<path d="M${cx - 7} ${my + 2}h14" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
    wow: `<ellipse cx="${cx}" cy="${my + 2}" rx="5" ry="6.5" fill="${INK}"/>`,
    cheer: `<path d="M${cx - 11} ${my - 3}q11 15 22 0z" fill="${INK}"/><path d="M${cx - 6} ${my + 4}q6 4 12 0" fill="#FF8FA3"/>`,
  }
  return `${eyes}<circle cx="${cx - cdx}" cy="${ey + 12}" r="4.2" fill="#FF8FA3" opacity=".7"/><circle cx="${cx + cdx}" cy="${ey + 12}" r="4.2" fill="#FF8FA3" opacity=".7"/>${mouths[m]}`
}

function arms(m: CompMood, lx: number, rx: number, y: number, col: string = INK): string {
  const s = `fill="none" stroke="${col}" stroke-width="3.6" stroke-linecap="round"`
  if (m === 'cheer') return `<path d="M${lx} ${y}Q${lx - 12} ${y - 12} ${lx - 9} ${y - 24}M${rx} ${y}q12-12 9-24" ${s}/>`
  if (m === 'think')
    return `<path d="M${lx} ${y + 6}q-9 6-6 14M${rx} ${y + 6}q8-6 3-15" ${s}/><circle cx="${rx + 2}" cy="${y - 11}" r="3.3" fill="${col}"/>`
  return `<path d="M${lx} ${y + 6}q-10 4-9 14M${rx} ${y + 6}q10 4 9 14" ${s}/>`
}

const thinkDots = `<g fill="${INK}"><circle cx="80" cy="12" r="2.6"/><circle cx="88" cy="7" r="3.2"/><circle cx="97" cy="3" r="3.8"/></g>`

export const COMPS: Record<CompId, CompMeta> = {
  buddy: {
    id: 'buddy',
    name: 'بودي',
    tag: 'حماسي',
    desc: 'كتاب صغير، بينط وبيهيّص',
    gender: 'm',
    voice: 'Puck',
    trait: 'حماسي ومرح، بيحب التشجيع والتصفيق، وجمله قصيرة وخفيفة',
    lines: {
      hi: (n) => `أهلين ${n}! أنا بودي، رفيقك بالدراسة. اختار كتاب من الرف ويلا نبلّش!`,
      back: (_n, l) => `رجعت! وقفنا عند ${l}. يلا نكمّل!`,
      retry: 'ولا يهمك، جرّب كمان مرة!',
      win: 'برافو عليك!',
      rest: 'برافو! خلّصنا لليوم. ريّح شوي، وبكرا عندي إلك مفاجأة.',
    },
    cx: 50, ey: 45, my: 62, dx: 12, cdx: 20, top: 20, neck: 86, sw: 28,
    body: (m) =>
      `${arms(m, 18, 82, 52)}<path d="M38 92v12M62 92v12" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><path d="M33 104h9M57 104h9" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><rect x="18" y="20" width="64" height="74" rx="9" fill="#FFB680" stroke="${INK}" stroke-width="3"/><rect x="18" y="20" width="12" height="74" rx="5" fill="#FF8FA3" stroke="${INK}" stroke-width="3"/><path d="M82 28v60" stroke="#fff" stroke-width="3" stroke-dasharray="1 5" stroke-linecap="round"/><rect x="44" y="8" width="13" height="16" rx="2" fill="#FFE36E" stroke="${INK}" stroke-width="2.5"/>`,
  },
  yasmina: {
    id: 'yasmina',
    name: 'ياسمينة',
    tag: 'هادية وحنونة',
    desc: 'زهرة ياسمين، بتشرح على مهلها',
    gender: 'f',
    voice: 'Sulafat',
    trait: 'هادية وحنونة وصبورة، بتطمّن الطالب إذا غلط وبتشرح على مهلها',
    lines: {
      hi: (n) => `مرحبا ${n}. أنا ياسمينة. خد وقتك، واختار الكتاب اللي بتحبه.`,
      back: (n, l) => `نورت يا ${n}. منكمّل ${l} على مهلنا.`,
      retry: 'على مهلك، خد نفس وجرّب مرة تانية.',
      win: 'هيك بتزهر الأفكار!',
      rest: 'يكفي لليوم. ريّح، وبكرا منزهّر كمان.',
    },
    cx: 50, ey: 42, my: 54, dx: 9, cdx: 15, top: 8, neck: 66, sw: 15,
    body: () =>
      `<path d="M50 70V104" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><path d="M50 94c-15 0-24-8-24-19 13 0 23 7 24 19z" fill="#9BE3C4" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M50 100c13 0 22-7 22-17-12 0-21 6-22 17z" fill="#9BE3C4" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${[0, 72, 144, 216, 288]
        .map((r) => `<ellipse cx="50" cy="25" rx="13" ry="17" transform="rotate(${r} 50 44)" fill="#fff" stroke="${INK}" stroke-width="3"/>`)
        .join('')}<circle cx="50" cy="44" r="21" fill="#FFF3C4" stroke="${INK}" stroke-width="3"/>`,
  },
  fanous: {
    id: 'fanous',
    name: 'فانوس',
    tag: 'فضولي',
    desc: 'فانوس مضوّي، بيحب الأسئلة',
    gender: 'm',
    voice: 'Achird',
    trait: 'فضولي، بيسأل "ليش؟" وبيحب القصص والمفاجآت، وبيشجّع الطالب يكتشف الجواب',
    lines: {
      hi: (n) => `أهلين ${n}! أنا فانوس. شو بدنا نكتشف اليوم؟ اختار كتاب!`,
      back: (_n, l) => `رجعت! بدي أعرف شو رح نكتشف بـ${l}.`,
      retry: 'غريبة! ليش فكّرت هيك؟ جرّب من زاوية تانية.',
      win: 'اكتشفتها!',
      rest: 'كفّينا اكتشافات لليوم. بكرا في سؤال غريب بينتظرك!',
    },
    cx: 50, ey: 52, my: 66, dx: 12, cdx: 19, top: 10, neck: 84, sw: 20,
    body: (m) =>
      `${arms(m, 27, 73, 58)}<path d="M38 24Q50 -4 62 24" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><path d="M30 28h40l-5-9H35z" fill="#FF8FA3" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M30 28h40c4 14 6 28 4 44-1 8-6 12-12 12H38c-6 0-11-4-12-12-2-16 0-30 4-44z" fill="#FFE9A0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle class="glow" cx="50" cy="57" r="25" fill="#FFF8D0"/><path d="M41 28c-3 14-4 40-2 56M59 28c3 14 4 40 2 56" stroke="${INK}" stroke-width="2.2" fill="none" opacity=".35"/><path d="M34 84h32l-3 9H37z" fill="#FF8FA3" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M50 93v9" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><circle cx="50" cy="105" r="3.4" fill="#FFE36E" stroke="${INK}" stroke-width="2.4"/>`,
  },
  robo: {
    id: 'robo',
    name: 'روبو',
    tag: 'منظّم',
    desc: 'روبوت صغير، بيحب الخطوات',
    gender: 'm',
    voice: 'Puck',
    trait: 'منظّم وواضح، بيحب الخطوات المرقّمة والتعليمات القصيرة، وبيحكي بأسلوب روبوت لطيف',
    lines: {
      hi: (n) => `تشغيل... أهلا ${n}. أنا روبو. الخطوة الأولى: اختار كتاب من الرف.`,
      back: (_n, l) => `استئناف: ${l}. جاهز؟`,
      retry: 'الخطوة مو صح. أعد المحاولة.',
      win: 'تنفيذ ناجح!',
      rest: 'انتهى وقت التشغيل لليوم. استراحة، وبكرا منكمّل.',
    },
    cx: 50, ey: 41, my: 54, dx: 12, cdx: 20, top: 20, neck: 68, sw: 20,
    body: (m) =>
      `${arms(m, 30, 70, 76)}<path d="M40 96v8M60 96v8" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><path d="M35 104h10M55 104h10" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><rect x="30" y="68" width="40" height="28" rx="8" fill="#8FC9FF" stroke="${INK}" stroke-width="3"/><circle cx="50" cy="83" r="5" fill="#FFE36E" stroke="${INK}" stroke-width="2.4"/><path d="M50 20V10" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><circle cx="50" cy="7" r="4.5" fill="#FF8FA3" stroke="${INK}" stroke-width="2.6"/><rect x="14" y="34" width="9" height="17" rx="3" fill="#8FC9FF" stroke="${INK}" stroke-width="2.6"/><rect x="77" y="34" width="9" height="17" rx="3" fill="#8FC9FF" stroke="${INK}" stroke-width="2.6"/><rect x="22" y="20" width="56" height="47" rx="13" fill="#D6E8FF" stroke="${INK}" stroke-width="3"/>`,
  },
  turtle: {
    id: 'turtle',
    name: 'سلحفوش',
    tag: 'صبور',
    desc: 'سلحفاية، بتقسّم كل شي لخطوات',
    gender: 'm',
    voice: 'Achird',
    trait: 'صبور جداً، بيقسّم كل شي لخطوات صغيرة، وبيقول للطالب إنو ما في استعجال',
    lines: {
      hi: (n) => `أهلين ${n}، أنا سلحفوش. ما في استعجال. خطوة خطوة، بلّش بكتاب.`,
      back: (_n, l) => `أهلين من جديد. كمّل ${l} بخطوات صغيرة.`,
      retry: 'ولا يهمك، خطوة صغيرة كمان مرة.',
      win: 'شفت؟ خطوة خطوة وصلت.',
      rest: 'هيك منيح. الراحة كمان جزء من التعلّم، وبكرا منكمّل.',
    },
    cx: 50, ey: 38, my: 50, dx: 10, cdx: 17, top: 18, neck: 62, sw: 18,
    body: (m) =>
      `<ellipse cx="31" cy="98" rx="10" ry="6" fill="#B8E0A0" stroke="${INK}" stroke-width="3"/><ellipse cx="69" cy="98" rx="10" ry="6" fill="#B8E0A0" stroke="${INK}" stroke-width="3"/><ellipse cx="50" cy="72" rx="40" ry="28" fill="#7BC98F" stroke="${INK}" stroke-width="3"/><path d="M50 56l13 7v14l-13 7-13-7V63z" fill="#5EB07A" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 70l13-4M76 70l-13-4M30 90l8-9M70 90l-8-9" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>${arms(m, 13, 87, 64)}<circle cx="50" cy="40" r="22" fill="#B8E0A0" stroke="${INK}" stroke-width="3"/>`,
  },
}

export const COMP_ORDER: CompId[] = ['buddy', 'yasmina', 'fanous', 'robo', 'turtle']

function accSvg(c: CompMeta, A: Acc): string {
  let o = ''
  if (A.scarf)
    o += `<path d="M${c.cx - c.sw} ${c.neck}q${c.sw} 9 ${c.sw * 2} 0v7q-${c.sw} 9-${c.sw * 2} 0z" fill="#FF8FA3" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M${c.cx + c.sw - 12} ${c.neck + 7}v15l5-4 5 4v-17z" fill="#FFE36E" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`
  if (A.glasses)
    o += `<g fill="rgba(143,201,255,.38)" stroke="${INK}" stroke-width="2.6"><circle cx="${c.cx - c.dx}" cy="${c.ey}" r="10"/><circle cx="${c.cx + c.dx}" cy="${c.ey}" r="10"/><path d="M${c.cx - c.dx + 10} ${c.ey}H${c.cx + c.dx - 10}" fill="none"/></g>`
  if (A.hat)
    o += `<g transform="rotate(-8 ${c.cx} ${c.top})"><path d="M${c.cx - 14} ${c.top + 4}L${c.cx} ${c.top - 24}L${c.cx + 14} ${c.top + 4}z" fill="#B8A6FF" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M${c.cx - 8} ${c.top - 8}l16 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="${c.cx}" cy="${c.top - 27}" r="4.2" fill="#FFE36E" stroke="${INK}" stroke-width="2.4"/></g>`
  return o
}

/** رسم الرفيق كنص SVG جاهز (ثابت، مو من إدخال المستخدم). */
export function companionSvg(id: CompId, mood: CompMood, size: number, cls: string, acc: Acc): string {
  const c = COMPS[id] ?? COMPS.buddy
  return `<svg class="buddy ${cls}" role="img" aria-label="${c.name}" width="${size}" height="${Math.round(size * 1.1)}" viewBox="0 0 100 110">${mood === 'think' ? thinkDots : ''}${c.body(mood)}${face(mood, c.cx, c.ey, c.my, c.dx, c.cdx)}${accSvg(c, acc)}</svg>`
}
