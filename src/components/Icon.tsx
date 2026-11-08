import type { ReactElement } from 'react'

export type IconName =
  | 'notes'
  | 'checklist'
  | 'brush'
  | 'pen'
  | 'pencil'
  | 'highlighter'
  | 'crayon'
  | 'image'
  | 'search'
  | 'pin'
  | 'archive'
  | 'trash'
  | 'plus'
  | 'close'
  | 'logout'
  | 'restore'
  | 'palette'
  | 'eraser'
  | 'check'
  | 'undo'

const PATHS: Record<IconName, ReactElement> = {
  notes: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8 8.5h8M8 12.5h8M8 16.5h5" />
    </>
  ),
  checklist: (
    <>
      <path d="M3.5 6.2 5 7.7l2.4-3" />
      <path d="M3.5 12.2 5 13.7l2.4-3" />
      <path d="M3.5 18.2 5 19.7l2.4-3" />
      <path d="M11 7h9.5M11 13h9.5M11 19h6.5" />
    </>
  ),
  brush: (
    <>
      <path d="M9.1 11.9 17.2 3.8a2.85 2.85 0 1 1 4 4L13.1 15.9" />
      <path d="M7.1 14.9c-1.7 0-3 1.4-3 3 0 1.3-2.5 1.5-2 2 1.1 1.1 2.5 2 4 2 2.2 0 4-1.8 4-4a3 3 0 0 0-3-3Z" />
    </>
  ),
  pen: (
    <>
      <path d="M12 2.8 18.6 9.2 13.4 19.6 12 17.8 10.6 19.6 5.4 9.2 12 2.8Z" />
      <path d="M12 2.8v15" />
      <circle cx="12" cy="11.2" r="1.1" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l1.2-4.8L16.8 3.6a2 2 0 0 1 2.8 2.8L8.8 18.8 4 20Z" />
      <path d="M15.2 5.2l3.6 3.6" />
      <path d="M5.2 15.2l3.6 3.6" />
    </>
  ),
  highlighter: (
    <>
      <rect x="8" y="2.5" width="8" height="10" rx="1.6" />
      <path d="M9 12.5h6l1.5 3.5v3a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-3l1.5-3.5Z" />
      <path d="M8.5 6h7" />
    </>
  ),
  crayon: (
    <>
      <path d="M9 2.5 12 5l3-2.5V8l1 2v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-9l1-2V2.5Z" />
      <path d="M8.5 8.5h7" />
      <path d="M8.5 15h7" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="3" />
      <circle cx="8.8" cy="10" r="1.7" />
      <path d="M3.6 17.2l4.6-4.1a2 2 0 0 1 2.7 0l6.5 6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.8" />
      <path d="M16.2 16.2 21 21" />
    </>
  ),
  pin: (
    <>
      <path d="M9.2 3.8h5.6" />
      <path d="M10.3 3.8v5.6L7.6 12v1.6h8.8V12l-2.7-2.6V3.8" />
      <path d="M12 13.6V20.5" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="3.8" width="18" height="4.4" rx="1.6" />
      <path d="M5 8.2v10.4A1.6 1.6 0 0 0 6.6 20.2h10.8a1.6 1.6 0 0 0 1.6-1.6V8.2" />
      <path d="M9.8 12.2h4.4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.4 7V5.6A1.6 1.6 0 0 1 11 4h2a1.6 1.6 0 0 1 1.6 1.6V7" />
      <path d="M6.4 7l.8 11.9A1.6 1.6 0 0 0 8.8 20.4h6.4a1.6 1.6 0 0 0 1.6-1.5L17.6 7" />
      <path d="M10.4 10.8v6.2M13.6 10.8v6.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  logout: (
    <>
      <path d="M14.6 4H17a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2.4" />
      <path d="M9.6 8 5.6 12l4 4" />
      <path d="M5.6 12h9" />
    </>
  ),
  restore: (
    <>
      <path d="M4 4.5v5h5" />
      <path d="M5.1 12.6A7 7 0 1 0 6.9 7L4 9.5" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.9 0-1.5-1.4-1.6-1.4-2.7 0-.9.7-1.5 1.7-1.5h1.4a4.3 4.3 0 0 0 4.3-4.3c0-3.7-3.6-6.6-8-6.6Z" />
      <circle cx="8" cy="9.2" r="1" />
      <circle cx="12" cy="7.4" r="1" />
      <circle cx="15.8" cy="9.6" r="1" />
      <circle cx="8.2" cy="14" r="1" />
    </>
  ),
  eraser: (
    <>
      <path d="M8.4 20.5H20" />
      <path d="M14.8 4.6l4.6 4.6-8.1 8.1H7l-2.4-2.4 10.2-10.3Z" />
      <path d="M10 9.4l4.6 4.6" />
    </>
  ),
  check: <path d="M5 12.6l4.4 4.4L19 6.6" />,
  undo: (
    <>
      <path d="M4 4.5v5h5" />
      <path d="M5.2 9.5h6.4a6.4 6.4 0 0 1 0 12.8H8" />
    </>
  ),
}

export function Icon({
  name,
  size = 20,
  filled = false,
}: {
  name: IconName
  size?: number
  filled?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
