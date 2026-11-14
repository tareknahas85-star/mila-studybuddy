// رفقاء الدراسة: خمس شخصيات مرسومة بـSVG، كل وحدة إلها شكل وتعابير وطبع بيغيّر طريقة كلامها.
// الطالب بيختار رفيقه، وصور الطلاب (ليلي/روي...) هي أفاتار الطالب نفسه مو الرفيق.
export type CompId = 'buddy' | 'yasmina' | 'fanous' | 'robo' | 'turtle' | 'cat' | 'bunny' | 'panda' | 'dino' | 'owl'
export type CompMood = 'happy' | 'think' | 'wow' | 'cheer'
export type AccId = 'glasses' | 'hat' | 'scarf' | 'bow' | 'crown' | 'headphones'
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
  cat: {
    id: 'cat',
    name: 'ميمي',
    tag: 'مدلّلة ومرحة',
    desc: 'قطة صغيرة، بتحب اللعب والمفاجآت',
    gender: 'f',
    voice: 'Sulafat',
    trait: 'مدلّلة ومرحة، بتحب الألعاب والمفاجآت، وبتشجّع الطالب بدلع لطيف',
    lines: {
      hi: (n) => `مياو ${n}! أنا ميمي. اختار كتاب ويلا نلعب ونتعلّم.`,
      back: (_n, l) => `رجعت! كنا بنكمّل ${l}. يلا مياو!`,
      retry: 'مياو، قريب! جرّب مرة تانية.',
      win: 'مياو! برافو عليك!',
      rest: 'يكفي لليوم، مياو. ريّح وبكرا منلعب كمان.',
    },
    cx: 50, ey: 50, my: 64, dx: 11, cdx: 19, top: 26, neck: 80, sw: 20,
    body: (m) =>
      `${arms(m, 30, 70, 88)}<ellipse cx="50" cy="94" rx="21" ry="14" fill="#FFB347" stroke="${INK}" stroke-width="3"/><path d="M24 36L27 12l18 14z" fill="#FFB347" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M76 36L73 12 55 26z" fill="#FFB347" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M30 28l2-10 8 6zM70 28l-2-10-8 6z" fill="#FF8FA3"/><circle cx="50" cy="52" r="28" fill="#FFC46B" stroke="${INK}" stroke-width="3"/><path d="M44 29v6M50 27v8M56 29v6" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M47 58h6l-3 4z" fill="#FF8FA3" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 56l12 3M14 64l12-2M86 56l-12 3M86 64l-12-2" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
  },
  bunny: {
    id: 'bunny',
    name: 'لولو',
    tag: 'خجولة ولطيفة',
    desc: 'أرنب صغير، بيحب الجزر والحكايات',
    gender: 'f',
    voice: 'Sulafat',
    trait: 'خجولة ولطيفة، بتحكي بهدوء وبتشجّع الطالب بكلمات ناعمة، وبتحب تشبّه الأشياء بالجزر والحقول',
    lines: {
      hi: (n) => `أهلين ${n}، أنا لولو. اختار كتاب وتعا نقفز لدرس جديد.`,
      back: (_n, l) => `رجعت! منكمّل ${l} متل ما وعدتك.`,
      retry: 'ولا يهمك، جرّب كمان مرة بهدوء.',
      win: 'يا سلام! قفزة حلوة.',
      rest: 'تعبنا شوي. ريّح، وبكرا بنرجع نقفز.',
    },
    cx: 50, ey: 56, my: 68, dx: 10, cdx: 17, top: 32, neck: 80, sw: 18,
    body: (m) =>
      `${arms(m, 30, 70, 90)}<ellipse cx="50" cy="96" rx="19" ry="12" fill="#fff" stroke="${INK}" stroke-width="3"/><g transform="rotate(-8 38 22)"><ellipse cx="38" cy="22" rx="9" ry="21" fill="#fff" stroke="${INK}" stroke-width="3"/><ellipse cx="38" cy="24" rx="4" ry="14" fill="#FF8FA3"/></g><g transform="rotate(8 62 22)"><ellipse cx="62" cy="22" rx="9" ry="21" fill="#fff" stroke="${INK}" stroke-width="3"/><ellipse cx="62" cy="24" rx="4" ry="14" fill="#FF8FA3"/></g><circle cx="50" cy="58" r="25" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M47 64h6l-3 3z" fill="#FF8FA3"/>`,
  },
  panda: {
    id: 'panda',
    name: 'بندق',
    tag: 'هادي ولطيف',
    desc: 'باندا لطيف، بياخد وقتو ببساطة',
    gender: 'm',
    voice: 'Achird',
    trait: 'هادي ولطيف وبيحب ياخد وقتو، بيشرح ببساطة وبيمزح مزح خفيف عن الأكل والنوم',
    lines: {
      hi: (n) => `أهلين ${n}، أنا بندق. على مهلنا، اختار كتاب.`,
      back: (_n, l) => `رجعت؟ منكمّل ${l} على مهلنا.`,
      retry: 'ولا يهمك، جرّب مرة تانية بدون استعجال.',
      win: 'حلو كتير! تستاهل ورقة خيزران.',
      rest: 'وقت القيلولة. ريّح، وبكرا منكمّل.',
    },
    cx: 50, ey: 48, my: 66, dx: 11, cdx: 19, top: 24, neck: 78, sw: 20,
    body: (m) =>
      `${arms(m, 28, 72, 88, '#2B2A33')}<ellipse cx="50" cy="94" rx="21" ry="14" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="26" cy="28" r="10" fill="#2B2A33"/><circle cx="74" cy="28" r="10" fill="#2B2A33"/><circle cx="50" cy="52" r="28" fill="#fff" stroke="${INK}" stroke-width="3"/><ellipse cx="38" cy="48" rx="9" ry="11" transform="rotate(20 38 48)" fill="#2B2A33"/><ellipse cx="62" cy="48" rx="9" ry="11" transform="rotate(-20 62 48)" fill="#2B2A33"/><ellipse cx="50" cy="60" rx="4" ry="3" fill="#2B2A33"/>`,
  },
  dino: {
    id: 'dino',
    name: 'دينو',
    tag: 'شجاع ومغامر',
    desc: 'ديناصور صغير، بيحب التحديات',
    gender: 'm',
    voice: 'Puck',
    trait: 'شجاع ومغامر، بيحوّل الدرس لمغامرة وتحدّي، وبيحكي بحماس',
    lines: {
      hi: (n) => `غرررر! أهلين ${n}، أنا دينو. اختار كتاب لنبدأ المغامرة!`,
      back: (_n, l) => `رجعنا للمغامرة! منكمّل ${l}.`,
      retry: 'غرر، المرة الجاية بتنجح! جرّب كمان.',
      win: 'غرررر! بطل!',
      rest: 'المغامرة وقفت لليوم. ريّح، وبكرا مغامرة جديدة.',
    },
    cx: 50, ey: 46, my: 60, dx: 11, cdx: 19, top: 22, neck: 76, sw: 20,
    body: (m) =>
      `${arms(m, 26, 74, 84)}<ellipse cx="50" cy="92" rx="22" ry="15" fill="#8EDB8E" stroke="${INK}" stroke-width="3"/><ellipse cx="50" cy="94" rx="14" ry="10" fill="#E8F7C8"/><path d="M34 26l5-14 6 12zM46 22l5-15 6 15zM58 26l5-12 6 14z" fill="#FFB347" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="50" cy="50" r="28" fill="#8EDB8E" stroke="${INK}" stroke-width="3"/><circle cx="44" cy="54" r="1.8" fill="${INK}"/><circle cx="56" cy="54" r="1.8" fill="${INK}"/>`,
  },
  owl: {
    id: 'owl',
    name: 'بوبو',
    tag: 'حكيم',
    desc: 'بومة حكيمة، بتحب المعلومات الغريبة',
    gender: 'm',
    voice: 'Achird',
    trait: 'حكيم وهادي، بيحب المعلومات الغريبة والحكم القصيرة، وبيشجّع الطالب يفكّر قبل ما يجاوب',
    lines: {
      hi: (n) => `أهلين ${n}، أنا بوبو. العلم نور، اختار كتاب.`,
      back: (_n, l) => `رجعت! منكمّل ${l}، والتفكير أول.`,
      retry: 'فكّر شوي بعد، وجرّب مرة تانية.',
      win: 'حكمة حلوة! برافو.',
      rest: 'حتى البوم بيرتاح. بكرا منكمّل.',
    },
    cx: 50, ey: 46, my: 70, dx: 12, cdx: 22, top: 16, neck: 80, sw: 24,
    body: (m) =>
      `${arms(m, 22, 78, 66)}<path d="M40 100h8M52 100h8" stroke="#FF9F40" stroke-width="4" stroke-linecap="round"/><ellipse cx="50" cy="66" rx="30" ry="34" fill="#C98B4E" stroke="${INK}" stroke-width="3"/><path d="M26 40L22 16l18 12zM74 40l4-24-18 12z" fill="#C98B4E" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="50" cy="78" rx="19" ry="18" fill="#FFE9B8"/><path d="M40 72q5 5 10 0q5 5 10 0M40 82q5 5 10 0q5 5 10 0" fill="none" stroke="#C98B4E" stroke-width="2"/><circle cx="38" cy="46" r="14" fill="#FFF3C4" stroke="${INK}" stroke-width="2.6"/><circle cx="62" cy="46" r="14" fill="#FFF3C4" stroke="${INK}" stroke-width="2.6"/><path d="M45 54h10l-5 9z" fill="#FF9F40" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  },
}

export const COMP_ORDER: CompId[] = ['buddy', 'yasmina', 'turtle', 'robo', 'fanous', 'cat', 'bunny', 'panda', 'dino', 'owl']

function accSvg(c: CompMeta, A: Acc): string {
  let o = ''
  if (A.scarf)
    o += `<path d="M${c.cx - c.sw} ${c.neck}q${c.sw} 9 ${c.sw * 2} 0v7q-${c.sw} 9-${c.sw * 2} 0z" fill="#FF8FA3" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M${c.cx + c.sw - 12} ${c.neck + 7}v15l5-4 5 4v-17z" fill="#FFE36E" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`
  if (A.glasses)
    o += `<g fill="rgba(143,201,255,.38)" stroke="${INK}" stroke-width="2.6"><circle cx="${c.cx - c.dx}" cy="${c.ey}" r="10"/><circle cx="${c.cx + c.dx}" cy="${c.ey}" r="10"/><path d="M${c.cx - c.dx + 10} ${c.ey}H${c.cx + c.dx - 10}" fill="none"/></g>`
  if (A.hat)
    o += `<g transform="rotate(-8 ${c.cx} ${c.top})"><path d="M${c.cx - 14} ${c.top + 4}L${c.cx} ${c.top - 24}L${c.cx + 14} ${c.top + 4}z" fill="#B8A6FF" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M${c.cx - 8} ${c.top - 8}l16 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="${c.cx}" cy="${c.top - 27}" r="4.2" fill="#FFE36E" stroke="${INK}" stroke-width="2.4"/></g>`
  if (A.bow)
    o += `<path d="M${c.cx} ${c.neck + 4}l-16-9v18zM${c.cx} ${c.neck + 4}l16-9v18z" fill="#FF8FA3" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="${c.cx}" cy="${c.neck + 4}" r="4" fill="#FFE36E" stroke="${INK}" stroke-width="2.2"/>`
  if (A.headphones) {
    const hw = c.dx + 15
    o += `<path d="M${c.cx - hw} ${c.ey + 2}A${hw} ${c.ey - c.top + 12} 0 0 1 ${c.cx + hw} ${c.ey + 2}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><rect x="${c.cx - hw - 6}" y="${c.ey - 8}" width="12" height="20" rx="5" fill="#8FC9FF" stroke="${INK}" stroke-width="2.6"/><rect x="${c.cx + hw - 6}" y="${c.ey - 8}" width="12" height="20" rx="5" fill="#8FC9FF" stroke="${INK}" stroke-width="2.6"/>`
  }
  if (A.crown)
    o += `<g transform="rotate(-6 ${c.cx} ${c.top})"><path d="M${c.cx - 14} ${c.top + 4}l-2-18 9 8 7-13 7 13 9-8-2 18z" fill="#FFE36E" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="${c.cx}" cy="${c.top - 4}" r="2.4" fill="#FF8FA3"/></g>`
  return o
}

/** رسم الرفيق كنص SVG جاهز (ثابت، مو من إدخال المستخدم). */
export function companionSvg(id: CompId, mood: CompMood, size: number, cls: string, acc: Acc): string {
  const c = COMPS[id] ?? COMPS.buddy
  return `<svg class="buddy ${cls}" role="img" aria-label="${c.name}" width="${size}" height="${Math.round(size * 1.1)}" viewBox="0 0 100 110">${mood === 'think' ? thinkDots : ''}${c.body(mood)}${face(mood, c.cx, c.ey, c.my, c.dx, c.cdx)}${accSvg(c, acc)}</svg>`
}
