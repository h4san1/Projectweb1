import { db } from './supabase'
import { removeImage } from './media'
import type { ChecklistItem, NewNote, Note, NotePatch } from './types'

const TABLE = 'notes'

function toItems(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: String(item.id ?? Math.random().toString(36).slice(2)),
      text: String(item.text ?? ''),
      done: Boolean(item.done),
    }))
}

function toNote(row: Record<string, unknown>): Note {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    kind: (row.kind as Note['kind']) ?? 'text',
    title: String(row.title ?? ''),
    body: String(row.body ?? ''),
    items: toItems(row.items),
    media_path: (row.media_path as string | null) ?? null,
    color: String(row.color ?? '#ffffff'),
    pinned: Boolean(row.pinned),
    archived: Boolean(row.archived),
    trashed: Boolean(row.trashed),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'kesalahan tidak diketahui'}`)
}

export async function fetchNotes(userId: string): Promise<Note[]> {
  const { data, error } = await db()
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) fail('Gagal memuat catatan', error)
  return (data ?? []).map((row) => toNote(row as Record<string, unknown>))
}

export async function createNote(userId: string, draft: NewNote): Promise<Note> {
  const { data, error } = await db()
    .from(TABLE)
    .insert({
      user_id: userId,
      kind: draft.kind,
      title: draft.title ?? '',
      body: draft.body ?? '',
      items: draft.items ?? [],
      media_path: draft.media_path ?? null,
      color: draft.color ?? '#ffffff',
    })
    .select('*')
    .single()

  if (error) fail('Gagal menyimpan catatan', error)
  return toNote(data as Record<string, unknown>)
}

export async function patchNote(id: string, patch: NotePatch): Promise<Note> {
  const { data, error } = await db().from(TABLE).update(patch).eq('id', id).select('*').single()
  if (error) fail('Gagal memperbarui catatan', error)
  return toNote(data as Record<string, unknown>)
}

export async function deleteNoteForever(note: Note): Promise<void> {
  const { error } = await db().from(TABLE).delete().eq('id', note.id)
  if (error) fail('Gagal menghapus catatan', error)
  await removeImage(note.media_path)
}
