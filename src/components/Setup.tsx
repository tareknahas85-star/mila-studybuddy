import { useState } from 'react'
import { checkKey } from '../lib/ai.ts'
import { COMP_ORDER } from '../lib/companions.ts'
import { loadParent, saveParent } from '../lib/store.ts'
import type { Student } from '../lib/store.ts'
import { SEC_QUESTIONS, setPin, setSecurityQ } from '../lib/security.ts'
import { StudentForm } from './forms.tsx'
import { Companion, Icon, PinPad } from './ui.tsx'

/** أول شاشة: هالجهاز لمين؟ */
export function Welcome({ onPick }: { onPick: (mode: 'student' | 'parent') => void }) {
  return (
    <main className="screen paper welcome">
      <div className="parade">
        {COMP_ORDER.map((id, i) => (
          <Companion key={id} id={id} size={64} mood={(['happy', 'cheer', 'think', 'happy', 'cheer'] as const)[i]} cls={i % 2 ? 'idle' : 'bounce'} acc={{}} />
        ))}
      </div>
      <div>
        <div className="label-tag">رفيقك بالدراسة</div>
        <h1 className="display big">StudyBuddy</h1>
      </div>
      <div className="role-btns">
        <button type="button" className="btn yellow" onClick={() => onPick('student')}>
          <Icon name="smile" size={28} /> هالجهاز للطالب
        </button>
        <button type="button" className="btn" onClick={() => onPick('parent')}>
          <Icon name="lock" size={26} /> هالجهاز لولي الأمر
        </button>
      </div>
      <p className="muted bold" style={{ margin: 0, maxWidth: 320 }}>
        جهاز الطالب: فيه الدروس وقسم الأهل بقفل. جهاز ولي الأمر: بيتابع تقدم الطلاب من بعيد.
      </p>
    </main>
  )
}

type Step = 'pin' | 'confirm' | 'q' | 'key' | 'student'

/** تحضير التطبيق: رمز الأهل، سؤال أمان، مفتاح جيميني (للطالب)، وأول طالب. */
export function Setup({ mode, start = 'pin', onFinish }: { mode: 'student' | 'parent'; start?: 'pin' | 'student'; onFinish: (first: Student | null) => void }) {
  const [step, setStep] = useState<Step>(start)
  const [pin1, setPin1] = useState('')
  const [q, setQ] = useState(SEC_QUESTIONS[0])
  const [ans, setAns] = useState('')
  const [key, setKey] = useState('')
  const [keyMsg, setKeyMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const afterQ = () => (mode === 'student' ? setStep('key') : onFinish(null))

  if (step === 'pin' || step === 'confirm') {
    return (
      <main className="screen paper welcome">
        <Companion id="robo" size={110} mood="think" acc={{}} />
        <h1 className="display" style={{ margin: 0 }}>حضّر قسم الأهل</h1>
        {step === 'pin' ? (
          <PinPad
            key="pin"
            title="اختار رمز لقسم الأهل"
            sub="٤ لـ ٦ أرقام. الأولاد ما لازم يعرفوه."
            onClose={() => undefined}
            onSubmit={async (p) => {
              setPin1(p)
              setStep('confirm')
              return { ok: true }
            }}
          />
        ) : (
          <PinPad
            key="confirm"
            title="أكّد الرمز"
            sub="اكتبو مرة تانية."
            onClose={() => setStep('pin')}
            onSubmit={async (p) => {
              if (p !== pin1) return { ok: false, msg: 'مو نفس الرمز. جرّب كمان مرة.' }
              await setPin(p)
              setStep('q')
              return { ok: true }
            }}
          />
        )}
      </main>
    )
  }

  if (step === 'q') {
    return (
      <main className="screen paper setup">
        <h1 className="display" style={{ margin: 0 }}>سؤال أمان</h1>
        <p className="muted bold" style={{ margin: 0 }}>إذا نسيت الرمز، جوابك بيرجّعلك الدخول.</p>
        <label className="field">
          السؤال
          <select className="input" value={q} onChange={(e) => setQ(e.target.value)}>
            {SEC_QUESTIONS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="field">
          الجواب
          <input className="input" value={ans} onChange={(e) => setAns(e.target.value)} autoComplete="off" />
        </label>
        <button
          type="button"
          className="btn yellow"
          disabled={ans.trim() === ''}
          onClick={() => {
            void setSecurityQ(q, ans).then(afterQ)
          }}
        >
          احفظ
        </button>
        <button type="button" className="btn ghost" onClick={afterQ}>
          تخطّى
        </button>
      </main>
    )
  }

  if (step === 'key') {
    const test = async () => {
      setBusy(true)
      setKeyMsg('')
      const res = await checkKey(key)
      setBusy(false)
      if (!res.ok) {
        setKeyMsg(res.error)
        return
      }
      saveParent({ ...loadParent(), geminiKey: key.trim() })
      setKeyMsg(`المفتاح شغّال (${res.data}) وانحفظ.`)
    }
    return (
      <main className="screen paper setup">
        <h1 className="display" style={{ margin: 0 }}>مفتاح جيميني المجاني</h1>
        <p className="muted bold" style={{ margin: 0, lineHeight: 1.7 }}>
          بدونو البحث وقراءة صفحات الكتب وصوت الرفيق ما بيشتغلوا. بتجيبو مجاناً من Google AI Studio، وبيضل على هالجهاز بس.
        </p>
        <input className="input ltr" value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza..." autoComplete="off" />
        {keyMsg && <p className={keyMsg.startsWith('المفتاح شغّال') ? 'ok' : 'error'} role="status">{keyMsg}</p>}
        <button type="button" className="btn mint" disabled={busy || key.trim().length < 20} onClick={() => void test()}>
          {busy ? 'عم نفحص…' : 'افحص واحفظ'}
        </button>
        <button type="button" className="btn yellow" onClick={() => setStep('student')}>
          كمّل
        </button>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>فيك تتخطّى هالخطوة وتحطو لاحقاً من قسم الأهل.</p>
      </main>
    )
  }

  return (
    <main className="screen paper setup">
      <h1 className="display" style={{ margin: 0 }}>مين الطالب؟</h1>
      <StudentForm submitLabel="احفظ وابدأ" onSave={(s) => onFinish(s)} />
    </main>
  )
}
