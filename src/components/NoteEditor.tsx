import { useCallback, useEffect, useRef, useState } from 'react'
import { compressImage, dataUrlToBlob } from '../lib/image'
import { uploadImage } from '../lib/media'
import { errorMessage } from '../lib/errors'
import { KIND_ICON, KIND_LABEL, type ChecklistItem, type Note, type NotePatch } from '../lib/types'
import { ChecklistEditor } from './ChecklistEditor'
import { ColorPicker } from './ColorPicker'
import { DrawingCanvas } from './DrawingCanvas'
import { Icon } from './Icon'
import { ImageField } from './ImageField'
import { Modal } from './Modal'

interface Draft {
  title: string
  body: string
  items: ChecklistItem[]
  color: string
  pinned: boolean
}

export function NoteEditor({
  note,
  imageUrl,
  userId,
  onPatch,
  onClose,
  onMediaReady,
  onTrash,
  onRestore,
  onArchive,
  onUnarchive,
  onDeleteForever,
}: {
  note: Note
  imageUrl?: string
  userId: string
  onPatch: (id: string, patch: NotePatch) => Promise<void>
  onClose: () => void
  onMediaReady: (path: string) => void
  onTrash: () => void
  onRestore: () => void
  onArchive: () => void
  onUnarchive: () => void
  onDeleteForever: () => void
}) {
  const [draft, setDraft] = useState<Draft>({
    title: note.title,
    body: note.body,
    items: note.items,
    color: note.color,
    pinned: note.pinned,
  })
  const draftRef = useRef<Draft>(draft)
  const dirtyRef = useRef(false)
  const saveTimer = useRef<number | null>(null)
  const drawTimer = useRef<number | null>(null)
  const pendingDrawing = useRef<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [busyMedia, setBusyMedia] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [drawSrc, setDrawSrc] = useState<string | undefined>(imageUrl)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const readOnly = note.trashed

  const commitMedia = useCallback(
    async (blob: Blob, ext: string) => {
      setBusyMedia(true)
      setMediaError(null)
      try {
        const path = await uploadImage(userId, blob, ext)
        await onPatch(note.id, { media_path: path })
        onMediaReady(path)
      } catch (err) {
        setMediaError(errorMessage(err))
      } finally {
        setBusyMedia(false)
      }
    },
    [userId, note.id, onPatch, onMediaReady],
  )

  const flush = useCallback(async () => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    if (!dirtyRef.current) return
    dirtyRef.current = false
    setSaveState('saving')
    await onPatch(note.id, draftRef.current)
    setSaveState('saved')
  }, [note.id, onPatch])

  const edit = useCallback(
    (patch: Partial<Draft>) => {
      const next = { ...draftRef.current, ...patch }
      draftRef.current = next
      setDraft(next)
      dirtyRef.current = true
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        void flush()
      }, 700)
    },
    [flush],
  )

  const scheduleDrawing = useCallback(
    (dataUrl: string) => {
      pendingDrawing.current = dataUrl
      if (drawTimer.current) window.clearTimeout(drawTimer.current)
      drawTimer.current = window.setTimeout(() => {
        const pending = pendingDrawing.current
        pendingDrawing.current = null
        drawTimer.current = null
        if (pending) void commitMedia(dataUrlToBlob(pending), 'png')
      }, 1000)
    },
    [commitMedia],
  )

  const close = useCallback(() => {
    if (drawTimer.current) {
      window.clearTimeout(drawTimer.current)
      drawTimer.current = null
    }
    const pending = pendingDrawing.current
    pendingDrawing.current = null
    if (pending) void commitMedia(dataUrlToBlob(pending), 'png')
    void flush()
    onClose()
  }, [commitMedia, flush, onClose])

  // Simpan sisa perubahan bila komponen dilepas tanpa lewat tombol tutup.
  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      if (dirtyRef.current) {
        dirtyRef.current = false
        void onPatch(note.id, draftRef.current)
      }
    }
  }, [note.id, onPatch])

  useEffect(() => {
    setDrawSrc((prev) => prev ?? imageUrl)
  }, [imageUrl])

  useEffect(() => {
    const element = bodyRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.max(element.scrollHeight, 150)}px`
  }, [draft.body])

  async function pickPhoto(file: File) {
    try {
      setMediaError(null)
      const blob = await compressImage(file)
      await commitMedia(blob, 'jpg')
    } catch (err) {
      setMediaError(errorMessage(err))
    }
  }

  const drawingReady = !note.media_path || Boolean(drawSrc)

  return (
    <Modal onClose={close} labelledBy="editor-title">
      <div className="editor" style={{ background: draft.color }}>
        <header className="editor-head">
          <span className="chip">
            <Icon name={KIND_ICON[note.kind]} size={15} />
            {KIND_LABEL[note.kind]}
          </span>
          {note.archived && <span className="chip chip--muted">Diarsipkan</span>}
          {note.trashed && <span className="chip chip--warn">Di sampah</span>}
          <span className="save-hint">
            {busyMedia
              ? 'Mengunggah gambar…'
              : saveState === 'saving'
                ? 'Menyimpan…'
                : saveState === 'saved'
                  ? 'Tersimpan'
                  : 'Perubahan tersimpan otomatis'}
          </span>
          <button type="button" className="icon-btn" onClick={close} aria-label="Tutup catatan">
            <Icon name="close" />
          </button>
        </header>

        {note.trashed && (
          <div className="banner">
            Catatan ini ada di tempat sampah.
            <button type="button" className="btn btn--small" onClick={onRestore}>
              <Icon name="restore" size={15} />
              Pulihkan
            </button>
          </div>
        )}

        {mediaError && <p className="alert alert--error">{mediaError}</p>}

        <input
          id="editor-title"
          className="editor-title"
          placeholder="Judul"
          value={draft.title}
          maxLength={180}
          readOnly={readOnly}
          onChange={(event) => edit({ title: event.target.value })}
        />

        <div className="editor-body">
          {note.kind === 'text' && (
            <textarea
              ref={bodyRef}
              className="editor-text"
              placeholder="Tulis sesuatu…"
              value={draft.body}
              readOnly={readOnly}
              onChange={(event) => edit({ body: event.target.value })}
            />
          )}

          {note.kind === 'list' && (
            <ChecklistEditor
              items={draft.items}
              disabled={readOnly}
              onChange={(items) => edit({ items })}
            />
          )}

          {note.kind === 'drawing' &&
            (readOnly ? (
              imageUrl ? (
                <img className="editor-image" src={imageUrl} alt={note.title || 'Gambar catatan'} />
              ) : (
                <p className="muted">Gambar tidak tersedia.</p>
              )
            ) : drawingReady ? (
              <DrawingCanvas src={drawSrc} onChange={scheduleDrawing} />
            ) : (
              <div className="canvas-loading">Memuat gambar…</div>
            ))}

          {note.kind === 'photo' && (
            <ImageField src={imageUrl} busy={busyMedia} disabled={readOnly} onPick={pickPhoto} />
          )}
        </div>

        <footer className="editor-foot">
          <ColorPicker value={draft.color} onChange={(color) => edit({ color })} />

          <div className="editor-actions">
            {!readOnly && (
              <>
                <button
                  type="button"
                  className={`icon-btn${draft.pinned ? ' is-on' : ''}`}
                  onClick={() => edit({ pinned: !draft.pinned })}
                  aria-pressed={draft.pinned}
                  title={draft.pinned ? 'Lepas sematan' : 'Sematkan di atas'}
                  aria-label={draft.pinned ? 'Lepas sematan' : 'Sematkan di atas'}
                >
                  <Icon name="pin" size={19} filled={draft.pinned} />
                </button>

                <button
                  type="button"
                  className="icon-btn"
                  onClick={note.archived ? onUnarchive : onArchive}
                  title={note.archived ? 'Keluarkan dari arsip' : 'Arsipkan'}
                  aria-label={note.archived ? 'Keluarkan dari arsip' : 'Arsipkan'}
                >
                  <Icon name="archive" size={19} />
                </button>

                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={onTrash}
                  title="Buang ke sampah"
                  aria-label="Buang ke sampah"
                >
                  <Icon name="trash" size={19} />
                </button>
              </>
            )}

            {readOnly && (
              <>
                <button type="button" className="btn btn--soft" onClick={onRestore}>
                  <Icon name="restore" size={16} />
                  Pulihkan
                </button>
                <button
                  type="button"
                  className={`btn ${confirmDelete ? 'btn--danger' : 'btn--ghost'}`}
                  onClick={() => {
                    if (confirmDelete) onDeleteForever()
                    else setConfirmDelete(true)
                  }}
                >
                  <Icon name="trash" size={16} />
                  {confirmDelete ? 'Yakin hapus permanen?' : 'Hapus permanen'}
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </Modal>
  )
}
