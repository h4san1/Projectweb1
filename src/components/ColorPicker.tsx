import { NOTE_COLORS } from '../lib/types'

export function ColorPicker({
  value,
  onChange,
  align = 'start',
}: {
  value: string
  onChange: (color: string) => void
  align?: 'start' | 'end'
}) {
  return (
    <div className={`color-picker color-picker--${align}`} role="group" aria-label="Warna catatan">
      {NOTE_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          className={`swatch${value === color.value ? ' is-active' : ''}`}
          style={{ background: color.value }}
          title={color.label}
          aria-label={`Warna ${color.label}`}
          aria-pressed={value === color.value}
          onClick={() => onChange(color.value)}
        />
      ))}
    </div>
  )
}
