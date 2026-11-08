import { useRef } from 'react'
import { Icon } from './Icon'

export function ImageField({
  src,
  busy,
  disabled,
  onPick,
}: {
  src?: string | null
  busy: boolean
  disabled?: boolean
  onPick: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="image-field">
      <div className={`image-frame${src ? ' has-image' : ''}`}>
        {src ? (
          <img src={src} alt="Foto catatan" />
        ) : (
          <div className="image-empty">
            <Icon name="image" size={30} />
            <p>Belum ada foto</p>
          </div>
        )}
        {busy && <div className="image-busy">Mengunggah…</div>}
      </div>

      {!disabled && (
        <div className="image-actions">
          <button type="button" className="btn btn--soft" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Icon name="image" size={17} />
            {src ? 'Ganti foto' : 'Pilih foto'}
          </button>
          <span className="muted">JPG/PNG, otomatis diperkecil sebelum diunggah.</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onPick(file)
              event.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}
