'use client'
import { useEffect, useState } from 'react'

type Props = { total: number; pageSize: number; onGo: (n: number) => void }

export default function SearchNumber({ total, pageSize, onGo }: Props) {
  const [val, setVal] = useState('')
  const [open, setOpen] = useState(false)

  const parsed = val === '' ? null : Math.max(1, Math.min(total, parseInt(val, 10) || 0))
  const pageOf = parsed ? Math.ceil(parsed / pageSize) : null

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const handleSelect = (n: number) => {
    onGo(n)
    setOpen(false)
    setVal('')
  }

  return (
    <div className="w-full relative">
      <input
        aria-label="Ir al número"
        type="tel" inputMode="numeric" pattern="[0-9]*" enterKeyHint="go"
        maxLength={6}
        value={val}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
        placeholder="Elija numeros del 0 del al 100000..."
        className="w-full border rounded-xl p-3 text-base"
      />
      {val && open && parsed && (
        <div className="absolute left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-20">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSelect(parsed)}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100"
          >
            Ir al <b>#{parsed}</b>
            {pageOf && <span className="ml-2 text-xs text-gray-500">página {pageOf}</span>}
          </button>
        </div>
      )}
    </div>
  )
}
