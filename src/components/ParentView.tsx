import { useState } from 'react'
import type { Memory, Progress, Settings } from '../lib/store.ts'
import {
  currentStreak,
  exportData,
  importData,
  learningStyle,
  subjectReads,
  loadMemory,
  todayKey,
  weeklyReport,
} from '../lib/store.ts'
import { checkKey, learningInsight } from '../lib/ai.ts'
import { prettyDate } from '../lib/img.ts'
import { DEFAULT_VOICE, VOICES, primeVoice, speakNatural, stopNatural } from '../lib/tts.ts'
import { personaFor, voicePersonaFor } from '../lib/persona.ts'

interface Props {
  settings: Settings
  progress: Progress
  memory: Memory
  onSave: (s: Settings) => void
  onMemory: (m: Memory) => void
  onReset: () => void
  onShareWeeklyReport: (profile: 'lily' | 'roy') => void
}

const SIGNAL_LABELS: Array<{ key: keyof Memory['signals']; icon: string; label: string }> = [
  { key: 'voice', icon: '🔊', label: 'سمع الصوت' },
  { key: 'video', icon: '🎬', label: 'فتح فيديو' },
  { key: 'text', icon: '📖', label: 'قرا الشرح' },
  { key: 'hints', icon: '💡', label: 'طلب تلميح' },
  { key: 'photos', icon: '📸', label: 'حلّل صورة' },
  { key: 'asked', icon: '✍️', label: 'سأل سؤال' },
]

const MAX_BACKUP_BYTES = 20 * 1024 * 1024

/** قسم الأهل: نظرة عامة على التقدّم + ذاكرة الطفل (أسلوبه، مستواه، واهتماماته). */
export default function ParentView({ settings, progress, memory, onSave, onMemory, onReset }: Props) {
  const [tab, setTab] = useState<'over' | 'memory'>('over')
  const [key, setKey] = useState(settings.geminiKey)
  const [notes, setNotes] = useState(memory.notes)
  const [saved, setSaved] = useState('')
  const [interest, setInterest] = useState('')
  const [insightBusy, setInsightBusy] = useState(false)
  const [insightError, setInsightError] = useState('')
  const [checkBusy, setCheckBusy] = useState(false)
  const [checkMsg, setCheckMsg] = useState('')
  const [checkError, setCheckError] = useState('')
  const [voice, setVoice] = useState(settings.voice || DEFAULT_VOICE)
  const [sampleBusy, setSampleBusy] = useState(false)
  const [sampleMsg, setSampleMsg] = useState('')
  const [backupMsg, setBackupMsg] = useState('')
  const [backupError, setBackupError] = useState('')

  const persona = personaFor(settings)
  const voicePersona = voicePersonaFor(voice)
  const fem = persona.gender === 'f'

  const flash = (msg: string) => {
    setSaved(msg)
    window.setTimeout(() => setSaved(''), 2500)
  }

  const saveSettings = () => {
    onSave({ ...settings, childName: persona.name, geminiKey: key.trim(), voice })
    flash('انحفظ ✅')
  }

  const sampleVoice = () => {
    if (sampleBusy) {
      stopNatural()
      setSampleBusy(false)
      setSampleMsg('')
      return
    }
    if (key.trim() === '') {
      setSampleMsg('حطّ مفتاح جيميني أول شي، وبعدها جرّب الصوت 🔑')
      return
    }
    primeVoice()
    setSampleBusy(true)
    setSampleMsg(`عم نجهّز صوت ${voicePersona.name}… أول مرة بتاخد كام ثانية ⏳`)
    speakNatural(
      { text: voicePersona.sample, apiKey: key.trim(), voice },
      {
        onStart: () =>
          setSampleMsg(
            `${voicePersona.name} عم ${voicePersona.gender === 'f' ? 'تحكي' : 'يحكي'} 🎧`,
          ),
        onEnd: () => {
          setSampleBusy(false)
          setSampleMsg('')
        },
        onError: () => {
          setSampleBusy(false)
          setSampleMsg('ما قدرنا نجيب الصوت — جرّب كمان مرة أو تأكد من المفتاح والنت.')
        },
      },
    )
  }

  const addInterest = () => {
    const value = interest.trim()
    if (value.length < 2 || memory.interests.includes(value)) {
      setInterest('')
      return
    }
    onMemory({ ...memory, interests: [...memory.interests, value].slice(0, 12) })
    setInterest('')
    flash('انضافت للذاكرة ✅')
  }

  const removeInterest = (value: string) => {
    onMemory({ ...memory, interests: memory.interests.filter((i) => i !== value) })
  }

  const saveNotes = () => {
    onMemory({ ...memory, notes: notes.trim().slice(0, 400) })
    flash('انحفظت الملاحظة ✅')
  }

  const testKey = async () => {
    if (checkBusy) return
    setCheckBusy(true)
    setCheckMsg('')
    setCheckError('')
    const res = await checkKey(key)
    setCheckBusy(false)
    if (!res.ok) {
      setCheckError(res.error)
      return
    }
    setCheckMsg(`المفتاح شغّال ✅ — ${persona.name} عم ${fem ? 'تستعمل' : 'يستعمل'} موديل ${res.data}`)
  }

  const generateInsight = async () => {
    if (insightBusy) return
    setInsightBusy(true)
    setInsightError('')
    const res = await learningInsight({ apiKey: settings.geminiKey, settings, memory })
    setInsightBusy(false)
    if (!res.ok) {
      setInsightError(res.error)
      return
    }
    onMemory({ ...memory, insight: res.data, insightAt: Date.now() })
  }

  const exportBackup = () => {
    try {
      const json = exportData(settings.profile)
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `studybuddy-${settings.profile}-${todayKey()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setBackupError('')
      setBackupMsg('انحفظت النسخة الاحتياطية 💾 — ما فيها رقم الأهل ولا المفتاح.')
    } catch {
      setBackupMsg('')
      setBackupError('ما قدرنا نحضّر النسخة. جرّب مرة تانية.')
    }
  }

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBackupMsg('')
    setBackupError('')
    if (file.size > MAX_BACKUP_BYTES) {
      setBackupError('الملف كبير كتير، ومو نسخة من ميلا.')
      return
    }
    if (!window.confirm('هالعملية بتستبدل دروس وكتب وذاكرة الطالب الحالي. تكمل؟')) return
    try {
      const text = await file.text()
      if (!importData(text, settings.profile)) {
        setBackupError('الملف مو نسخة احتياطية صالحة من ميلا.')
        return
      }
      window.location.reload()
    } catch {
      setBackupError('ما قدرنا نقرا الملف. جرّب مرة تانية.')
    }
  }

  const style = learningStyle(memory)
  const reads = subjectReads(memory)
  const totalSignals = SIGNAL_LABELS.reduce((sum, s) => sum + (memory.signals[s.key] ?? 0), 0)

  return (
    <div className="stack">
      <section className="card">
        <h2 className="title">👨‍👩‍👧 قسم الأهل</h2>
        <div className="seg" role="tablist" aria-label="أقسام الأهل">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'over'}
            className={`seg-btn ${tab === 'over' ? 'on' : ''}`}
            onClick={() => setTab('over')}
          >
            نظرة عامة
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'memory'}
            className={`seg-btn ${tab === 'memory' ? 'on' : ''}`}
            onClick={() => setTab('memory')}
          >
            🧠 ذاكرة الطفل
          </button>
        </div>
      </section>

      {tab === 'over' ? (
        <>
          <section className="card">
            <div className="stats">
              <div className="stat">
                <strong>{progress.stars}</strong>
                <span>نجوم ⭐</span>
              </div>
              <div className="stat">
                <strong>{currentStreak(progress)}</strong>
                <span>أيام متتالية 🔥</span>
              </div>
              <div className="stat">
                <strong>{progress.lessonsDone}</strong>
                <span>دروس 🎓</span>
              </div>
            </div>

            <div className="persona-line">
              <img src={persona.avatar} alt={persona.name} />
              <div>
                <strong>{persona.name}</strong>
                <span className="note small">أفاتار الطالب واسمه بيضلوا ثابتين</span>
              </div>
            </div>

            <label className="label" htmlFor="p-key">
              مفتاح جيميني المجاني
            </label>
            <input
              id="p-key"
              className="input ltr"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza..."
              autoComplete="off"
            />
            <p className="note small">
              من Google AI Studio — مجاني. بيضل على هالجهاز بس، والطالب ما بيشوفه. بدونه البحث وقراءة الصور ما بيشتغلوا.
            </p>
            <p className="error small" role="note">
              ⚠️ المفتاح محفوظ على الجهاز كنص عادي (من غير تشفير). أي شخص بيفتح هالجهاز ويعرف رقم الأهل بيقدر يشوفه.
              لا تحطه على جهاز بيستعمله غيرك، ولا تشارك نسخة احتياطية.
            </p>
            <button className="ghost" type="button" onClick={testKey} disabled={checkBusy || key.trim() === ''}>
              {checkBusy ? 'عم نفحص… ⏳' : 'اختبر المفتاح 🔍'}
            </button>
            {checkMsg && <p className="ok">{checkMsg}</p>}
            {checkError && (
              <p className="error" role="alert">
                {checkError}
              </p>
            )}

            <label className="label" htmlFor="p-voice">
              صوت {voicePersona.name} 🔊
            </label>
            <select id="p-voice" className="input" value={voice} onChange={(e) => setVoice(e.target.value)}>
              {(['بنت', 'صبي'] as const).map((group) => (
                <optgroup key={group} label={group === 'بنت' ? 'أصوات بنات 👧' : 'أصوات صبيان 👦'}>
                  {VOICES.filter((v) => v.group === group).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button className="ghost" type="button" onClick={sampleVoice} disabled={key.trim() === ''}>
              {sampleBusy ? 'وقّف التجربة ⏸️' : 'اسمع نموذج 🎧'}
            </button>
            {sampleMsg && <p className={sampleBusy ? 'note small' : 'ok'}>{sampleMsg}</p>}
            <p className="note small">
              الصوت الطبيعي من جيميني بلهجة شامية دافية — اختار اللي بيعجبك وبيصير صوت {voicePersona.name} بكل الدروس.
            </p>

            {saved && <p className="ok">{saved}</p>}
            <button className="primary" type="button" onClick={saveSettings}>
              حفظ التغييرات 💾
            </button>
            <button className="danger" type="button" onClick={onReset}>
              تصفير التقدّم
            </button>
          </section>

          <section className="card">
            <h3 className="small-title">باختصار 🧠</h3>
            <div className="style-card">
              <span className="row-sub">أسلوب التعلّم</span>
              <span className="style-big">{style.label}</span>
              <span className="note small">{style.line}</span>
            </div>
            <p className="note small">
              {totalSignals === 0
                ? 'كل ما يحلّ دروس أكتر، الذاكرة بتتعلّم أسلوبه وبتصير أدق.'
                : `${totalSignals} إشارة تعلّم محفوظة — بتتحدّث لحالها مع كل درس.`}
            </p>
            <button className="ghost" type="button" onClick={() => setTab('memory')}>
              افتح ذاكرة الطفل 🧠
            </button>
          </section>

          <section className="card">
            <h3 className="small-title">نسخة احتياطية 💾</h3>
            <p className="note small">
              احفظ دروس وكتب ونجوم وذاكرة الطالب الحالي في ملف. ما بتنحفظ معه رقم الأهل ولا المفتاح، وما بتنحفظ
              صور الصفحات (الدروس نفسها بتنحفظ كاملة).
            </p>
            <button className="ghost" type="button" onClick={exportBackup}>
              صدّر نسخة احتياطية 📤
            </button>
            <label className="ghost shot-btn">
              <input type="file" accept="application/json,.json" onChange={importBackup} hidden />
              استرجع من ملف 📥
            </label>
            {backupMsg && <p className="ok">{backupMsg}</p>}
            {backupError && (
              <p className="error" role="alert">
                {backupError}
              </p>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="card">
            <div className="row-head">
              <h3 className="small-title">أسلوب التعلّم</h3>
              <span className="pill">{totalSignals} إشارة</span>
            </div>
            <div className="style-card">
              <span className="style-big">{style.label}</span>
              <span className="note small">{style.line}</span>
            </div>
            <div className="signal-row">
              {SIGNAL_LABELS.map((s) => (
                <span className="tag" key={s.key}>
                  {s.icon} {s.label}: {memory.signals[s.key] ?? 0}
                </span>
              ))}
            </div>
            <p className="note small">
              هالإشارات بتنحسب من داخل التطبيق بس (سمع، قرا، صوّر، سأل) — ما في ميكروفون ولا مراقبة.
            </p>
          </section>

          <section className="card">
            <h3 className="small-title">مستواه بكل مادة</h3>
            {reads.length === 0 ? (
              <p className="note">بعد أول درس محلول، بينعرض هون مستوى كل مادة ووين بيحتاج دعم.</p>
            ) : (
              <div className="bars">
                {reads.map((r) => (
                  <div className="bar-row" key={r.subject}>
                    <div className="bar-top">
                      <strong>{r.subject}</strong>
                      <span className="row-sub">
                        {r.done} درس · {r.tone === 'none' ? r.label : `${r.accuracy}% · ${r.label}`}
                      </span>
                    </div>
                    <div className="bar">
                      <div className={`bar-fill ${r.tone}`} style={{ width: `${r.tone === 'none' ? 6 : Math.max(8, r.accuracy)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h3 className="small-title">اهتماماته وميوله 💛</h3>
            {memory.interests.length === 0 ? (
              <p className="note">اكتب شو بيحب (كرة، ديناصورات، رسم، فضاء…) و{persona.name} {fem ? 'بتستعملها' : 'بيستعملها'} بأمثلته.</p>
            ) : (
              <div className="signal-row">
                {memory.interests.map((i) => (
                  <span className="tag" key={i}>
                    {i}
                    <button type="button" aria-label={`حذف ${i}`} onClick={() => removeInterest(i)}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="search">
              <input
                className="input"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                placeholder="مثلاً: كرة القدم"
                maxLength={24}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addInterest()
                  }
                }}
              />
              <button className="primary search-btn" type="button" onClick={addInterest} disabled={interest.trim().length < 2}>
                ضيف
              </button>
            </div>

            <label className="label" htmlFor="p-notes">
              ملاحظاتك عن الطفل
            </label>
            <textarea
              id="p-notes"
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={400}
              rows={3}
              placeholder="مثلاً: بيتعب بسرعة من القراءة الطويلة، بيحب يشتغل بإيده."
            />
            <button className="ghost" type="button" onClick={saveNotes}>
              حفظ الملاحظة 💾
            </button>

            {memory.topics.length > 0 && (
              <>
                <span className="label">آخر المواضيع</span>
                <div className="signal-row">
                  {memory.topics.slice(0, 8).map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="card">
            <h3 className="small-title">ملاحظة {persona.name} 📝</h3>
            <p className="note small">
              {persona.name} {fem ? 'بتحلّل أسلوبه ونتايجه وبترجّعلك' : 'بيحلّل أسلوبه ونتايجه وبيجيبلك'} ملاحظة قصيرة مع اقتراح عملي. بتتولّد بس لما تطلبها.
            </p>
            {memory.insight && (
              <p className="insight">
                {memory.insight}
                {memory.insightAt > 0 && <span className="note small"> — {prettyDate(memory.insightAt)}</span>}
              </p>
            )}
            <button className="primary" type="button" onClick={generateInsight} disabled={insightBusy}>
              {insightBusy ? `${persona.name} عم ${fem ? 'تفكّر' : 'يفكّر'}… ⏳` : memory.insight ? 'حدّث الملاحظة ✨' : `اطلب ملاحظة من ${persona.name} ✨`}
            </button>
            {insightError && (
              <p className="error" role="alert">
                {insightError}
              </p>
            )}
          </section>

          <section className="card">
            <p className="note small">
              كل البيانات (الاسم، المفتاح، الدروس، الصور، الذاكرة) محفوظة على هالجهاز فقط، وما بتنطلع منه إلا طلبات
              الشرح اللي بتروح لجيميني بمفتاحك.
            </p>
          </section>
          <section className="card">
            <h3 className="small-title">تقرير أسبوعي 📊</h3>
            <button
              className="primary"
              type="button"
              onClick={() => onShareWeeklyReport(settings.profile)}
            >
              شارك تقرير الأسبوع
            </button>
            <p className="note small">
              ملخص نشاط الأسبوع بناءً على بيانات الذاكرة
            </p>
          </section>
        </>
      )}
    </div>
  )
}

function onShareWeeklyReport(profile: "lily" | "roy") {
  const memory = loadMemory(profile)
  const report = weeklyReport(memory)
  const whatsappText = encodeURIComponent(report || "لا توجد بيانات كافية لهذا الأسبوع")
  const url = `https://wa.me/?text=${whatsappText}`
  window.open(url, "_blank")
}
