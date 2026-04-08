'use client'

import { useTransition } from 'react'
import { cancelarFactura, marcarPagada } from './actions'

export function CancelarBtn({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm('¿Cancelar este borrador?')) return
        startTransition(() => cancelarFactura(id))
      }}
      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? 'Cancelando…' : 'Cancelar factura'}
    </button>
  )
}

export function MarcarPagadaBtn({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => marcarPagada(id))}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? 'Guardando…' : 'Marcar como pagada'}
    </button>
  )
}
