'use client'
import { useEffect, useState, useRef } from 'react'

type Props = { total: number; pageSize: number; onGo: (n: number) => void }

export default function SearchNumber({ total, pageSize, onGo }: Props) {
  const [val, setVal] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const parsed = val === '' ? null : Math.max(1, Math.min(total, parseInt(val, 10) || 0))
  const pageOf = parsed ? Math.ceil(parsed / pageSize) : null

  // Cerrar con ESC o click fuera
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    
    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Manejar ENTER en el input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && parsed) {
      handleSelect(parsed)
    }
  }

  const handleSelect = (n: number) => {
    onGo(n)
    setVal('')
    setOpen(false)
  }

  return (
    <div className="w-full relative" ref={containerRef}>
      <input
        aria-label="Ir al número"
        type="tel" 
        inputMode="numeric" 
        pattern="[0-9]*" 
        enterKeyHint="go"
        maxLength={6}
        value={val}
        onFocus={() => setOpen(true)}
        onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
        onKeyDown={handleKeyDown}
        placeholder="Buscar número (0-100000)..."
        className="w-full border rounded-xl p-3 text-base"
      />
      {val && open && parsed && (
        <div className="absolute left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-20">
          <button
            type="button"
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