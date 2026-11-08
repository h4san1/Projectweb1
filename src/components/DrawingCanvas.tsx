import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

const WIDTH = 960
const HEIGHT = 640
const BRUSHES = [
  { label: 'Tipis', size: 3 },
  { label: 'Sedang', size: 6 },
  { label: 'Tebal', size: 14 },
] as const
const INKS = ['#1f1b16', '#c0392b', '#2b6cb0', '#2f855a', '#b7791f', '#7c3aed']

export function DrawingCanvas({
  src,
  onChange,
}: {
  src?: string | null
  onChange: (dataUrl: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [ink, setInk] = useState(INKS[0])
  const [brush, setBrush] = useState<number>(BRUSHES[1].size)
  const [eraser, setEraser] = useState(false)
  const [dirty, setDirty] = useState(false)

  const context = useCallback((): CanvasRenderingContext2D | null => {
    return canvasRef.current?.getContext('2d') ?? null
  }, [])

  const paintBackground = useCallback(() => {
    const ctx = context()
    if (!ctx) return
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.restore()
  }, [context])

  useEffect(() => {
    paintBackground()
  }, [paintBackground])

  const emit = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      onChange(canvas.toDataURL('image/png'))
    } catch {
      /* kanvas tidak bisa dibaca (mis. gambar lintas origin) */
    }
  }, [onChange])

  // Muat gambar yang sudah ada (mode edit) di atas kanvas kosong.
  useEffect(() => {
    if (!src) return
    let cancelled = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (cancelled) return
      const ctx = context()
      if (!ctx) return
      const scale = Math.min(WIDTH / image.width, HEIGHT / image.height, 1)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      ctx.drawImage(image, (WIDTH - drawWidth) / 2, (HEIGHT - drawHeight) / 2, drawWidth, drawHeight)
    }
    image.src = src
    return () => {
      cancelled = true
    }
  }, [src, context])

  function pointFrom(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    }
  }

  function strokeStyle(ctx: CanvasRenderingContext2D) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = eraser ? '#ffffff' : ink
    ctx.fillStyle = eraser ? '#ffffff' : ink
    ctx.lineWidth = eraser ? brush * 2.2 : brush
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const ctx = context()
    if (!canvas || !ctx) return
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      /* pointer sintetis atau sudah lepas: menggambar tetap boleh */
    }
    drawing.current = true
    const point = pointFrom(event)
    last.current = point
    strokeStyle(ctx)
    ctx.beginPath()
    ctx.arc(point.x, point.y, (eraser ? brush * 2.2 : brush) / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = context()
    if (!ctx) return
    const point = pointFrom(event)
    const previous = last.current ?? point
    strokeStyle(ctx)
    ctx.beginPath()
    ctx.moveTo(previous.x, previous.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    last.current = point
    if (!dirty) setDirty(true)
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    try {
      canvasRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      /* pointer sudah tidak aktif */
    }
    emit()
  }

  function clearCanvas() {
    paintBackground()
    setDirty(true)
    emit()
  }

  return (
    <div className="drawing">
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div className="drawing-tools">
        <div className="ink-row" role="group" aria-label="Warna pena">
          {INKS.map((color) => (
            <button
              key={color}
              type="button"
              className={`ink${!eraser && ink === color ? ' is-active' : ''}`}
              style={{ background: color }}
              aria-label={`Pena ${color}`}
              aria-pressed={!eraser && ink === color}
              onClick={() => {
                setInk(color)
                setEraser(false)
              }}
            />
          ))}
        </div>

        <div className="tool-group" role="group" aria-label="Ketebalan">
          {BRUSHES.map((item) => (
            <button
              key={item.size}
              type="button"
              className={`tool-btn${!eraser && brush === item.size ? ' is-active' : ''}`}
              onClick={() => {
                setBrush(item.size)
                setEraser(false)
              }}
              title={item.label}
            >
              <span className="brush-dot" style={{ width: item.size + 4, height: item.size + 4 }} />
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`tool-btn${eraser ? ' is-active' : ''}`}
          onClick={() => setEraser((value) => !value)}
          title="Penghapus"
          aria-pressed={eraser}
        >
          <Icon name="eraser" size={18} />
        </button>

        <button type="button" className="tool-btn tool-btn--text" onClick={clearCanvas} title="Bersihkan">
          Bersihkan
        </button>

        <span className="drawing-hint">{dirty ? 'Gambar tersimpan otomatis' : 'Gambar di area putih'}</span>
      </div>
    </div>
  )
}
