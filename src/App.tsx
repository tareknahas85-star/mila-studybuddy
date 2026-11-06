import { useEffect, useState } from 'react'
import Mila from './components/Mila.tsx'
import Wizard from './components/Wizard.tsx'
import Lock from './components/Lock.tsx'
import LessonView from './components/LessonView.tsx'
import PhotoView from './components/PhotoView.tsx'
import ParentView from './components/ParentView.tsx'
import type { Mood, Progress, Settings } from './lib/store.ts'
import { completeLesson, currentStreak, loadProgress, loadSettings, saveProgress, saveSettings } from './lib/store.ts'

type Tab = 'learn' | 'photo' | 'parent'

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'learn', label: 'تعلّم', icon: '🎓' },
  { id: 'photo', label: 'صورة', icon: '📸' },
  { id: 'parent', label: 'الأهل', icon: '👨‍👩‍👧' },
]

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [tab, setTab] = useState<Tab>('learn')
  const [mood, setMood] = useState<Mood>('idle')
  const [parentOpen, setParentOpen] = useState(false)

  // ميلا بترجع لوجهها الهادي بعد شوي من التفاعل.
  useEffect(() => {
    if (mood === 'idle') return
    const timer = window.setTimeout(() => setMood('idle'), 3000)
    return () => window.clearTimeout(timer)
  }, [mood])

  const applySettings = (next: Settings) => {
    setSettings(next)
    saveSettings(next)
  }

  const finishLesson = (stars: number) => {
    const next = completeLesson(progress, stars)
    setProgress(next)
    saveProgress(next)
    setMood('proud')
  }

  const resetProgress = () => {
    const empty: Progress = { stars: 0, lessonsDone: 0, days: [] }
    setProgress(empty)
    saveProgress(empty)
  }

  // أول تشغيل: ولي الأمر بيحضّر التطبيق.
  if (settings.childName === '' || settings.parentPin === '') {
    return (
      <div className="shell">
        <Mila mood="idle" line="مرحبا! خلينا نجهّز الدفتر سوا ✨" />
        <Wizard initial={settings} onDone={applySettings} />
      </div>
    )
  }

  const openParent = () => {
    if (parentOpen) return
    setTab('parent')
  }

  return (
    <div className="shell">
      <header className="topbar">
        <span className="hi">أهلاً {settings.childName} 🌟</span>
        <span className="stars">⭐ {progress.stars}</span>
      </header>

      <Mila
        mood={mood}
        line={
          mood === 'think'
            ? 'عم فكّر معك... خذ وقتك 💭'
            : mood === 'laugh'
              ? 'برافو! عجبني شغلك 🎉'
              : mood === 'tired'
                ? 'ولا يهمك، منجرّب مرة تانية 💙'
                : mood === 'proud'
                  ? 'خلصنا درس! نجمة إلك ⭐'
                  : undefined
        }
      />

      <main>
        {tab === 'learn' && (
          <LessonView
            childName={settings.childName}
            streak={currentStreak(progress)}
            lessonsDone={progress.lessonsDone}
            onFinish={finishLesson}
          />
        )}
        {tab === 'photo' && <PhotoView settings={settings} onMood={setMood} />}
        {tab === 'parent' &&
          (parentOpen ? (
            <ParentView
              settings={settings}
              progress={progress}
              onSave={applySettings}
              onReset={() => {
                resetProgress()
                setParentOpen(false)
                setTab('learn')
              }}
            />
          ) : (
            <Lock
              pin={settings.parentPin}
              title="قسم الأهل"
              onUnlock={() => setParentOpen(true)}
              onCancel={() => setTab('learn')}
            />
          ))}
      </main>

      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`nav-btn ${tab === t.id ? 'on' : ''}`}
            onClick={() => (t.id === 'parent' ? openParent() : setTab(t.id))}
          >
            <span className="nav-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
