import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Icon, type IconName } from './Icon'

const WIDTH = 960
const HEIGHT = 640
const HISTORY_LIMIT = 30

type BrushType = 'pen' | 'pencil' | 'highlighter' | 'crayon' | 'brush'
type Texture = 'solid' | 'pencil' | 'crayon' | 'brush'

const BRUSH_TYPES: { id: BrushType; label: string; icon: IconName }[] = [
  { id: 'pen', label: 'Polpen', icon: 'pen' },
  { id: 'pencil', label: 'Pensil', icon: 'pencil' },
  { id: 'highlighter', label: 'Stabilo', icon: 'highlighter' },
  { id: 'crayon', label: 'Crayon', icon: 'crayon' },
  { id: 'brush', label: 'Kuas', icon: 'brush' },
]

const BRUSH_SIZES = [
  { label: 'Tipis', size: 2 },
  { label: 'Sedang', size: 5 },
  { label: 'Tebal', size: 12 },
] as const

// Palet warna menyesuaikan jenis alat.
const PEN_INKS = ['#1f1b16', '#c0392b', '#2b6cb0', '#2f855a', '#b7791f', '#7c3aed']
const PENCIL_INKS = ['#2d2d2d', '#5a4a3a', '#3a4a5a', '#3a5a3a', '#5a5a3a', '#4a3a5a']
const HIGHLIGHTER_INKS = ['#ffe135', '#ff8fb1', '#5fe0d4', '#a8e6a1', '#ffc98f', '#b3c7ff']
const CRAYON_INKS = ['#1a1a1a', '#a8321a', '#1f4e8c', '#1f6b33', '#a87b12', '#5b2a86']
const BRUSH_INKS = ['#1f1b16', '#c0392b', '#2b6cb0', '#2f855a', '#b7791f', '#7c3aed']

const INKS_BY_BRUSH: Record<BrushType, string[]> = {
  pen: PEN_INKS,
  pencil: PENCIL_INKS,
  highlighter: HIGHLIGHTER_INKS,
  crayon: CRAYON_INKS,
  brush: BRUSH_INKS,
}

const DEFAULT_INK_BY_BRUSH: Record<BrushType, string> = {
  pen: PEN_INKS[0],
  pencil: PENCIL_INKS[0],
  highlighter: HIGHLIGHTER_INKS[0],
  crayon: CRAYON_INKS[0],
  brush: BRUSH_INKS[0],
}

interface BrushProfile {
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  sizeScale: number
  /** Opasitas akhir saat goresan ditempel ke kanvas. */
  opacity: number
  /** Opasitas tiap segmen pada layer goresan (agar tidak menumpuk). */
  layerAlpha: number
  texture: Texture
}

const BRUSH_PROFILES: Record<BrushType, BrushProfile> = {
  pen: { lineCap: 'round', lineJoin: 'round', sizeScale: 1, opacity: 1, layerAlpha: 1, texture: 'solid' },
  pencil: { lineCap: 'round', lineJoin: 'round', sizeScale: 0.9, opacity: 0.75, layerAlpha: 0.5, texture: 'pencil' },
  highlighter: { lineCap: 'round', lineJoin: 'round', sizeScale: 2.6, opacity: 0.32, layerAlpha: 1, texture: 'solid' },
  crayon: { lineCap: 'round', lineJoin: 'round', sizeScale: 1.5, opacity: 0.9, layerAlpha: 0.6, texture: 'crayon' },
  brush: { lineCap: 'round', lineJoin: 'round', sizeScale: 1.7, opacity: 1, layerAlpha: 0.95, texture: 'brush' },
}

const ERASER_PROFILE: BrushProfile = {
  lineCap: 'round',
  lineJoin: 'round',
  sizeScale: 2.2,
  opacity: 1,
  layerAlpha: 1,
  texture: 'solid',
}

export function DrawingCanvas({
  src,
  onChange,
}: {
  src?: string | null
  onChange: (dataUrl: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  // Layer dasar = konten yang sudah selesai; layer goresan = goresan aktif.
  const baseLayer = useRef<HTMLCanvasElement | null>(null)
  const strokeLayer = useRef<HTMLCanvasElement | null>(null)
  const inkByBrush = useRef<Record<BrushType, string>>({ ...DEFAULT_INK_BY_BRUSH })

  // Riwayat disimpan sebagai snapshot PNG agar hemat memori.
  const undoStack = useRef<string[]>([])
  const redoStack = useRef<string[]>([])
  const restoring = useRef(false)

  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const [brushType, setBrushType] = useState<BrushType>('pen')
  const [ink, setInk] = useState<string>(DEFAULT_INK_BY_BRUSH.pen)
  const [brushSize, setBrushSize] = useState<number>(BRUSH_SIZES[1].size)
  const [eraser, setEraser] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [history, setHistory] = useState({ undo: 0, redo: 0 })

  // Setiap jenis alat mengingat warnanya sendiri.
  useEffect(() => {
    setInk(inkByBrush.current[brushType])
    setEraser(false)
  }, [brushType])

  const ensureLayer = useCallback((ref: MutableRefObject<HTMLCanvasElement | null>) => {
    if (!ref.current) {
      const canvas = document.createElement('canvas')
      canvas.width = WIDTH
      canvas.height = HEIGHT
      ref.current = canvas
    }
    return ref.current
  }, [])

  const context = useCallback((): CanvasRenderingContext2D | null => {
    return canvasRef.current?.getContext('2d') ?? null
  }, [])

  const strokeContext = useCallback((): CanvasRenderingContext2D | null => {
    return ensureLayer(strokeLayer).getContext('2d')
  }, [ensureLayer])

  const currentProfile = useCallback(
    (): BrushProfile => (eraser ? ERASER_PROFILE : BRUSH_PROFILES[brushType]),
    [eraser, brushType],
  )

  const strokeWidth = useCallback(() => brushSize * currentProfile().sizeScale, [brushSize, currentProfile])

  const paintBase = useCallback(() => {
    const base = ensureLayer(baseLayer)
    const ctx = base.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.restore()
  }, [ensureLayer])

  const clearStrokeLayer = useCallback(() => {
    const ctx = strokeContext()
    if (!ctx) return
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
  }, [strokeContext])

  /** Susun ulang kanvas yang terlihat: layer dasar + goresan aktif. */
  const renderVisible = useCallback(() => {
    const ctx = context()
    if (!ctx) return
    const base = ensureLayer(baseLayer)
    const stroke = ensureLayer(strokeLayer)
    const profile = currentProfile()
    ctx.save()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    ctx.drawImage(base, 0, 0)
    if (eraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.globalAlpha = 1
    } else {
      ctx.globalAlpha = profile.opacity
    }
    ctx.drawImage(stroke, 0, 0)
    ctx.restore()
  }, [context, ensureLayer, currentProfile, eraser])

  /** Tempelkan goresan aktif ke layer dasar. */
  const commitStroke = useCallback(() => {
    const base = ensureLayer(baseLayer)
    const stroke = ensureLayer(strokeLayer)
    const ctx = base.getContext('2d')
    if (!ctx) return
    const profile = currentProfile()
    ctx.save()
    if (eraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.globalAlpha = 1
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = profile.opacity
    }
    ctx.drawImage(stroke, 0, 0)
    ctx.restore()
    clearStrokeLayer()
  }, [ensureLayer, currentProfile, eraser, clearStrokeLayer])

  const emit = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      onChange(canvas.toDataURL('image/png'))
    } catch {
      /* kanvas tidak bisa dibaca (mis. gambar lintas origin) */
    }
  }, [onChange])

  const syncHistory = useCallback(() => {
    setHistory({ undo: undoStack.current.length, redo: redoStack.current.length })
  }, [])

  const captureBase = useCallback((): string | null => {
    try {
      return ensureLayer(baseLayer).toDataURL('image/png')
    } catch {
      return null
    }
  }, [ensureLayer])

  const resetHistory = useCallback(() => {
    undoStack.current = []
    redoStack.current = []
    syncHistory()
  }, [syncHistory])

  /** Simpan kondisi sebelum sebuah aksi dicatat ke riwayat. */
  const pushUndo = useCallback(
    (snapshot: string | null) => {
      if (!snapshot) return
      undoStack.current.push(snapshot)
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
      redoStack.current = []
      syncHistory()
    },
    [syncHistory],
  )

  const restoreSnapshot = useCallback(
    async (dataUrl: string) => {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Gagal memuat riwayat gambar'))
        img.src = dataUrl
      })
      const base = ensureLayer(baseLayer)
      const ctx = base.getContext('2d')
      if (!ctx) return
      ctx.save()
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      ctx.drawImage(image, 0, 0, WIDTH, HEIGHT)
      ctx.restore()
      clearStrokeLayer()
      renderVisible()
      emit()
    },
    [ensureLayer, clearStrokeLayer, renderVisible, emit],
  )

  const undo = useCallback(async () => {
    if (restoring.current || undoStack.current.length === 0) return
    restoring.current = true
    try {
      const current = captureBase()
      if (!current) return
      const previous = undoStack.current.pop()
      if (!previous) return
      redoStack.current.push(current)
      if (redoStack.current.length > HISTORY_LIMIT) redoStack.current.shift()
      await restoreSnapshot(previous)
      setDirty(true)
    } finally {
      restoring.current = false
      syncHistory()
    }
  }, [captureBase, restoreSnapshot, syncHistory])

  const redo = useCallback(async () => {
    if (restoring.current || redoStack.current.length === 0) return
    restoring.current = true
    try {
      const current = captureBase()
      if (!current) return
      const next = redoStack.current.pop()
      if (!next) return
      undoStack.current.push(current)
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift()
      await restoreSnapshot(next)
      setDirty(true)
    } finally {
      restoring.current = false
      syncHistory()
    }
  }, [captureBase, restoreSnapshot, syncHistory])

  // Pintasan keyboard hanya aktif saat fokus berada di area gambar.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const root = rootRef.current
      const target = event.target as Node | null
      if (!root || !target || !root.contains(target)) return
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        void undo()
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        void redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Siapkan kanvas kosong saat pertama kali dipasang (hanya sekali).
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    paintBase()
    clearStrokeLayer()
    renderVisible()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Muat gambar yang sudah ada (mode edit) ke layer dasar, sekali per src.
  const loadedSrc = useRef<string | null>(null)
  useEffect(() => {
    if (!src || src === loadedSrc.current) return
    loadedSrc.current = src
    let cancelled = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (cancelled) return
      const base = ensureLayer(baseLayer)
      const ctx = base.getContext('2d')
      if (!ctx) return
      const scale = Math.min(WIDTH / image.width, HEIGHT / image.height, 1)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      ctx.save()
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(image, (WIDTH - drawWidth) / 2, (HEIGHT - drawHeight) / 2, drawWidth, drawHeight)
      ctx.restore()
      renderVisible()
      resetHistory()
    }
    image.src = src
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  function pointFrom(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    }
  }

  function applyStrokeStyle(ctx: CanvasRenderingContext2D) {
    const profile = currentProfile()
    ctx.lineCap = profile.lineCap
    ctx.lineJoin = profile.lineJoin
    ctx.lineWidth = strokeWidth()
    ctx.strokeStyle = eraser ? '#000000' : ink
    ctx.fillStyle = eraser ? '#000000' : ink
    ctx.globalAlpha = profile.layerAlpha
    ctx.globalCompositeOperation = 'source-over'
  }

  /** Garis bertekstur (pensil / crayon): beberapa garis tipis dengan offset acak. */
  function drawTexturedSegment(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    size: number,
    lines: number,
    spread: number,
  ) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const nx = Math.sin(angle)
    const ny = -Math.cos(angle)
    const baseWidth = ctx.lineWidth
    const baseAlpha = ctx.globalAlpha
    for (let i = 0; i < lines; i++) {
      const offset = (Math.random() - 0.5) * size * spread
      ctx.lineWidth = baseWidth * (0.32 + Math.random() * 0.28)
      ctx.globalAlpha = baseAlpha * (0.55 + Math.random() * 0.45)
      ctx.beginPath()
      ctx.moveTo(from.x + nx * offset, from.y + ny * offset)
      ctx.lineTo(to.x + nx * offset, to.y + ny * offset)
      ctx.stroke()
    }
    ctx.lineWidth = baseWidth
    ctx.globalAlpha = baseAlpha
  }

  /** Kuas: goresan dengan beberapa "bulu" yang sedikit menyimpang. */
  function drawBrushSegment(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    size: number,
  ) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const nx = Math.sin(angle)
    const ny = -Math.cos(angle)
    const baseWidth = ctx.lineWidth
    const baseAlpha = ctx.globalAlpha

    const strand = (offset: number, widthScale: number, alphaScale: number) => {
      const wobble = (Math.random() - 0.5) * size * 0.35
      ctx.lineWidth = baseWidth * widthScale
      ctx.globalAlpha = baseAlpha * alphaScale
      const ox = nx * offset
      const oy = ny * offset
      ctx.beginPath()
      ctx.moveTo(from.x + ox, from.y + oy)
      ctx.quadraticCurveTo(
        (from.x + to.x) / 2 + nx * wobble + ox,
        (from.y + to.y) / 2 + ny * wobble + oy,
        to.x + ox,
        to.y + oy,
      )
      ctx.stroke()
    }

    // Inti tebal + dua bulu tipis di tepi memberi kesan kuas berbulu.
    strand(0, 0.72, 1)
    strand(-size * 0.28, 0.26, 0.55)
    strand(size * 0.28, 0.26, 0.55)

    ctx.lineWidth = baseWidth
    ctx.globalAlpha = baseAlpha
  }

  function drawSegment(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) {
    const size = strokeWidth()
    switch (currentProfile().texture) {
      case 'pencil':
        drawTexturedSegment(ctx, from, to, size, 3, 0.9)
        break
      case 'crayon':
        drawTexturedSegment(ctx, from, to, size, 5, 1.1)
        break
      case 'brush':
        drawBrushSegment(ctx, from, to, size)
        break
      default:
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const ctx = strokeContext()
    if (!canvas || !ctx) return
    canvas.focus()
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      /* pointer sintetis atau sudah lepas: menggambar tetap boleh */
    }
    drawing.current = true
    const point = pointFrom(event)
    last.current = point
    clearStrokeLayer()
    applyStrokeStyle(ctx)
    ctx.beginPath()
    ctx.arc(point.x, point.y, strokeWidth() / 2, 0, Math.PI * 2)
    ctx.fill()
    renderVisible()
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = strokeContext()
    if (!ctx) return
    const point = pointFrom(event)
    const previous = last.current ?? point
    applyStrokeStyle(ctx)
    drawSegment(ctx, previous, point)
    last.current = point
    if (!dirty) setDirty(true)
    renderVisible()
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
    pushUndo(captureBase())
    commitStroke()
    renderVisible()
    emit()
  }

  function clearCanvas() {
    pushUndo(captureBase())
    paintBase()
    clearStrokeLayer()
    renderVisible()
    setDirty(true)
    emit()
  }

  const currentInks = INKS_BY_BRUSH[brushType]
  const activeLabel = eraser ? 'Penghapus' : BRUSH_TYPES.find((item) => item.id === brushType)?.label ?? ''

  return (
    <div className="drawing" ref={rootRef}>
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        width={WIDTH}
        height={HEIGHT}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div className="drawing-tools">
        <div className="tool-group brush-type-group" role="group" aria-label="Jenis alat">
          {BRUSH_TYPES.map((bt) => (
            <button
              key={bt.id}
              type="button"
              data-brush={bt.id}
              className={`tool-btn${brushType === bt.id ? ' is-active' : ''}`}
              onClick={() => setBrushType(bt.id)}
              title={bt.label}
              aria-label={bt.label}
              aria-pressed={brushType === bt.id}
            >
              <Icon name={bt.icon} size={18} />
            </button>
          ))}
        </div>

        <div className="ink-row" role="group" aria-label="Warna">
          {currentInks.map((color) => (
            <button
              key={color}
              type="button"
              className={`ink${!eraser && ink === color ? ' is-active' : ''}`}
              style={{ background: color }}
              aria-label={`Warna ${color}`}
              aria-pressed={!eraser && ink === color}
              onClick={() => {
                inkByBrush.current[brushType] = color
                setInk(color)
                setEraser(false)
              }}
            />
          ))}
        </div>

        <div className="tool-group" role="group" aria-label="Ketebalan">
          {BRUSH_SIZES.map((item) => (
            <button
              key={item.size}
              type="button"
              className={`tool-btn${!eraser && brushSize === item.size ? ' is-active' : ''}`}
              onClick={() => {
                setBrushSize(item.size)
                setEraser(false)
              }}
              title={item.label}
              aria-label={`Ketebalan ${item.label}`}
              aria-pressed={!eraser && brushSize === item.size}
            >
              <span className="brush-dot" style={{ width: item.size + 6, height: item.size + 6 }} />
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`tool-btn${eraser ? ' is-active' : ''}`}
          onClick={() => setEraser((value) => !value)}
          title="Penghapus"
          aria-label="Penghapus"
          aria-pressed={eraser}
        >
          <Icon name="eraser" size={18} />
        </button>

        <div className="tool-group" role="group" aria-label="Riwayat">
          <button
            type="button"
            className="tool-btn"
            onClick={() => void undo()}
            disabled={history.undo === 0}
            title="Urungkan (Ctrl+Z)"
            aria-label="Urungkan"
          >
            <Icon name="undo" size={18} />
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => void redo()}
            disabled={history.redo === 0}
            title="Ulangi (Ctrl+Y)"
            aria-label="Ulangi"
          >
            <Icon name="redo" size={18} />
          </button>
        </div>

        <button type="button" className="tool-btn tool-btn--text" onClick={clearCanvas} title="Bersihkan">
          Bersihkan
        </button>

        <span className="drawing-hint">
          {activeLabel} &middot; {dirty ? 'Tersimpan otomatis' : 'Gambar di area putih'}
        </span>
      </div>
    </div>
  )
}
