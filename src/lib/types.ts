export type NoteKind = 'text' | 'list' | 'drawing' | 'photo'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Note {
  id: string
  user_id: string
  kind: NoteKind
  title: string
  body: string
  items: ChecklistItem[]
  media_path: string | null
  color: string
  pinned: boolean
  archived: boolean
  trashed: boolean
  created_at: string
  updated_at: string
}

export type NotePatch = Partial<
  Pick<Note, 'title' | 'body' | 'items' | 'media_path' | 'color' | 'pinned' | 'archived' | 'trashed'>
>

export interface NewNote {
  kind: NoteKind
  title?: string
  body?: string
  items?: ChecklistItem[]
  media_path?: string | null
  color?: string
}

/** Warna kartu catatan, semuanya cukup terang untuk teks gelap. */
export const NOTE_COLORS: { value: string; label: string }[] = [
  { value: '#ffffff', label: 'Putih' },
  { value: '#fff2a8', label: 'Kuning' },
  { value: '#ffe0bd', label: 'Oranye' },
  { value: '#ffd6e3', label: 'Pink' },
  { value: '#e4dcff', label: 'Ungu' },
  { value: '#d6e9ff', label: 'Biru' },
  { value: '#d6f5df', label: 'Hijau' },
  { value: '#ecdff0', label: 'Lavender' },
]

export const KIND_LABEL: Record<NoteKind, string> = {
  text: 'Tulisan',
  list: 'Checklist',
  drawing: 'Gambar',
  photo: 'Foto',
}

export const KIND_ICON: Record<NoteKind, 'notes' | 'checklist' | 'brush' | 'image'> = {
  text: 'notes',
  list: 'checklist',
  drawing: 'brush',
  photo: 'image',
}
