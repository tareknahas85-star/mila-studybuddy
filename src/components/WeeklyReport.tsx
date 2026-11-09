import { loadMemory, loadSettings, weeklyReport } from '../lib/store.ts'

interface Props {
  profile: string
  onShare: (text: string) => void
}

/** شاشة تقرير أسبوعي لولي الأمر من بيانات ذاكرة الطالب. */
export default function WeeklyReport({ profile, onShare }: Props) {
  const memory = loadMemory(profile)
  const reportText = weeklyReport(memory)

  return (
    <div className="stack">
      <section className="card">
        <div className="row-head">
          <h2 className="title">تقرير أسبوعي 📊</h2>
          <button className="ghost slim" type="button" onClick={() => onShare('')}>
            إغلاق
          </button>
        </div>
        <p className="note small">
          تقرير مفصل لنشاط هذا الأسبوع بناءً على بيانات ذاكرة {loadSettings(profile).childName || 'الطالب'}.
        </p>
      </section>

      <section className="card">
        <div className="report-text">
          {reportText || 'لا توجد بيانات كافية لهذا الأسبوع.'}
        </div>
      </section>

      <section className="card">
        <button
          type="button"
          className="row row-icon"
          onClick={() => onShare(reportText || '')}
          aria-label="مشاركة التقرير عبر واتساب"
          title="مشاركة التقرير"
        >
          <span className="row-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.79 4.21c.28-.43.28-1.12 0-1.55l-.18-.31-5.09 4.42 4.53 5.02L10 21.2l5.26-3.08L17.79 4.21zM7.53 10.91l2.58 2.15L12 5.6l4.43 3.68L15.73 12l2.7-.68L18.14 15.95l-5.03 3.54L12 20.59l-5.06-3.85L7.53 10.91zM12 4L9.53 7.53 9 8l1.46 1.46L12 11l2.94 2.85 1.48-1.46L12 4z" />
            </svg>
          </span>
          <span className="row-main">
            <span className="row-title">مشاركة التقرير</span>
            <span className="row-sub">واتساب</span>
          </span>
        </button>
      </section>
    </div>
  )
}
