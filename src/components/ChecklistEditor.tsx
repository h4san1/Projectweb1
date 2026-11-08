import { useRef } from 'react'
import { newId } from '../lib/id'
import type { ChecklistItem } from '../lib/types'
import { Icon } from './Icon'

export function ChecklistEditor({
  items,
  onChange,
  disabled = false,
}: {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
  disabled?: boolean
}) {
  const listRef = useRef<HTMLUListElement | null>(null)

  function update(id: string, patch: Partial<ChecklistItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function addItem(afterId?: string) {
    const item: ChecklistItem = { id: newId(), text: '', done: false }
    if (!afterId) {
      onChange([...items, item])
      return
    }
    const index = items.findIndex((entry) => entry.id === afterId)
    const next = [...items]
    next.splice(index + 1, 0, item)
    onChange(next)
    requestAnimationFrame(() => {
      const inputs = listRef.current?.querySelectorAll<HTMLInputElement>('input[type="text"]')
      inputs?.[index + 1]?.focus()
    })
  }

  function removeItem(id: string) {
    if (items.length === 1) {
      onChange([{ id: newId(), text: '', done: false }])
      return
    }
    onChange(items.filter((item) => item.id !== id))
  }

  return (
    <div className="checklist">
      <ul ref={listRef} className="checklist-list">
        {items.map((item) => (
          <li key={item.id} className={`checklist-row${item.done ? ' is-done' : ''}`}>
            <label className="check">
              <input
                type="checkbox"
                checked={item.done}
                disabled={disabled}
                onChange={(event) => update(item.id, { done: event.target.checked })}
                aria-label="Tandai selesai"
              />
              <span className="check-box">
                <Icon name="check" size={12} />
              </span>
            </label>

            <input
              type="text"
              className="checklist-input"
              value={item.text}
              disabled={disabled}
              placeholder="Tambah item…"
              onChange={(event) => update(item.id, { text: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addItem(item.id)
                }
                if (event.key === 'Backspace' && item.text === '') {
                  event.preventDefault()
                  removeItem(item.id)
                }
              }}
            />

            {!disabled && (
              <button
                type="button"
                className="row-remove"
                onClick={() => removeItem(item.id)}
                aria-label="Hapus item"
                title="Hapus item"
              >
                <Icon name="close" size={15} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {!disabled && (
        <button type="button" className="add-item" onClick={() => addItem()}>
          <Icon name="plus" size={16} />
          Tambah item
        </button>
      )}
    </div>
  )
}
