import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createNote, deleteNoteForever, fetchNotes, patchNote } from '../lib/notes'
import { getImageUrls } from '../lib/media'
import { errorMessage } from '../lib/errors'
import type { NewNote, Note, NotePatch } from '../lib/types'
import { Icon, type IconName } from './Icon'
import { NoteCard } from './NoteCard'
import { NoteComposer } from './NoteComposer'
import { NoteEditor } from './NoteEditor'

type View = 'notes' | 'archive' | 'trash'

const VIEWS: { id: View; label: string; icon: IconName }[] = [
  { id: 'notes', label: 'Catatan', icon: 'notes' },
  { id: 'archive', label: 'Arsip', icon: 'archive' },
  { id: 'trash', label: 'Sampah', icon: 'trash' },
]

const VIEW_COPY: Record<View, { title: string; subtitle: string; empty: string; emptyHint: string }> = {
  notes: {
    title: 'Catatan',
    subtitle: 'Tulisan, checklist, gambar, dan foto — semua di satu tempat.',
    empty: 'Belum ada catatan',
    emptyHint: 'Mulai dari kolom "Buat catatan…" di atas.',
  },
  archive: {
    title: 'Arsip',
    subtitle: 'Catatan yang disembunyikan tanpa dihapus.',
    empty: 'Arsip masih kosong',
    emptyHint: 'Buka catatan lalu tekan ikon arsip untuk menyimpannya di sini.',
  },
  trash: {
    title: 'Sampah',
    subtitle: 'Catatan di sini bisa dipulihkan atau dihapus permanen.',
    empty: 'Tempat sampah kosong',
    emptyHint: 'Catatan yang kamu buang akan muncul di sini.',
  },
}

export function Workspace({
  userId,
  email,
  onSignOut,
}: {
  userId: string
  email: string
  onSignOut: () => void
}) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('notes')
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3400)
  }, [])

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const syncMedia = useCallback(async (paths: string[]) => {
    const unique = Array.from(new Set(paths.filter(Boolean)))
    if (unique.length === 0) return
    try {
      const urls = await getImageUrls(unique)
      setMediaUrls((prev) => ({ ...prev, ...urls }))
    } catch {
      /* pratinjau gambar gagal dimuat; sisa aplikasi tetap berfungsi */
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchNotes(userId)
      setNotes(rows)
      void syncMedia(rows.map((note) => note.media_path).filter((path): path is string => Boolean(path)))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [userId, syncMedia])

  useEffect(() => {
    void load()
  }, [load])

  const applyPatch = useCallback(
    async (id: string, patch: NotePatch) => {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id ? { ...note, ...patch, updated_at: new Date().toISOString() } : note,
        ),
      )
      try {
        const saved = await patchNote(id, patch)
        setNotes((prev) => prev.map((note) => (note.id === id ? saved : note)))
      } catch (err) {
        notify(errorMessage(err))
        void load()
      }
    },
    [load, notify],
  )

  const handleCreate = useCallback(
    async (draft: NewNote) => {
      const created = await createNote(userId, draft)
      setNotes((prev) => [created, ...prev])
      if (created.media_path) void syncMedia([created.media_path])
      notify('Catatan disimpan')
    },
    [userId, syncMedia, notify],
  )

  const handleDelete = useCallback(
    async (note: Note) => {
      try {
        await deleteNoteForever(note)
        setNotes((prev) => prev.filter((item) => item.id !== note.id))
        setEditingId(null)
        notify('Catatan dihapus permanen')
      } catch (err) {
        notify(errorMessage(err))
      }
    },
    [notify],
  )

  const counts = useMemo(
    () => ({
      notes: notes.filter((note) => !note.trashed && !note.archived).length,
      archive: notes.filter((note) => !note.trashed && note.archived).length,
      trash: notes.filter((note) => note.trashed).length,
    }),
    [notes],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return notes
      .filter((note) => {
        if (view === 'trash') return note.trashed
        if (view === 'archive') return note.archived && !note.trashed
        return !note.archived && !note.trashed
      })
      .filter((note) => {
        if (!needle) return true
        return (
          note.title.toLowerCase().includes(needle) ||
          note.body.toLowerCase().includes(needle) ||
          note.items.some((item) => item.text.toLowerCase().includes(needle))
        )
      })
      .sort(
        (a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at),
      )
  }, [notes, query, view])

  const editingNote = editingId ? (notes.find((note) => note.id === editingId) ?? null) : null
  const copy = VIEW_COPY[view]

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="notes" size={20} />
          </span>
          <span className="brand-text">
            <strong>Catat</strong>
            <small>catatan pribadi</small>
          </span>
        </div>

        <nav className="nav" aria-label="Tampilan catatan">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${view === item.id ? ' is-active' : ''}`}
              onClick={() => {
                setView(item.id)
                setQuery('')
              }}
              aria-current={view === item.id ? 'page' : undefined}
            >
              <Icon name={item.icon} size={19} />
              <span className="nav-label">{item.label}</span>
              {counts[item.id] > 0 && <span className="nav-count">{counts[item.id]}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="account" title={email}>
            <span className="avatar">{(email[0] ?? '?').toUpperCase()}</span>
            <span className="account-email">{email || 'Pengguna'}</span>
          </div>
          <button type="button" className="icon-btn" onClick={onSignOut} aria-label="Keluar" title="Keluar">
            <Icon name="logout" size={19} />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="brand brand--compact">
            <span className="brand-mark">
              <Icon name="notes" size={18} />
            </span>
            <strong>Catat</strong>
          </div>

          <div className="search">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari catatan, checklist, isi…"
              aria-label="Cari catatan"
            />
            {query && (
              <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Hapus pencarian">
                <Icon name="close" size={15} />
              </button>
            )}
          </div>
        </header>

        <section className="view-head">
          <div>
            <h1>{copy.title}</h1>
            <p className="view-sub">{copy.subtitle}</p>
          </div>
          <span className="count-pill">
            {visible.length} {query ? 'hasil' : 'catatan'}
          </span>
        </section>

        {view === 'notes' && <NoteComposer userId={userId} onCreate={handleCreate} />}

        {loading ? (
          <div className="grid" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="card-skeleton" style={{ height: 120 + (index % 3) * 40 }} />
            ))}
          </div>
        ) : error ? (
          <div className="state state--error">
            <h2>Tidak bisa memuat catatan</h2>
            <p>{error}</p>
            <button type="button" className="btn btn--primary" onClick={() => void load()}>
              Coba lagi
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="state">
            <span className="state-icon">
              <Icon name={view === 'trash' ? 'trash' : view === 'archive' ? 'archive' : 'notes'} size={26} />
            </span>
            <h2>{query ? 'Tidak ada yang cocok' : copy.empty}</h2>
            <p>{query ? `Tidak ada catatan yang mengandung "${query}".` : copy.emptyHint}</p>
          </div>
        ) : (
          <div className="grid">
            {visible.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                imageUrl={note.media_path ? mediaUrls[note.media_path] : undefined}
                onOpen={() => setEditingId(note.id)}
              />
            ))}
          </div>
        )}
      </div>

      {editingNote && (
        <NoteEditor
          key={editingNote.id}
          note={editingNote}
          imageUrl={editingNote.media_path ? mediaUrls[editingNote.media_path] : undefined}
          userId={userId}
          onPatch={applyPatch}
          onClose={() => setEditingId(null)}
          onMediaReady={(path) => void syncMedia([path])}
          onTrash={() => {
            void applyPatch(editingNote.id, { trashed: true, pinned: false })
            setEditingId(null)
            notify('Dipindahkan ke sampah')
          }}
          onRestore={() => {
            void applyPatch(editingNote.id, { trashed: false, archived: false })
            setEditingId(null)
            notify('Catatan dipulihkan ke Catatan')
          }}
          onArchive={() => {
            void applyPatch(editingNote.id, { archived: true, trashed: false })
            setEditingId(null)
            notify('Catatan diarsipkan')
          }}
          onUnarchive={() => {
            void applyPatch(editingNote.id, { archived: false })
            setEditingId(null)
            notify('Catatan dikeluarkan dari arsip')
          }}
          onDeleteForever={() => void handleDelete(editingNote)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
