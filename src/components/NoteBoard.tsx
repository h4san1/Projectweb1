import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { CardLayout } from '../lib/layout'
import type { Note } from '../lib/types'
import { Icon } from './Icon'
import { NoteCard } from './NoteCard'

const GAP = 16
const DEFAULT_WIDTH = 264
const DEFAULT_HEIGHT = 248
const MIN_WIDTH = 180
const MIN_HEIGHT = 120
const MAX_WIDTH = 720
const MAX_HEIGHT = 1100
const FALLBACK_WIDTH = 960

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function clampLayout(layout: CardLayout, boardWidth: number): CardLayout {
  const available = boardWidth > 0 ? boardWidth : FALLBACK_WIDTH
  const maxWidth = Math.max(120, Math.min(MAX_WIDTH, available))
  const width = clamp(layout.width, Math.min(MIN_WIDTH, maxWidth), maxWidth)
  return {
    x: clamp(layout.x, 0, Math.max(0, available - width)),
    y: Math.max(0, layout.y),
    width,
    height: clamp(layout.height, MIN_HEIGHT, MAX_HEIGHT),
    z: layout.z ?? 0,
  }
}

/** Ubah ukuran dari pojok kanan bawah: sisi kiri atas kartu tetap di tempatnya. */
function resizeLayout(
  base: CardLayout,
  widthDelta: number,
  heightDelta: number,
  boardWidth: number,
): CardLayout {
  const available = boardWidth > 0 ? boardWidth : FALLBACK_WIDTH
  const maxWidth = Math.max(120, Math.min(MAX_WIDTH, available - base.x))
  const width = clamp(base.width + widthDelta, Math.min(MIN_WIDTH, maxWidth), maxWidth)
  return {
    x: clamp(base.x, 0, Math.max(0, available - width)),
    y: Math.max(0, base.y),
    width,
    height: clamp(base.height + heightDelta, MIN_HEIGHT, MAX_HEIGHT),
    z: base.z ?? 0,
  }
}

function overlaps(a: CardLayout, b: CardLayout): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function columnCount(boardWidth: number): number {
  return Math.max(1, Math.floor((boardWidth + GAP) / (DEFAULT_WIDTH + GAP)))
}

/** Di layar sempit, kartu default memenuhi lebar papan. */
function defaultCardWidth(boardWidth: number): number {
  if (columnCount(boardWidth) === 1) return Math.min(boardWidth, MAX_WIDTH)
  return Math.min(DEFAULT_WIDTH, boardWidth)
}

/** Cari slot kosong paling atas untuk kartu yang belum pernah dipindahkan. */
function findSpot(occupied: CardLayout[], boardWidth: number): { x: number; y: number } {
  const cardWidth = defaultCardWidth(boardWidth)
  const columns = columnCount(boardWidth)

  for (let row = 0; row < 400; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = column * (DEFAULT_WIDTH + GAP)
      if (x + cardWidth > boardWidth + 1) continue
      const candidate: CardLayout = {
        x,
        y: row * (DEFAULT_HEIGHT + GAP),
        width: cardWidth,
        height: DEFAULT_HEIGHT,
      }
      if (!occupied.some((other) => overlaps(candidate, other))) {
        return { x: candidate.x, y: candidate.y }
      }
    }
  }

  const bottom = occupied.reduce((max, other) => Math.max(max, other.y + other.height), 0)
  return { x: 0, y: bottom + GAP }
}

function computeLayouts(
  notes: Note[],
  saved: Record<string, CardLayout>,
  boardWidth: number,
): Map<string, CardLayout> {
  const width = boardWidth > 0 ? boardWidth : FALLBACK_WIDTH
  const resolved = new Map<string, CardLayout>()
  const occupied: CardLayout[] = []

  for (const note of notes) {
    const stored = saved[note.id]
    if (!stored) continue
    const layout = clampLayout(stored, width)
    resolved.set(note.id, layout)
    occupied.push(layout)
  }

  for (const note of notes) {
    if (resolved.has(note.id)) continue
    const spot = findSpot(occupied, width)
    const layout: CardLayout = {
      ...spot,
      width: defaultCardWidth(width),
      height: DEFAULT_HEIGHT,
      z: 0,
    }
    resolved.set(note.id, layout)
    occupied.push(layout)
  }

  return resolved
}

interface Interaction {
  kind: 'move' | 'resize'
  pointerId: number
  startX: number
  startY: number
  base: CardLayout
  moved: boolean
}

export function NoteBoard({
  notes,
  layouts,
  imageUrls,
  onOpen,
  onLayoutsChange,
  onResetLayout,
}: {
  notes: Note[]
  layouts: Record<string, CardLayout>
  imageUrls: Record<string, string>
  onOpen: (id: string) => void
  onLayoutsChange: (layouts: Record<string, CardLayout>) => void
  onResetLayout: () => void
}) {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [boardWidth, setBoardWidth] = useState(0)

  useLayoutEffect(() => {
    const element = boardRef.current
    if (!element) return

    const measure = () => setBoardWidth(element.clientWidth)
    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const resolved = useMemo(
    () => computeLayouts(notes, layouts, boardWidth),
    [notes, layouts, boardWidth],
  )

  const height = useMemo(() => {
    let bottom = 360
    for (const layout of resolved.values()) {
      bottom = Math.max(bottom, layout.y + layout.height + 72)
    }
    return bottom
  }, [resolved])

  const commitLayout = useCallback(
    (noteId: string, layout: CardLayout) => {
      const next: Record<string, CardLayout> = { ...layouts }

      // Bekukan juga posisi otomatis kartu lain agar tidak ikut bergeser
      // saat tata letak dimuat ulang.
      for (const [id, current] of resolved) {
        if (!next[id]) next[id] = current
      }

      let maxZ = 0
      for (const current of Object.values(next)) {
        maxZ = Math.max(maxZ, current.z ?? 0)
      }

      // Kartu yang baru digeser/ubah ukuran tampil paling depan.
      next[noteId] = { ...layout, z: maxZ + 1 }

      if (maxZ + 1 > 200) {
        const ids = Object.keys(next).sort((a, b) => (next[a].z ?? 0) - (next[b].z ?? 0))
        ids.forEach((id, index) => {
          next[id] = { ...next[id], z: index + 1 }
        })
      }

      onLayoutsChange(next)
    },
    [layouts, resolved, onLayoutsChange],
  )

  const hasSavedLayout = notes.some((note) => Boolean(layouts[note.id]))
  const fallbackLayout = clampLayout(
    { x: 0, y: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
    boardWidth,
  )

  return (
    <>
      <div className="board-bar">
        <p className="board-hint">
          <span className="board-hint-icon" aria-hidden="true">
            <Icon name="notes" size={15} />
          </span>
          Geser kartu untuk memindahkan posisi, tarik pojok kanan bawah untuk memperbesar atau
          memperkecil.
        </p>
        {hasSavedLayout && (
          <button type="button" className="btn btn--small btn--ghost" onClick={onResetLayout}>
            <Icon name="restore" size={14} />
            Rapikan
          </button>
        )}
      </div>

      <div className="board" ref={boardRef} style={{ height }} aria-label="Papan catatan">
        {notes.map((note) => (
          <BoardItem
            key={note.id}
            note={note}
            layout={resolved.get(note.id) ?? fallbackLayout}
            boardWidth={boardWidth > 0 ? boardWidth : FALLBACK_WIDTH}
            imageUrl={note.media_path ? imageUrls[note.media_path] : undefined}
            onOpen={onOpen}
            onLayoutChange={commitLayout}
          />
        ))}
      </div>
    </>
  )
}

function BoardItem({
  note,
  layout,
  boardWidth,
  imageUrl,
  onOpen,
  onLayoutChange,
}: {
  note: Note
  layout: CardLayout
  boardWidth: number
  imageUrl?: string
  onOpen: (id: string) => void
  onLayoutChange: (id: string, layout: CardLayout) => void
}) {
  const [live, setLive] = useState<CardLayout | null>(null)
  const [active, setActive] = useState<'move' | 'resize' | null>(null)
  const liveRef = useRef<CardLayout | null>(null)
  const stopListening = useRef<(() => void) | null>(null)
  const suppressClick = useRef(false)
  const suppressTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      stopListening.current?.()
      if (suppressTimer.current) window.clearTimeout(suppressTimer.current)
    },
    [],
  )

  const current = live ?? layout

  function suppressNextClick() {
    suppressClick.current = true
    if (suppressTimer.current) window.clearTimeout(suppressTimer.current)
    suppressTimer.current = window.setTimeout(() => {
      suppressClick.current = false
      suppressTimer.current = null
    }, 300)
  }

  function beginInteraction(kind: Interaction['kind'], event: ReactPointerEvent) {
    stopListening.current?.()

    const state: Interaction = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      base: current,
      moved: false,
    }

    function stop() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
      stopListening.current = null
    }

    function onMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== state.pointerId) return

      const dx = moveEvent.clientX - state.startX
      const dy = moveEvent.clientY - state.startY
      if (!state.moved && Math.hypot(dx, dy) < 4) return

      state.moved = true
      setActive(state.kind)

      const next =
        state.kind === 'move'
          ? clampLayout({ ...state.base, x: state.base.x + dx, y: state.base.y + dy }, boardWidth)
          : resizeLayout(state.base, dx, dy, boardWidth)

      liveRef.current = next
      setLive(next)
    }

    function onEnd(endEvent: PointerEvent) {
      if (endEvent.pointerId !== state.pointerId) return
      stop()

      const result = liveRef.current
      liveRef.current = null
      setLive(null)
      setActive(null)

      if (state.moved && result) {
        suppressNextClick()
        onLayoutChange(note.id, result)
      }
    }

    stopListening.current = stop
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }

  function startMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('.resize-handle')) return
    // Di layar sentuh, geser hanya lewat pegangan agar halaman tetap bisa di-scroll.
    if (event.pointerType === 'touch' && !target.closest('.drag-grip')) return
    event.preventDefault()
    beginInteraction('move', event)
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    beginInteraction('resize', event)
  }

  function moveWithKeyboard(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 40 : 16
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = delta[event.key]
    if (!move) return
    event.preventDefault()
    event.stopPropagation()
    onLayoutChange(
      note.id,
      clampLayout({ ...current, x: current.x + move[0], y: current.y + move[1] }, boardWidth),
    )
  }

  function resizeWithKeyboard(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 40 : 16
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const change = delta[event.key]
    if (!change) return
    event.preventDefault()
    event.stopPropagation()
    onLayoutChange(note.id, resizeLayout(current, change[0], change[1], boardWidth))
  }

  return (
    <div
      className={`board-item${active ? ` is-${active}` : ''}`}
      style={{
        transform: `translate3d(${current.x}px, ${current.y}px, 0)`,
        width: current.width,
        height: current.height,
        ['--card-z' as string]: current.z ?? 0,
      }}
      onPointerDown={startMove}
      onClickCapture={(event) => {
        if (!suppressClick.current) return
        suppressClick.current = false
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      <NoteCard note={note} imageUrl={imageUrl} onOpen={() => onOpen(note.id)} />

      <button
        type="button"
        className="drag-grip"
        aria-label="Geser posisi catatan"
        title="Geser posisi catatan"
        onKeyDown={moveWithKeyboard}
      >
        <span className="grip-dots" aria-hidden="true" />
      </button>

      <button
        type="button"
        className="resize-handle"
        aria-label="Ubah ukuran catatan"
        title="Tarik untuk mengubah ukuran"
        onPointerDown={startResize}
        onKeyDown={resizeWithKeyboard}
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path
            d="M4 11 11 4M8 11l3-3M11 11h.01"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
