import { useEffect, useState } from 'react'
import { loadImageUrl } from '../lib/archive.ts'

/** صورة درس محفوظة بـIndexedDB — بتنعرض من الجهاز مباشرة وبلا رفع. */
export default function Shot({ id, className, alt }: { id: string; className?: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setUrl(null)
    void loadImageUrl(id).then((u) => {
      if (live) setUrl(u)
    })
    return () => {
      live = false
    }
  }, [id])

  if (!url) return null
  return <img className={className} src={url} alt={alt ?? 'صفحة الدرس'} />
}
