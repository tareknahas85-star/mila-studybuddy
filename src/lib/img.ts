// تصغير الصورة على الجهاز قبل الإرسال: أسرع، أرحم لباقة الإنترنت، وأوضح لجيميني
// (صور الموبايل ٤٠٠٠ بكسل ما إلها داعي للشرح).
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

/** صورة الطالب: مربّعة من وسط الصورة، مصغّرة ومضغوطة (بتنحفظ جوّا بيانات الطالب). */
export async function squareAvatar(file: File, size = 256, quality = 0.8): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
    bitmap.close?.()
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return null
  }
}
