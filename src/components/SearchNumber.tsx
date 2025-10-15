'use client'
import { useEffect, useState, useRef } from 'react'

type Props = { 
  total: number
  pageSize: number
  onGo: (n: number) => void 
}

type SearchResult = {
  id: number
  status: 'free' | 'held' | 'sold'
  held_by: string | null
  order_id: string | null
}

const formatNumber = (n: number) => String(n).padStart(5, '0')

export default function SearchNumber({ total, pageSize, onGo }: Props) {
  const [val, setVal] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Buscar cuando cambia el valor
  useEffect(() => {
    if (val === '') {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/search-numbers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: val, limit: 20 }),
        })
        const data = await res.json()
        if (data.results) {
          setResults(data.results)
        }
      } catch (error) {
        console.error('Error buscando:', error)
      } finally {
        setLoading(false)
      }
    }, 300) // Debounce de 300ms

    return () => clearTimeout(timer)
  }, [val])

  const handleSelect = (n: number) => {
    onGo(n)
    setVal('')
    setOpen(false)
    setResults([])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'free':
        return 'bg-emerald-100 border-emerald-300'
      case 'held':
        return 'bg-amber-100 border-amber-300'
      case 'sold':
        return 'bg-rose-100 border-rose-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'free':
        return 'Disponible'
      case 'held':
        return 'Reservado'
      case 'sold':
        return 'Vendido'
      default:
        return status
    }
  }

  return (
    <div className="w-full relative" ref={containerRef}>
      <input
        aria-label="Buscar número"
        type="tel" 
        inputMode="numeric" 
        pattern="[0-9]*" 
        enterKeyHint="search"
        maxLength={6}
        value={val}
        onFocus={() => setOpen(true)}
        onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
        placeholder="Buscar por número"
        className="w-full border rounded-xl p-3 text-base"
      />

      
      
      {open && val && (
        <div className="absolute left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg z-20 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
  No se encontraron números que terminen con "{val}"
</div>
          ) : (
            <div className="py-1">
              {results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelect(result.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">
                      #{formatNumber(result.id)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(
                        result.status
                      )}`}
                    >
                      {getStatusText(result.status)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    pág. {Math.ceil(result.id / pageSize)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}