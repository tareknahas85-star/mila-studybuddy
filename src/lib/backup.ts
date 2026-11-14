// نسخة احتياطية لبيانات طالب بملف ZIP (بالإيد فقط، ما في رفع تلقائي):
// الطالب، التقدم، الكتب، الدروس، صور الصفحات، الذاكرة، والواجبات. رمز الأهل ومفتاح جيميني ما بيدخلوا بالملف.
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import JSZip from 'jszip'
import { loadImageBlob, saveImage } from './archive.ts'
import { COMPS } from './companions.ts'
import type { CompId } from './companions.ts'
import { SKINS } from './rewards.ts'
import type { SkinId } from './rewards.ts'
import {
  DEFAULT_MEMORY,
  DEFAULT_PROGRESS,
  loadBooks,
  loadHomework,
  loadLessons,
  loadMemory,
  loadProgress,
  loadStudents,
  saveBooks,
  saveHomework,
  saveLessons,
  saveMemory,
  saveProgress,
  uid,
} from './store.ts'
import type { Book, Homework, Lesson, Memory, Progress, Student } from './store.ts'

const FORMAT = 1

interface Payload {
  v: number
  app: string
  exportedAt: number
  student: Student
  progress: Progress
  books: Book[]
  lessons: Lesson[]
  memory: Memory
  hw: Homework[]
}

export interface ParsedBackup {
  payload: Payload
  images: Map<string, Blob>
}

export async function exportStudent(id: string): Promise<{ ok: boolean; error: string }> {
  const student = loadStudents().find((s) => s.id === id)
  if (!student) return { ok: false, error: 'ما لقينا الطالب.' }
  const lessons = loadLessons(id)
  const payload: Payload = {
    v: FORMAT,
    app: 'studybuddy',
    exportedAt: Date.now(),
    student,
    progress: loadProgress(id),
    books: loadBooks(id),
    lessons,
    memory: loadMemory(id),
    hw: loadHomework(id),
  }
  const zip = new JSZip()
  zip.file('data.json', JSON.stringify(payload))
  zip.file('README.txt', 'StudyBuddy: نسخة احتياطية لبيانات طالب. بتستوردها من قسم الأهل ← استيراد بيانات طالب.')
  const imageIds = [...new Set(lessons.map((l) => l.imageId).filter((x) => x !== ''))]
  for (const imgId of imageIds) {
    const blob = await loadImageBlob(imgId)
    if (blob) zip.file(`images/${imgId}`, blob)
  }
  const name = `StudyBuddy-${new Date().toISOString().slice(0, 10)}-${id.slice(0, 6)}.zip`
  try {
    if (Capacitor.isNativePlatform()) {
      const base64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' })
      await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache })
      const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache })
      await Share.share({ title: 'نسخة StudyBuddy', files: [uri], dialogTitle: 'احفظ النسخة أو ابعتها' })
    } else {
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    }
    return { ok: true, error: '' }
  } catch (e) {
    // الطالب سكّر قائمة المشاركة: مو خطأ.
    if (e instanceof Error && /cancel/i.test(e.message)) return { ok: true, error: '' }
    return { ok: false, error: 'ما قدرنا نجهّز الملف. جرّب مرة تانية.' }
  }
}

function clean(o: Partial<Payload>): Payload {
  const s = (o.student ?? {}) as Partial<Student>
  const comp: CompId = typeof s.comp === 'string' && s.comp in COMPS ? (s.comp as CompId) : 'buddy'
  const skin: SkinId = SKINS.some((k) => k.id === s.skin) ? (s.skin as SkinId) : 'notebook'
  const student: Student = {
    id: String(s.id).slice(0, 40),
    name: String(s.name ?? 'طالب').slice(0, 30),
    grade: String(s.grade ?? 'الصف الخامس').slice(0, 30),
    gender: s.gender === 'm' ? 'm' : 'f',
    av: typeof s.av === 'string' && s.av.length < 300000 ? s.av : 'a',
    comp,
    skin,
    acc: s.acc && typeof s.acc === 'object' ? s.acc : {},
    voice: typeof s.voice === 'string' && s.voice !== '' ? s.voice : COMPS[comp].voice,
    limitMin: Number(s.limitMin) > 0 ? Number(s.limitMin) : 0,
    goal: typeof s.goal === 'number' ? s.goal : 3,
    canEdit: s.canEdit === true,
    starCap: typeof s.starCap === 'number' ? s.starCap : 3,
  }
  return {
    v: FORMAT,
    app: 'studybuddy',
    exportedAt: Number(o.exportedAt) || 0,
    student,
    progress: { ...DEFAULT_PROGRESS, ...(o.progress ?? {}) },
    books: Array.isArray(o.books) ? o.books : [],
    lessons: Array.isArray(o.lessons) ? o.lessons : [],
    memory: { ...DEFAULT_MEMORY, ...(o.memory ?? {}) },
    hw: Array.isArray(o.hw) ? o.hw : [],
  }
}

export async function parseBackup(file: File): Promise<{ ok: true; data: ParsedBackup } | { ok: false; error: string }> {
  if (file.size > 300 * 1024 * 1024) return { ok: false, error: 'الملف كبير كتير (أكتر من ٣٠٠ ميغا).' }
  if (/\.json$/i.test(file.name) || file.type === 'application/json') return parseLegacy(file)
  try {
    const zip = await JSZip.loadAsync(file)
    const entry = zip.file('data.json')
    if (!entry) return { ok: false, error: 'هاد مو ملف StudyBuddy صحيح.' }
    const raw: unknown = JSON.parse(await entry.async('string'))
    if (!raw || typeof raw !== 'object') throw new Error('bad')
    const o = raw as Partial<Payload>
    if (o.app !== 'studybuddy' || o.v !== FORMAT || !o.student || typeof o.student.id !== 'string') throw new Error('bad')
    const images = new Map<string, Blob>()
    for (const [name, f] of Object.entries(zip.files)) {
      if (!f.dir && name.startsWith('images/')) images.set(name.slice(7), new Blob([await f.async('arraybuffer')], { type: 'image/jpeg' }))
    }
    return { ok: true, data: { payload: clean(o), images } }
  } catch {
    return { ok: false, error: 'ما قدرنا نقرا الملف. تأكد إنو نسخة StudyBuddy سليمة.' }
  }
}

/** بيكتب بيانات الطالب المستورد على الجهاز. asCopy: طالب جديد بمعرّف جديد (صورو بتتنسخ لتفادي مشاركة الصور). */
export async function applyBackup(b: ParsedBackup, asCopy: boolean): Promise<Student> {
  const p = b.payload
  const newId = asCopy ? uid() : p.student.id
  const imgIds = new Map<string, string>()
  for (const l of p.lessons) {
    if (l.imageId !== '' && b.images.has(l.imageId) && !imgIds.has(l.imageId)) imgIds.set(l.imageId, asCopy ? uid() : l.imageId)
  }
  for (const [oldId, newImg] of imgIds) {
    const blob = b.images.get(oldId)
    if (blob) await saveImage(newImg, blob)
  }
  const lessons: Lesson[] = p.lessons.map((l) => ({ ...l, imageId: imgIds.get(l.imageId) ?? '' }))
  saveProgress(newId, p.progress)
  saveBooks(newId, p.books)
  saveLessons(newId, lessons)
  saveMemory(newId, p.memory)
  saveHomework(newId, p.hw)
  return { ...p.student, id: newId, name: asCopy ? `${p.student.name} (نسخة)` : p.student.name }
}

// ---------- نسخة التطبيق القديم (StudyBuddy 50.x): ملف JSON فيه الطالب والدروس والصور ----------
function normLesson(l: Partial<Lesson>): Lesson {
  const quiz = Array.isArray(l.quiz) ? l.quiz.filter((q) => q && Array.isArray(q.options) && q.options.length >= 2) : []
  return {
    id: typeof l.id === 'string' && l.id !== '' ? l.id : uid(),
    bookId: typeof l.bookId === 'string' ? l.bookId : '',
    title: typeof l.title === 'string' && l.title !== '' ? l.title : 'درس',
    subject: typeof l.subject === 'string' && l.subject !== '' ? l.subject : 'عام',
    summary: typeof l.summary === 'string' ? l.summary : '',
    steps: Array.isArray(l.steps) ? l.steps.filter((x) => typeof x === 'string') : [],
    hints: Array.isArray(l.hints) ? l.hints.filter((x) => typeof x === 'string') : [],
    quiz,
    spot: l.spot && typeof l.spot === 'object' ? l.spot : undefined,
    videoQuery: typeof l.videoQuery === 'string' ? l.videoQuery : '',
    imageId: typeof l.imageId === 'string' ? l.imageId : '',
    createdAt: typeof l.createdAt === 'number' ? l.createdAt : Date.now(),
    done: l.done === true,
    right: typeof l.right === 'number' ? l.right : 0,
    total: typeof l.total === 'number' ? l.total : 0,
    doneAt: typeof l.doneAt === 'number' ? l.doneAt : undefined,
  }
}

async function parseLegacy(file: File): Promise<{ ok: true; data: ParsedBackup } | { ok: false; error: string }> {
  try {
    const raw: unknown = JSON.parse(await file.text())
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('bad')
    const o = raw as Record<string, unknown>
    if (o.app !== 'mila' && o.app !== 'studybuddy') throw new Error('bad')
    const old = (o.student && typeof o.student === 'object' ? o.student : {}) as Record<string, unknown>
    const profile = typeof o.profile === 'string' ? o.profile : ''
    const gender = old.gender === 'm' ? 'm' : 'f'
    const comp: CompId = gender === 'm' ? 'buddy' : 'yasmina'
    const name = typeof old.childName === 'string' && old.childName.trim() !== '' ? old.childName.trim().slice(0, 30) : profile === 'roy' ? 'روي' : 'ليلي'
    const student: Student = {
      id: uid(),
      name,
      grade: typeof old.grade === 'string' && old.grade !== '' ? old.grade.slice(0, 30) : 'الصف الخامس',
      gender,
      av: profile === 'lily' || profile === 'roy' ? profile : 'a',
      comp,
      skin: 'notebook',
      acc: {},
      voice: typeof old.voice === 'string' && old.voice !== '' ? old.voice : COMPS[comp].voice,
      limitMin: 0,
      goal: 3,
      canEdit: false,
      starCap: 3,
    }
    const lessons = (Array.isArray(o.lessons) ? (o.lessons as Array<Partial<Lesson>>) : []).map(normLesson)
    const books: Book[] = (Array.isArray(o.books) ? (o.books as Array<Partial<Book>>) : [])
      .filter((b) => b && typeof b.id === 'string' && typeof b.title === 'string')
      .map((b) => ({ id: b.id as string, title: b.title as string, subject: typeof b.subject === 'string' ? b.subject : 'عام', createdAt: typeof b.createdAt === 'number' ? b.createdAt : Date.now() }))
    const images = new Map<string, Blob>()
    if (o.images && typeof o.images === 'object') {
      for (const [id, v] of Object.entries(o.images as Record<string, unknown>)) {
        if (typeof v === 'string' && v.startsWith('data:image/')) {
          try {
            images.set(id, await (await fetch(v)).blob())
          } catch {
            // صورة تالفة ما بتوقف الاستيراد.
          }
        }
      }
    }
    return {
      ok: true,
      data: {
        payload: {
          v: FORMAT,
          app: 'studybuddy',
          exportedAt: 0,
          student,
          progress: { ...DEFAULT_PROGRESS, ...((o.progress && typeof o.progress === 'object' ? o.progress : {}) as Partial<Progress>) },
          books,
          lessons,
          memory: { ...DEFAULT_MEMORY, ...((o.memory && typeof o.memory === 'object' ? o.memory : {}) as Partial<Memory>) },
          hw: [],
        },
        images,
      },
    }
  } catch {
    return { ok: false, error: 'هاد مو ملف نسخة احتياطية من StudyBuddy (القديم أو الجديد).' }
  }
}