// تصغير الصورة على الجهاز قبل الإرسال: أسرع، أرحم لباقة الإنترنت، وأوضح لجيميني
// (صور الموبايل ٤٠٠٠ بكسل ما إلها داعي للشرح).
//
// خصوصية: الصورة بتنرسم على canvas وبتنعاد تشفيرها، فكل البيانات المدموجة بالملف الأصلي
// (EXIF، GPS، وقت وموديل الكاميرا، XMP) ما بتنتقل للصورة اللي بتنبعت لجيميني.
// لا تغيّر هالخطوة بدون ما تتأكد إن الـmetadata لسا بتنحذف.
export interface Prepared {
  dataUrl: string
  blob: Blob
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read')))
    reader.onerror = () => reject(reader.error ?? new Error('read'))
    reader.readAsDataURL(blob)
  })
}

function loadBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

export async function prepareImage(file: File, maxSide = 1400, quality = 0.72): Promise<Prepared | null> {
  if (!file.type.startsWith('image/')) return null
  try {
    const bitmap = await loadBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return null
    return { blob, dataUrl: await readAsDataUrl(blob) }
  } catch {
    return null
  }
}

export function prettyDate(ts: number): string {
  try {
    return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long' }).format(new Date(ts))
  } catch {
    return ''
  }
}
