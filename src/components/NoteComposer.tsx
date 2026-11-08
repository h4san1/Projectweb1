import { useRef, useState } from 'react'
import { compressImage, dataUrlToBlob } from '../lib/image'
import { uploadImage } from '../lib/media'
import { newId } from '../lib/id'
import { errorMessage } from '../lib/errors'
import { NOTE_COLORS, type ChecklistItem, type NewNote, type NoteKind } from '../lib/types'
import { Icon, type IconName } from './Icon'
import { ChecklistEditor } from './ChecklistEditor'
import { ColorPicker } from './ColorPicker'
import { DrawingCanvas } from './DrawingCanvas'
import { ImageField } from './ImageField'

const KIND_OPTIONS: { id: NoteKind; icon: IconName; label: string }[] = [
  { id: 'text', icon: 'notes', label: 'Tulisan' },
  { id: 'list', icon: 'checklist', label: 'Checklist' },
  { id: 'drawing', icon: 'brush', label: 'Gambar' },
  { id: 'photo', icon: 'image', label: 'Foto' },
]

function emptyItem(): ChecklistItem {
  return { id: newId(), text: '', done: false }
}

export function NoteComposer({
  userId,
  onCreate,
}: {
  userId: string
  onCreate: (draft: NewNote) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<NoteKind>('text')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [items, setItems] = useState<ChecklistItem[]>([emptyItem()])
  const [color, setColor] = useState(NOTE_COLORS[0].value)
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null)
  const [drawing, setDrawing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)

  function reset() {
    if (photo) URL.revokeObjectURL(photo.preview)
    setOpen(false)
    setKind('text')
    setTitle('')
    setBody('')
    setItems([emptyItem()])
    setColor(NOTE_COLORS[0].value)
    setPhoto(null)
    setDrawing(null)
    setError(null)
    setBusy(false)
  }

  function openWith(nextKind: NoteKind) {
    setKind(nextKind)
    setOpen(true)
    setError(null)
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  function pickPhoto(file: File) {
    setError(null)
    if (photo) URL.revokeObjectURL(photo.preview)
    setPhoto({ file, preview: URL.createObjectURL(file) })
  }

  async function submit() {
    if (busy) return

    const cleanedItems = items.filter((item) => item.text.trim() !== '')
    const hasContent = Boolean(title.trim() || body.trim() || cleanedItems.length || photo || drawing)
    if (!hasContent) {
      reset()
      return
    }

    setBusy(true)
    setError(null)

    try {
      let mediaPath: string | null = null

      if (kind === 'photo' && photo) {
        const blob = await compressImage(photo.file)
        mediaPath = await uploadImage(userId, blob, 'jpg')
      } else if (kind === 'drawing' && drawing) {
        mediaPath = await uploadImage(userId, dataUrlToBlob(drawing), 'png')
      }

      await onCreate({
        kind,
        title: title.trim(),
        body: body.trim(),
        items: kind === 'list' ? cleanedItems : [],
        media_path: mediaPath,
        color,
      })
      reset()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="composer">
        <div className="composer-bar">
          <button type="button" className="composer-open" onClick={() => openWith('text')}>
            <span className="composer-plus">
              <Icon name="plus" size={18} />
            </span>
            <span className="composer-placeholder">Buat catatan…</span>
          </button>
          <div className="composer-quick">
            <button type="button" className="icon-btn" onClick={() => openWith('list')} title="Checklist baru" aria-label="Checklist baru">
              <Icon name="checklist" />
            </button>
            <button type="button" className="icon-btn" onClick={() => openWith('drawing')} title="Gambar baru" aria-label="Gambar baru">
              <Icon name="brush" />
            </button>
            <button type="button" className="icon-btn" onClick={() => openWith('photo')} title="Foto baru" aria-label="Foto baru">
              <Icon name="image" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="composer composer--open" style={{ background: color }}>
      <input
        ref={titleRef}
        className="composer-title"
        placeholder="Judul"
        value={title}
        maxLength={180}
        onChange={(event) => setTitle(event.target.value)}
      />

      {kind === 'text' && (
        <textarea
          className="composer-body"
          placeholder="Tulis sesuatu…"
          value={body}
          rows={3}
          onChange={(event) => setBody(event.target.value)}
        />
      )}

      {kind === 'list' && <ChecklistEditor items={items} onChange={setItems} />}

      {kind === 'drawing' && <DrawingCanvas onChange={setDrawing} />}

      {kind === 'photo' && (
        <ImageField src={photo?.preview} busy={false} onPick={pickPhoto} />
      )}

      {error && <p className="alert alert--error">{error}</p>}

      <div className="composer-foot">
        <div className="composer-tools">
          <ColorPicker value={color} onChange={setColor} />
          <div className="kind-switch" role="group" aria-label="Jenis catatan">
            {KIND_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`kind-btn${kind === option.id ? ' is-active' : ''}`}
                onClick={() => setKind(option.id)}
                title={option.label}
                aria-label={option.label}
                aria-pressed={kind === option.id}
              >
                <Icon name={option.icon} size={17} />
              </button>
            ))}
          </div>
        </div>

        <div className="composer-actions">
          <button type="button" className="btn btn--ghost" onClick={reset} disabled={busy}>
            Tutup
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
