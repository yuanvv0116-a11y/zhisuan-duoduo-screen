import type { ReactNode } from 'react'

interface SearchFieldProps {
  label: string
  children: ReactNode
}

export default function SearchField({ label, children }: SearchFieldProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span style={{ whiteSpace: 'nowrap', marginRight: 8 }}>{label}：</span>
      {children}
    </div>
  )
}
