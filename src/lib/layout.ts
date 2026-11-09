/**
 * Tata letak papan catatan (posisi + ukuran kartu).
 * Disimpan di localStorage per pengguna supaya tidak mengubah data catatan
 * dan tetap bertahan setelah halaman dimuat ulang.
 */
export interface CardLayout {
  x: number
  y: number
  width: number
  height: number
  /** Urutan tumpukan; makin besar makin di depan. */
  z?: number
}

const KEY_PREFIX = 'catat:layout:'

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`
}

function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function toLayout(value: unknown): CardLayout | null {
  if (!value || typeof value !== 'object') return null
  const layout = value as Record<string, unknown>
  if (
    !isFiniteNumber(layout.x) ||
    !isFiniteNumber(layout.y) ||
    !isFiniteNumber(layout.width) ||
    !isFiniteNumber(layout.height)
  ) {
    return null
  }
  return {
    x: layout.x as number,
    y: layout.y as number,
    width: layout.width as number,
    height: layout.height as number,
    z: isFiniteNumber(layout.z) ? (layout.z as number) : 0,
  }
}

export function loadLayouts(userId: string): Record<string, CardLayout> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const layouts: Record<string, CardLayout> = {}
    for (const [noteId, value] of Object.entries(parsed as Record<string, unknown>)) {
      const layout = toLayout(value)
      if (layout) layouts[noteId] = layout
    }
    return layouts
  } catch {
    return {}
  }
}

export function saveLayouts(userId: string, layouts: Record<string, CardLayout>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(layouts))
  } catch {
    /* penyimpanan lokal penuh atau diblokir; tata letak tetap berlaku selama sesi */
  }
}
