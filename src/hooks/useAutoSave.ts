import { useEffect } from 'react'
import html2canvas from 'html2canvas'
import { useSessionStore } from '../store/useSessionStore.js'

export function useAutoSave(canvasRef: React.RefObject<HTMLElement | null>) {
  const { generationStatus, activeSessionId, setThumbnail } = useSessionStore()

  useEffect(() => {
    if (generationStatus !== 'complete') return
    if (!activeSessionId) return
    const el = canvasRef.current
    if (!el) return

    let cancelled = false

    html2canvas(el, {
      scale: 0.4,
      useCORS: false,
      logging: false,
      backgroundColor: null,
    })
      .then((canvas) => {
        if (cancelled) return
        // Resize to max 400×300
        const MAX_W = 400
        const MAX_H = 300
        const ratio = Math.min(MAX_W / canvas.width, MAX_H / canvas.height, 1)
        const offscreen = document.createElement('canvas')
        offscreen.width = Math.round(canvas.width * ratio)
        offscreen.height = Math.round(canvas.height * ratio)
        const ctx = offscreen.getContext('2d')
        if (!ctx) return
        ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height)
        const dataUrl = offscreen.toDataURL('image/jpeg', 0.6)
        setThumbnail(activeSessionId, dataUrl)
      })
      .catch(() => {
        // Thumbnail capture is best-effort — ignore failures
      })

    return () => {
      cancelled = true
    }
  }, [generationStatus, activeSessionId]) // eslint-disable-line react-hooks/exhaustive-deps
}
