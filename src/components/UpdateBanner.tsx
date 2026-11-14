import { useState } from 'react'
import { APP_VERSION, openUpdate } from '../lib/update.ts'
import type { UpdateInfo } from '../lib/update.ts'
import { Icon } from './ui.tsx'

/** بانر "في نسخة جديدة": بيطلع عند الطالب وعند الأهل. التحديث بينزل فوق النسخة الحالية والبيانات بتضل. */
export function UpdateBanner({ info, onLater }: { info: UpdateInfo; onLater: () => void }) {
  const [more, setMore] = useState(false)
  return (
    <section className="update" role="status">
      <div className="row">
        <Icon name="bell" size={22} sw={2.2} />
        <b className="grow">في نسخة جديدة: {info.version}</b>
      </div>
      <p style={{ margin: 0, lineHeight: 1.7, fontWeight: 600 }}>
        التحديث بينزل فوق النسخة اللي عندك، وبياناتك (الدروس والنجوم والكتب) بتضل. للأمان قبل ما تحدّث، صدّر نسخة ZIP من قسم الأهل.
      </p>
      {more && info.notes !== '' && <div className="report">{info.notes}</div>}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn yellow grow" onClick={() => openUpdate(info)}>
          نزّل التحديث
        </button>
        {info.notes !== '' && (
          <button type="button" className="btn small" onClick={() => setMore(!more)}>
            {more ? 'خبّي' : 'شو الجديد'}
          </button>
        )}
        <button type="button" className="btn small ghost" onClick={onLater}>
          لاحقاً
        </button>
      </div>
    </section>
  )
}

/** "عن التطبيق": رقم النسخة وزر فحص التحديثات يدوياً. */
export function AboutPanel({ onCheck }: { onCheck: () => Promise<{ error: string; found: boolean }> }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(true)
  return (
    <section className="panel">
      <h3>
        <Icon name="cloud" size={22} /> عن التطبيق
      </h3>
      <div className="bold">النسخة {APP_VERSION}</div>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => {
          setBusy(true)
          setMsg('')
          void onCheck().then((r) => {
            setBusy(false)
            setOk(r.error === '')
            setMsg(r.error !== '' ? r.error : r.found ? 'في نسخة جديدة! شوفها بالبانر فوق.' : 'إنت على آخر نسخة.')
          })
        }}
      >
        {busy ? 'عم نفحص…' : 'تحقق من وجود تحديث'}
      </button>
      {msg && (
        <p className={ok ? 'ok' : 'error'} role="status">
          {msg}
        </p>
      )}
    </section>
  )
}
