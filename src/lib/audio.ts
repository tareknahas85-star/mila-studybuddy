// تسجيل صوت الطالب وهو يقرا: بيتحوّل لـWAV صغير (١٦ كيلوهرتز، مونو) وبينبعت لجيميني لحظة التحليل بس، وما بينحفظ.
export interface Recording {
  stop: () => Promise<Blob>
  cancel: () => void
}

export type StartResult = { ok: true; rec: Recording } | { ok: false; error: string }

export async function startRecording(): Promise<StartResult> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    return { ok: false, error: 'التسجيل مو مدعوم على هالجهاز.' }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    const chunks: Blob[] = []
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    const done = new Promise<Blob>((resolve) => {
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        resolve(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }))
      }
    })
    mr.start()
    return {
      ok: true,
      rec: {
        stop: () => {
          if (mr.state !== 'inactive') mr.stop()
          return done
        },
        cancel: () => {
          try {
            if (mr.state !== 'inactive') mr.stop()
          } catch {
            // ما في شي نعمله.
          }
          stream.getTracks().forEach((t) => t.stop())
        },
      },
    }
  } catch {
    return { ok: false, error: 'ما قدرنا نفتح الميكروفون. اسمح بالإذن من إعدادات التلفون وجرّب.' }
  }
}

function writeStr(v: DataView, at: number, s: string): void {
  for (let i = 0; i < s.length; i += 1) v.setUint8(at + i, s.charCodeAt(i))
}

/** تسجيل المتصفح (webm/mp4) ← WAV مونو ١٦ كيلوهرتز بصيغة base64. */
export async function blobToWavBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AC()
  const audio = await ctx.decodeAudioData(buf)
  void ctx.close()
  const rate = 16000
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * rate)), rate)
  const src = off.createBufferSource()
  src.buffer = audio
  src.connect(off.destination)
  src.start()
  const pcm = (await off.startRendering()).getChannelData(0)

  const wav = new ArrayBuffer(44 + pcm.length * 2)
  const v = new DataView(wav)
  writeStr(v, 0, 'RIFF')
  v.setUint32(4, 36 + pcm.length * 2, true)
  writeStr(v, 8, 'WAVE')
  writeStr(v, 12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  writeStr(v, 36, 'data')
  v.setUint32(40, pcm.length * 2, true)
  for (let i = 0; i < pcm.length; i += 1) {
    const s = Math.max(-1, Math.min(1, pcm[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  const bytes = new Uint8Array(wav)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
