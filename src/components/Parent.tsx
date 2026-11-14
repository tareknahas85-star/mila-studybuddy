import { useState } from 'react'
import { checkKey } from '../lib/ai.ts'
import { COMPS } from '../lib/companions.ts'
import { prepareImage, squareAvatar } from '../lib/img.ts'
import { applyNotify } from '../lib/notify.ts'
import type { NotifyPrefs } from '../lib/notify.ts'
import { learningStyle, reportText, subjectReads, weekDays } from '../lib/store.ts'
import type { Book, Memory, Progress, Student, TodaySummary } from '../lib/store.ts'
import { speakNatural, stopNatural, VOICES, primeVoice } from '../lib/tts.ts'
import type { CloudState } from '../lib/sync.ts'
import type { UpdateInfo } from '../lib/update.ts'
import { BookForm } from './forms.tsx'
import { AboutPanel, UpdateBanner } from './UpdateBanner.tsx'
import { AR, Avatar, Icon, dayLabel } from './ui.tsx'

/** طالب بعيون ولي الأمر: محلي (على هالجهاز) أو جاي من Firebase. */
export interface KidView {
  student: Student
  progress: Progress
  memory: Memory
  local: boolean
  books: Book[]
  today: TodaySummary
}

interface Props {
  kids: KidView[]
  selected: string
  deviceMode: 'student' | 'parent'
  apiKey: string
  cloud: CloudState
  cloudErr: string
  notify: NotifyPrefs
  onSelect: (id: string) => void
  onBack: () => void
  onSetLimit: (id: string, min: number) => void
  onSendHw: (id: string, msg: string, photo: string) => Promise<string>
  onSaveKey: (key: string) => void
  onPatchStudent: (id: string, patch: Partial<Student>) => void
  onMemory: (id: string, patch: Partial<Memory>) => void
  onReset: (id: string) => void
  onRemove: (id: string) => void
  onAddStudent: () => void
  onChangePin: () => void
  onNotify: (p: NotifyPrefs) => void
  onConnect: (configText: string, email: string, pass: string) => Promise<string>
  onPair: () => Promise<{ ok: boolean; text: string }>
  onJoin: (text: string) => Promise<string>
  onDisconnect: () => void
  onNarrative: (k: KidView, facts: string) => Promise<{ ok: boolean; text: string }>
  onInsight: (k: KidView) => Promise<{ ok: boolean; text: string }>
  onBookAdd: (kidId: string, title: string, subject: string) => Promise<string>
  onBookArchive: (kidId: string, bookId: string, archived: boolean) => Promise<string>
  onBookDelete: (kidId: string, bookId: string) => Promise<string>
  onExport: (id: string) => Promise<string>
  onImportFile: (f: File) => Promise<string>
  update: UpdateInfo | null
  onCheckUpdate: () => Promise<{ error: string; found: boolean }>
  onUpdateLater: () => void
}

/** ملخص اليوم: الدروس اللي خلّصها، الوقت، والنشاطات. */
function TodayPanel({ kid }: { kid: KidView }) {
  const t = kid.today
  const act = t.teach + t.read
  const none = t.lessons.length === 0 && t.minutes === 0 && act === 0
  return (
    <section className="panel">
      <h3>
        <Icon name="bell" size={22} /> ملخص اليوم
      </h3>
      {none ? (
        <p className="muted bold" style={{ margin: 0 }}>
          ما درس {kid.student.name} اليوم لسا.
        </p>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <b>{AR(t.minutes)}</b>
              <span>دقيقة</span>
            </div>
            <div className="kpi">
              <b>{AR(t.lessons.length)}</b>
              <span>دروس خلّصها</span>
            </div>
            <div className="kpi">
              <b>{AR(act)}</b>
              <span>نشاطات</span>
            </div>
          </div>
          {t.lessons.length > 0 && (
            <div className="chips">
              {t.lessons.map((l) => (
                <span className="chip good" key={l}>
                  {l}
                </span>
              ))}
            </div>
          )}
          {act > 0 && (
            <p className="muted bold" style={{ margin: 0 }}>
              علّم رفيقو {AR(t.teach)} مرة، وقرا بصوت عالي {AR(t.read)} مرة.
            </p>
          )}
        </>
      )}
    </section>
  )
}

/** كتب الطالب بإدارة الأهل: إضافة، أرشفة (مخبّى وبيرجع)، وحذف نهائي، مع زر سماح للطالب. */
function BooksSection({ kid, p }: { kid: KidView; p: Props }) {
  const s = kid.student
  const [msg, setMsg] = useState('')
  const [confirm, setConfirm] = useState('')
  const run = async (fn: () => Promise<string>) => {
    setMsg(await fn())
  }
  const live = kid.books.filter((b) => !b.archived)
  const archived = kid.books.filter((b) => b.archived)
  return (
    <section className="panel">
      <h3>
        <Icon name="book" size={22} /> كتب {s.name}
      </h3>
      <button type="button" className="btn small pick" aria-pressed={s.canEdit} onClick={() => p.onPatchStudent(s.id, { canEdit: !s.canEdit })}>
        {s.canEdit ? 'الطالب بيقدر يضيف ويحذف كتب (اضغط لتمنع)' : 'الطالب ما بيقدر يضيف ولا يحذف (اضغط لتسمح)'}
      </button>
      {kid.books.length === 0 && (
        <p className="muted bold" style={{ margin: 0 }}>
          لسا ما في كتب.
        </p>
      )}
      {live.map((b) => (
        <div className="row" key={b.id}>
          <span className="grow bold">{b.title}</span>
          <span className="muted" style={{ fontSize: 14 }}>
            {b.subject}
          </span>
          <button type="button" className="btn small" onClick={() => void run(() => p.onBookArchive(s.id, b.id, true))}>
            أرشفة
          </button>
        </div>
      ))}
      {archived.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="bold">المؤرشفة (مخبّية عن الطالب)</div>
          {archived.map((b) => (
            <div className="stack" style={{ gap: 6 }} key={b.id}>
              <div className="row">
                <span className="grow bold">{b.title}</span>
                <button type="button" className="btn small mint" onClick={() => void run(() => p.onBookArchive(s.id, b.id, false))}>
                  رجّعو
                </button>
                <button type="button" className="btn small" onClick={() => setConfirm(b.id)}>
                  حذف نهائي
                </button>
              </div>
              {confirm === b.id && (
                <div className="why">
                  <p style={{ margin: '0 0 10px' }}>بيتمسح «{b.title}» ودروسو وصور صفحاتو نهائياً. متأكد؟</p>
                  <div className="row">
                    <button
                      type="button"
                      className="btn accent grow"
                      onClick={() => {
                        setConfirm('')
                        void run(() => p.onBookDelete(s.id, b.id))
                      }}
                    >
                      أي، احذف
                    </button>
                    <button type="button" className="btn grow" onClick={() => setConfirm('')}>
                      لا
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="field">
        أضف كتاب
        <BookForm onSave={(title, subject) => void run(() => p.onBookAdd(s.id, title, subject))} />
      </div>
      {!kid.local && (
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          التغييرات بتوصل لجهاز الطالب لما يكون عندو نت.
        </p>
      )}
      {msg && (
        <p className="error" role="alert">
          {msg}
        </p>
      )}
    </section>
  )
}

/** تصدير واستيراد بيانات الطالب بملف ZIP. */
function BackupSection({ kid, p }: { kid?: KidView; p: Props }) {
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(true)
  const [busy, setBusy] = useState(false)
  const done = (err: string, good: string) => {
    setOk(err === '')
    setMsg(err === '' ? good : err)
  }
  return (
    <section className="panel">
      <h3>
        <Icon name="share" size={22} /> نسخة احتياطية (ZIP)
      </h3>
      <p className="muted bold" style={{ margin: 0, lineHeight: 1.7 }}>
        كل بيانات الطالب بملف واحد: دروسو وكتبو وصور الصفحات وذاكرتو ونجومو. بتحفظو عندك وبترجّعو على أي جهاز. رمز الأهل ومفتاح جيميني ما بيدخلوا بالملف.
      </p>
      {kid?.local && (
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            setMsg('')
            void p.onExport(kid.student.id).then((e) => {
              setBusy(false)
              done(e, 'جاهز. احفظو بمكان أمين.')
            })
          }}
        >
          <Icon name="share" size={22} /> {busy ? 'عم نجهّز…' : `صدّر بيانات ${kid.student.name}`}
        </button>
      )}
      <label className="btn">
        <Icon name="copy" size={22} /> استيراد نسخة (ZIP جديد أو JSON من التطبيق القديم)
        <input
          type="file"
          accept=".zip,.json,application/zip,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            setMsg('')
            void p.onImportFile(f).then((er) => {
              if (er !== '') done(er, '')
            })
          }}
        />
      </label>
      {msg && (
        <p className={ok ? 'ok' : 'error'} role="status">
          {msg}
        </p>
      )}
    </section>
  )
}

function KeySection({ apiKey, onSave }: { apiKey: string; onSave: (k: string) => void }) {
  const [key, setKey] = useState(apiKey)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const test = async () => {
    setBusy(true)
    setMsg('')
    const res = await checkKey(key)
    setBusy(false)
    if (!res.ok) {
      setOk(false)
      setMsg(res.error)
      return
    }
    onSave(key.trim())
    setOk(true)
    setMsg(`المفتاح شغّال (${res.data}) وانحفظ على هالجهاز.`)
  }
  return (
    <section className="panel">
      <h3>
        <Icon name="key" size={22} /> مفتاح جيميني المجاني
      </h3>
      <p className="muted bold" style={{ margin: 0, lineHeight: 1.7 }}>
        للبحث وقراءة الصفحات وصوت الرفيق. من Google AI Studio، وبيضل على هالجهاز بس.
      </p>
      <input className="input ltr" value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza..." autoComplete="off" />
      {msg && (
        <p className={ok ? 'ok' : 'error'} role="status">
          {msg}
        </p>
      )}
      <div className="row">
        <button type="button" className="btn mint grow" disabled={busy || key.trim().length < 20} onClick={() => void test()}>
          {busy ? 'عم نفحص…' : 'افحص واحفظ'}
        </button>
        {apiKey !== '' && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              onSave('')
              setKey('')
              setMsg('انمسح المفتاح.')
              setOk(true)
            }}
          >
            امسح
          </button>
        )}
      </div>
    </section>
  )
}

function HomeworkSection({ kid, onSend }: { kid: KidView; onSend: (id: string, msg: string, photo: string) => Promise<string> }) {
  const [msg, setMsg] = useState('')
  const [photo, setPhoto] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [ok, setOk] = useState(false)
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const prep = await prepareImage(f, 900, 0.6)
    if (prep) setPhoto(prep.dataUrl)
  }
  const send = async () => {
    setBusy(true)
    setNote('')
    const err = await onSend(kid.student.id, msg.trim(), photo)
    setBusy(false)
    setOk(err === '')
    setNote(err === '' ? 'انبعت الواجب.' : err)
    if (err === '') {
      setMsg('')
      setPhoto('')
    }
  }
  return (
    <section className="panel">
      <h3>
        <Icon name="send" size={22} /> واجب لـ{kid.student.name}
      </h3>
      <input className="input" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={80} placeholder="مثلاً: صفحة ٩ التمرين ٢" />
      <label className="photo-card">
        <Icon name="cam" size={26} sw={2} />
        <span>{photo ? 'غيّر الصورة' : 'صوّر صفحة الواجب (اختياري)'}</span>
        <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => void pick(e)} />
      </label>
      {photo && (
        <div className="taped-photo" style={{ maxWidth: '60%', alignSelf: 'center' }}>
          <img src={photo} alt="معاينة الواجب" />
        </div>
      )}
      {note && (
        <p className={ok ? 'ok' : 'error'} role="status">
          {note}
        </p>
      )}
      <button type="button" className="btn yellow" disabled={busy || (msg.trim() === '' && photo === '')} onClick={() => void send()}>
        {busy ? '…' : 'ابعت للطالب'}
      </button>
    </section>
  )
}

function CloudSection(p: Pick<Props, 'cloud' | 'cloudErr' | 'deviceMode' | 'onConnect' | 'onPair' | 'onJoin' | 'onDisconnect'>) {
  const { cloud, deviceMode } = p
  const [cfg, setCfg] = useState('')
  const [email, setEmail] = useState(cloud.email)
  const [pass, setPass] = useState('')
  const [pairText, setPairText] = useState('')
  const [joinText, setJoinText] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<string>) => {
    setBusy(true)
    setMsg('')
    const err = await fn()
    setBusy(false)
    if (err !== '') setMsg(err)
  }

  return (
    <section className="panel">
      <h3>
        <Icon name="cloud" size={22} /> ربط الأهل مع الطالب (Firebase)
      </h3>
      {deviceMode === 'parent' ? (
        cloud.role === 'parent' ? (
          <>
            <p className="ok">مسجّل دخول: {cloud.email}</p>
            <button
              type="button"
              className="btn yellow"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const r = await p.onPair()
                  if (r.ok) setPairText(r.text)
                  return r.ok ? '' : r.text
                })
              }
            >
              اعمل كود ربط لجهاز طالب
            </button>
            {pairText !== '' && (
              <>
                <textarea className="input ltr area" readOnly value={pairText} aria-label="كود الربط" onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className="btn small" onClick={() => void navigator.clipboard?.writeText(pairText)}>
                  <Icon name="copy" size={20} /> انسخ الكود
                </button>
                <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                  الصقو بجهاز الطالب من «اربط بجهاز الأهل». صالح ١٠ دقايق.
                </p>
              </>
            )}
            <button type="button" className="btn ghost small" onClick={p.onDisconnect}>
              افصل هالجهاز
            </button>
          </>
        ) : (
          <>
            <p className="muted bold" style={{ margin: 0, lineHeight: 1.7 }}>
              الصق إعدادات مشروع Firebase (firebaseConfig)، وسجّل دخول بإيميلك. أول مرة بينعمل الحساب.
            </p>
            <textarea className="input ltr area" value={cfg} onChange={(e) => setCfg(e.target.value)} placeholder={'{ apiKey: "...", projectId: "...", appId: "..." }'} />
            <input className="input ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" autoComplete="off" />
            <input className="input ltr" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="كلمة السر (٦ خانات على الأقل)" autoComplete="off" />
            <button type="button" className="btn yellow" disabled={busy || cfg.trim() === '' || email.trim() === '' || pass.length < 6} onClick={() => void run(() => p.onConnect(cfg, email.trim(), pass))}>
              {busy ? '…' : 'سجّل دخول'}
            </button>
          </>
        )
      ) : cloud.role === 'device' ? (
        <>
          <p className="ok">هالجهاز مربوط بجهاز الأهل.</p>
          <button type="button" className="btn ghost small" onClick={p.onDisconnect}>
            افصل الربط
          </button>
        </>
      ) : (
        <>
          <p className="muted bold" style={{ margin: 0, lineHeight: 1.7 }}>
            الصق كود الربط اللي طلع بجهاز الأهل، لتوصل التقارير والواجبات.
          </p>
          <textarea className="input ltr area" value={joinText} onChange={(e) => setJoinText(e.target.value)} placeholder="SB1...." />
          <button type="button" className="btn yellow" disabled={busy || joinText.trim() === ''} onClick={() => void run(() => p.onJoin(joinText))}>
            {busy ? '…' : 'اربط'}
          </button>
        </>
      )}
      {(msg || p.cloudErr) && (
        <p className="error" role="alert">
          {msg || p.cloudErr}
        </p>
      )}
    </section>
  )
}

const HOURS = [-1, 16, 17, 18, 19]

/** قسم الأهل: التقدم، الذاكرة، التقرير، التحكم، الواجبات، والربط. */
export default function Parent(p: Props) {
  const kid = p.kids.find((k) => k.student.id === p.selected) ?? p.kids[0]
  const [narr, setNarr] = useState({ text: '', busy: false, err: '' })
  const [insight, setInsight] = useState({ busy: false, err: '' })
  const [confirm, setConfirm] = useState<'' | 'reset' | 'remove'>('')
  const [interests, setInterests] = useState('')
  const [notes, setNotes] = useState('')
  const [notifyMsg, setNotifyMsg] = useState('')
  const [voiceMsg, setVoiceMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const head = (
    <div className="pp-head">
      <button type="button" className="icon-btn" onClick={p.onBack} aria-label="رجوع">
        <Icon name="back" size={22} sw={2.6} />
      </button>
      <h1 className="display" style={{ margin: 0, fontSize: 28, flex: 1 }}>
        قسم الأهل
      </h1>
      <span className="sync">
        <Icon name="cloud" size={15} sw={2.4} /> {p.cloud.role !== '' ? 'مربوط' : 'محلي'}
      </span>
    </div>
  )

  if (!kid) {
    return (
      <main className="screen paper">
        <div className="pp">
          {head}
          <p className="muted bold">لسا ما في طلاب. {p.deviceMode === 'parent' ? 'اربط جهاز طالب من الأسفل ليظهر هون.' : ''}</p>
          {p.deviceMode === 'student' && (
            <button type="button" className="btn yellow" onClick={p.onAddStudent}>
              <Icon name="plus" size={22} sw={2.6} /> أضف طالب
            </button>
          )}
          <CloudSection {...p} />
          <BackupSection p={p} />
          <KeySection apiKey={p.apiKey} onSave={p.onSaveKey} />
        </div>
      </main>
    )
  }

  const s = kid.student
  const wk = weekDays(kid.progress)
  const mins = Math.round(wk.reduce((a, x) => a + x.sec, 0) / 60)
  const mx = Math.max(1800, ...wk.map((x) => x.sec))
  const skills = Object.entries(kid.memory.skills)
    .map(([n, v]) => ({ n, ratio: v.ok / (v.ok + v.bad || 1), t: v.ok + v.bad }))
    .sort((a, b) => a.ratio - b.ratio)
  const tags = Object.entries(kid.memory.tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
  const good = skills.filter((x) => x.t >= 3 && x.ratio >= 0.75).map((x) => x.n)
  const reads = subjectReads(kid.memory)
  const style = learningStyle(kid.memory)
  const facts = reportText(s, kid.progress, kid.memory)
  const comp = COMPS[s.comp]

  const narrate = async () => {
    setNarr({ text: '', busy: true, err: '' })
    const r = await p.onNarrative(kid, facts)
    setNarr(r.ok ? { text: r.text, busy: false, err: '' } : { text: '', busy: false, err: r.text })
  }

  const copy = () => {
    const t = narr.text || facts
    void navigator.clipboard?.writeText(t).then(() => setCopied(true))
  }

  const setNotify = async (next: NotifyPrefs) => {
    p.onNotify(next)
    setNotifyMsg(await applyNotify(next))
  }

  const sampleVoice = () => {
    setVoiceMsg('')
    if (p.apiKey.trim() === '') {
      setVoiceMsg('بدّك مفتاح جيميني لتسمع الصوت الطبيعي.')
      return
    }
    stopNatural()
    primeVoice()
    speakNatural({ text: `أهلين ${s.name}! أنا ${comp.name}، رفيقك بالدراسة. يلا نتعلّم شي جديد.`, apiKey: p.apiKey, voice: s.voice }, { onError: () => setVoiceMsg('الصوت ما كان جاهز هلق. جرّب مرة تانية.') })
  }

  return (
    <main className="screen paper">
      <div className="pp">
        {head}
        {p.update && <UpdateBanner info={p.update} onLater={p.onUpdateLater} />}

        <div className="kid-tabs" role="group" aria-label="الطلاب">
          {p.kids.map((k) => (
            <button key={k.student.id} type="button" className="kid-tab" aria-pressed={k.student.id === s.id} onClick={() => p.onSelect(k.student.id)}>
              <Avatar av={k.student.av} name={k.student.name} />
              <span>{k.student.name}</span>
            </button>
          ))}
          {p.deviceMode === 'student' && (
            <button type="button" className="kid-tab" aria-label="إضافة طالب" onClick={p.onAddStudent}>
              <Icon name="plus" size={22} sw={2.6} />
            </button>
          )}
        </div>

        <TodayPanel kid={kid} />

        <section className="panel">
          <h3>
            <Icon name="chart" size={22} /> هالأسبوع
          </h3>
          <div className="kpis">
            <div className="kpi">
              <b>{AR(kid.progress.lessonsDone)}</b>
              <span>دروس منجزة</span>
            </div>
            <div className="kpi">
              <b>{AR(mins)}</b>
              <span>دقيقة</span>
            </div>
            <div className="kpi">
              <b>{AR(kid.progress.stars)}</b>
              <span>نجمة</span>
            </div>
          </div>
          <div className="week" role="img" aria-label="دقائق الدراسة بآخر ٧ أيام">
            {wk.map((x) => (
              <div className="wk" key={x.key}>
                <em>{x.sec ? AR(Math.round(x.sec / 60)) : ''}</em>
                <div className={`bar ${x.today ? 'today' : ''}`} style={{ height: Math.round((x.sec / mx) * 92) + 4 }} />
                <small>{dayLabel(x.key)}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>الذاكرة: وين بيقوى ووين بيتعثّر</h3>
          {skills.length === 0 && reads.length === 0 ? (
            <p className="muted bold" style={{ margin: 0 }}>
              لسا ما في بيانات. بتظهر بعد أول درس.
            </p>
          ) : (
            skills.slice(0, 8).map((x) => {
              const pc = Math.round(x.ratio * 100)
              return (
                <div className="meter" key={x.n}>
                  <div className="lab">
                    <span>{x.n}</span>
                    <span>{AR(pc)}٪</span>
                  </div>
                  <div className="trk">
                    <div className={`fil ${pc >= 75 ? '' : pc >= 50 ? 'mid' : 'low'}`} style={{ width: `${pc}%` }} />
                  </div>
                </div>
              )
            })
          )}
          {tags.length > 0 && (
            <div>
              <div className="bold" style={{ marginBottom: 6 }}>أغلاط بتتكرر</div>
              <div className="chips">
                {tags.map(([t, c]) => (
                  <span className="chip warn" key={t}>
                    {t} ×{AR(c)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {good.length > 0 && (
            <div>
              <div className="bold" style={{ marginBottom: 6 }}>نقاط قوة</div>
              <div className="chips">
                {good.map((t) => (
                  <span className="chip good" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {style.key !== 'none' && <p className="muted bold" style={{ margin: 0 }}>{style.label}: {style.line}</p>}
        </section>

        <section className="panel">
          <h3>تقرير الأسبوع من {comp.name}</h3>
          <div className="report">{narr.text || facts}</div>
          {narr.err && (
            <p className="error" role="alert">
              {narr.err}
            </p>
          )}
          <div className="row">
            <button type="button" className="btn small grow" disabled={narr.busy || p.apiKey.trim() === ''} onClick={() => void narrate()}>
              {narr.busy ? '…' : `اكتبو بصوت ${comp.name}`}
            </button>
            <button type="button" className="btn small" onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} size={20} /> {copied ? 'اننسخ' : 'انسخ'}
            </button>
            <a className="btn small" href={`https://wa.me/?text=${encodeURIComponent(narr.text || facts)}`} target="_blank" rel="noreferrer noopener">
              <Icon name="share" size={20} /> واتساب
            </a>
          </div>
          {p.apiKey.trim() === '' && <p className="muted" style={{ margin: 0, fontSize: 14 }}>الكتابة بصوت الرفيق بدها مفتاح جيميني على هالجهاز.</p>}
        </section>

        <section className="panel">
          <h3>تحكّم</h3>
          <div className="field">
            حد الدراسة باليوم لـ{s.name}
            <div className="seg">
              {[0, 20, 40, 60].map((v) => (
                <button key={v} type="button" className="btn small pick" aria-pressed={s.limitMin === v} onClick={() => p.onSetLimit(s.id, v)}>
                  {v === 0 ? 'بلا حد' : `${AR(v)} دقيقة`}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            هدف الأسبوع لـ{s.name}
            <div className="seg">
              {[0, 3, 5, 7].map((v) => (
                <button key={v} type="button" className="btn small pick" aria-pressed={s.goal === v} onClick={() => p.onPatchStudent(s.id, { goal: v })}>
                  {v === 0 ? 'مسكّر' : `${AR(v)} دروس`}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            أقصى دروس بنجوم باليوم
            <div className="seg">
              {[1, 2, 3, 5, 0].map((v) => (
                <button key={v} type="button" className="btn small pick" aria-pressed={s.starCap === v} onClick={() => p.onPatchStudent(s.id, { starCap: v })}>
                  {v === 0 ? 'بلا حد' : `${AR(v)} دروس`}
                </button>
              ))}
            </div>
          </div>
        </section>

        <HomeworkSection kid={kid} onSend={p.onSendHw} />

        <BooksSection kid={kid} p={p} />

        {kid.local && (
          <section className="panel">
            <h3>عن {s.name}</h3>
            <label className="photo-card">
              <Avatar av={s.av} name={s.name} />
              <span>غيّر صورة {s.name}</span>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void squareAvatar(f).then((d) => d && p.onPatchStudent(s.id, { av: d }))
                }}
              />
            </label>
            <div className="field">
              صوت {comp.name}
              <div className="chips">
                {VOICES.map((v) => (
                  <button key={v.id} type="button" className="chip pick" aria-pressed={s.voice === v.id} onClick={() => p.onPatchStudent(s.id, { voice: v.id })}>
                    {v.group}: {v.label}
                  </button>
                ))}
              </div>
              <button type="button" className="btn small" onClick={sampleVoice}>
                <Icon name="speaker" size={20} /> جرّب الصوت
              </button>
              {voiceMsg && <p className="error" role="status">{voiceMsg}</p>}
            </div>
            <label className="field">
              اهتماماتو (بفاصلة)
              <input
                className="input"
                value={interests}
                placeholder={kid.memory.interests.join('، ') || 'مثلاً: فضا، ديناصورات'}
                onChange={(e) => setInterests(e.target.value)}
                onBlur={() => {
                  if (interests.trim() !== '') {
                    p.onMemory(s.id, { interests: interests.split(/[,،]/).map((x) => x.trim()).filter((x) => x !== '').slice(0, 10) })
                    setInterests('')
                  }
                }}
              />
            </label>
            <label className="field">
              ملاحظاتك للرفيق
              <textarea
                className="input area"
                value={notes || kid.memory.notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => p.onMemory(s.id, { notes: notes.trim() })}
                placeholder="مثلاً: بيتشتت بسرعة، بيحب الأمثلة من الكورة"
              />
            </label>
            <button
              type="button"
              className="btn small"
              disabled={insight.busy || p.apiKey.trim() === ''}
              onClick={() => {
                setInsight({ busy: true, err: '' })
                void p.onInsight(kid).then((r) => setInsight({ busy: false, err: r.ok ? '' : r.text }))
              }}
            >
              {insight.busy ? '…' : `ملاحظة من ${comp.name} عن طريقة تعلّمو`}
            </button>
            {insight.err && <p className="error" role="alert">{insight.err}</p>}
            {kid.memory.insight !== '' && <div className="report">{kid.memory.insight}</div>}
          </section>
        )}

        <KeySection apiKey={p.apiKey} onSave={p.onSaveKey} />

        <section className="panel">
          <h3>
            <Icon name="bell" size={22} /> التذكيرات
          </h3>
          {p.deviceMode === 'student' ? (
            <div className="field">
              تذكير يومي بوقت الدراسة
              <div className="chips">
                {HOURS.map((h) => (
                  <button key={h} type="button" className="chip pick" aria-pressed={p.notify.dailyHour === h} onClick={() => void setNotify({ ...p.notify, dailyHour: h })}>
                    {h < 0 ? 'مسكّر' : `${AR(h > 12 ? h - 12 : h)} المسا`}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="field">
                إشعار "ملخص اليوم جاهز"
                <div className="chips">
                  {[-1, 19, 20, 21].map((h) => (
                    <button key={h} type="button" className="chip pick" aria-pressed={p.notify.summaryHour === h} onClick={() => void setNotify({ ...p.notify, summaryHour: h })}>
                      {h < 0 ? 'مسكّر' : `${AR(h - 12)} المسا`}
                    </button>
                  ))}
                </div>
                <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>الإشعار عام، والتفاصيل بتنقرا جوّا قسم الأهل.</span>
              </div>
              <button type="button" className="btn pick" aria-pressed={p.notify.fridayReport} onClick={() => void setNotify({ ...p.notify, fridayReport: !p.notify.fridayReport })}>
                تذكير كل جمعة ٦ المسا بتقرير الأسبوع
              </button>
            </>
          )}
          {notifyMsg && <p className="error" role="status">{notifyMsg}</p>}
        </section>

        <CloudSection {...p} />

        <BackupSection kid={kid} p={p} />

        <AboutPanel onCheck={p.onCheckUpdate} />

        <section className="panel">
          <h3>إعدادات</h3>
          <button type="button" className="list-btn" onClick={p.onChangePin}>
            <Icon name="lock" size={24} />
            <span className="grow">غيّر رمز القفل</span>
          </button>
          {kid.local && (
            <>
              <button type="button" className="list-btn" onClick={() => setConfirm('reset')}>
                <Icon name="swap" size={24} />
                <span className="grow">صفّر نجوم وتقدم {s.name}</span>
              </button>
              <button type="button" className="list-btn" onClick={() => setConfirm('remove')}>
                <Icon name="trash" size={24} />
                <span className="grow">احذف {s.name} من هالجهاز</span>
              </button>
            </>
          )}
          {confirm !== '' && (
            <div className="why">
              <p style={{ margin: '0 0 10px' }}>
                {confirm === 'reset' ? `بيتصفّر التقدم والنجوم والستيكرات. الدروس بتضل.` : `بيتمسح ${s.name} وكل كتبو ودروسو من هالجهاز.`} متأكد؟
              </p>
              <div className="row">
                <button
                  type="button"
                  className="btn accent grow"
                  onClick={() => {
                    if (confirm === 'reset') p.onReset(s.id)
                    else p.onRemove(s.id)
                    setConfirm('')
                  }}
                >
                  أي، كمّل
                </button>
                <button type="button" className="btn grow" onClick={() => setConfirm('')}>
                  لا
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
