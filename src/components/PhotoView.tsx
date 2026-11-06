import { useState, type ChangeEvent } from 'react'
import { analyzePhoto, type Analysis } from '../lib/ai.ts'
import type { Settings } from '../lib/store.ts'

function readAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

/** صوّري صفحة: الصورة بتنقرأ على الجهاز، وبتنرسل لجيميني بمفتاح ولي الأمر — ما بتنحفظ عندنا. */
export default function PhotoView({ settings, onMood }: { settings: Settings; onMood: (m: 'think' | 'laugh' | 'tired') => void }) {
  const [image, setImage] = useState<string | null>(null)
  const [result, setResult] = useState<Analysis | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await readAsDataUrl(file)
    if (!dataUrl) return setError('ما قدرنا نقرأ الصورة، جرّبي صورة تانية.')
    setImage(dataUrl)
    setResult(null)
    setError('')
  }

  const analyze = async () => {
    if (!image) return
    setBusy(true)
    setError('')
    onMood('think')
    const res = await analyzePhoto({
      apiKey: settings.geminiKey,
      imageDataUrl: image,
      childName: settings.childName,
      grade: settings.grade,
    })
    setBusy(false)
    if (res.ok) {
      setResult(res.data)
      onMood('laugh')
      return
    }
    setError(res.error)
    onMood('tired')
  }

  return (
    <div className="card">
      <h2 className="title">📸 صوّري صفحة من الكتاب</h2>
      <p className="note">ميلا بتقرأ المسألة وبتشرحلك خطوة خطوة — بدون ما تعطيك الجواب جاهز.</p>
      <p className="note small">🔒 صورتك بتنقرأ لحظة التحليل بس، وما بتنحفظ على أي سيرفر.</p>

      <div className="actions">
        <label className="primary file">
          <span>📷 افتحي الكاميرا</span>
          <input type="file" accept="image/*" capture="environment" onChange={pick} hidden />
        </label>
        <label className="ghost file">
          <span>🖼️ اختاري صورة</span>
          <input type="file" accept="image/*" onChange={pick} hidden />
        </label>
      </div>

      {image && <img className="preview" src={image} alt="الصفحة المرفوعة" />}

      {image && !result && (
        <button className="primary" type="button" onClick={analyze} disabled={busy}>
          {busy ? '⏳ ميلا عم تقرا الصفحة...' : '✨ خلي ميلا تحلل الصفحة'}
        </button>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <div className="analysis">
          <h3 className="title small-title">{result.topic}</h3>
          {result.question && <p className="question">{result.question}</p>}
          <p className="greeting">“{result.greeting}”</p>
          <ol className="steps">
            {result.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="hints">
            {result.hints.map((h, i) => (
              <p className="hint" key={i}>
                <span className="hint-num">{i + 1}</span>
                {h}
              </p>
            ))}
          </div>
          {result.videoQuery && (
            <a
              className="ghost file"
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(result.videoQuery)}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              ▶️ فيديو شرح عن {result.topic}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
