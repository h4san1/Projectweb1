import { formatDate } from '../lib/format'
import { KIND_LABEL, type Note } from '../lib/types'
import { Icon } from './Icon'

export function NoteCard({
  note,
  imageUrl,
  onOpen,
}: {
  note: Note
  imageUrl?: string
  onOpen: () => void
}) {
  const previewItems = note.items.slice(0, 8)
  const hasMedia = note.kind === 'photo' || note.kind === 'drawing'

  return (
    <article
      className={`note-card${note.pinned ? ' is-pinned' : ''}${note.trashed ? ' is-trashed' : ''}`}
      style={{ background: note.color }}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      role="button"
      tabIndex={0}
    >
      {note.pinned && (
        <span className="pin-mark" title="Disematkan">
          <Icon name="pin" size={15} filled />
        </span>
      )}

      {note.title && <h3 className="note-title">{note.title}</h3>}

      {hasMedia && (
        <div className={`note-media note-media--${note.kind}`}>
          {imageUrl ? (
            <img src={imageUrl} alt={note.title || KIND_LABEL[note.kind]} loading="lazy" />
          ) : (
            <div className="media-skeleton" aria-hidden="true" />
          )}
        </div>
      )}

      {note.kind === 'list' && note.items.length > 0 && (
        <ul className="note-checklist">
          {previewItems.map((item) => (
            <li key={item.id} className={item.done ? 'is-done' : ''}>
              <span className="mini-check">{item.done && <Icon name="check" size={11} />}</span>
              <span className="mini-text">{item.text || 'Item kosong'}</span>
            </li>
          ))}
          {note.items.length > previewItems.length && (
            <li className="more">+{note.items.length - previewItems.length} item lainnya</li>
          )}
        </ul>
      )}

      {note.kind !== 'list' && note.body && <p className="note-text">{note.body}</p>}

      <footer className="note-foot">
        <span className="note-kind">{KIND_LABEL[note.kind]}</span>
        <span className="note-date">{formatDate(note.updated_at)}</span>
      </footer>
    </article>
  )
}
