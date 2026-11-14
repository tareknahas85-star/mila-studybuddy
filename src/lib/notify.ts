// تذكيرات محلية على التلفون: بلا سيرفر ولا إشعارات من الإنترنت.
// جهاز الطالب: تذكير يومي بوقت الدراسة. جهاز الأهل: ملخص اليوم بالوقت اللي بتحدده + تذكير تقرير الجمعة.
// الإشعار نفسو عام ومضمون الوصول، والتفاصيل بتنقرا جوّا قسم الأهل (لأنو إشعار بالتفاصيل بدو سيرفر مدفوع).
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export interface NotifyPrefs {
  /** ساعة التذكير اليومي بوقت الدراسة (٠–٢٣)، -١ يعني مسكّر. */
  dailyHour: number
  /** تذكير الجمعة ٦ المسا بتقرير الأسبوع (لجهاز الأهل). */
  fridayReport: boolean
  /** ساعة إشعار "ملخص اليوم جاهز" (لجهاز الأهل)، -١ يعني مسكّر. */
  summaryHour: number
}

const KEY = 'sb.notify.v1'

export function loadNotify(): NotifyPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { dailyHour: -1, fridayReport: false, summaryHour: -1 }
    const p = JSON.parse(raw) as Partial<NotifyPrefs>
    return {
      dailyHour: typeof p.dailyHour === 'number' ? p.dailyHour : -1,
      fridayReport: p.fridayReport === true,
      summaryHour: typeof p.summaryHour === 'number' ? p.summaryHour : -1,
    }
  } catch {
    return { dailyHour: -1, fridayReport: false, summaryHour: -1 }
  }
}

export async function applyNotify(p: NotifyPrefs): Promise<string> {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // التخزين محجوب.
  }
  if (!Capacitor.isNativePlatform()) return 'التذكيرات بتشتغل على التلفون بس.'
  try {
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return 'ما انعطت صلاحية الإشعارات. فعّلها من إعدادات التلفون.'
    await LocalNotifications.cancel({ notifications: [{ id: 101 }, { id: 102 }, { id: 103 }] })
    const list = []
    if (p.dailyHour >= 0) {
      list.push({
        id: 101,
        title: 'StudyBuddy',
        body: 'وقت الدراسة! رفيقك بيستناك.',
        schedule: { on: { hour: p.dailyHour, minute: 0 }, allowWhileIdle: true },
      })
    }
    if (p.fridayReport) {
      list.push({
        id: 102,
        title: 'تقرير الأسبوع',
        body: 'تقرير الأسبوع جاهز بقسم الأهل.',
        schedule: { on: { weekday: 6, hour: 18, minute: 0 }, allowWhileIdle: true },
      })
    }
    if (p.summaryHour >= 0) {
      list.push({
        id: 103,
        title: 'ملخص اليوم',
        body: 'ملخص دراسة اليوم جاهز. افتح قسم الأهل لتشوف الدروس والوقت.',
        schedule: { on: { hour: p.summaryHour, minute: 0 }, allowWhileIdle: true },
      })
    }
    if (list.length > 0) await LocalNotifications.schedule({ notifications: list })
    return ''
  } catch {
    return 'ما قدرنا نضبط التذكير على هالجهاز.'
  }
}
