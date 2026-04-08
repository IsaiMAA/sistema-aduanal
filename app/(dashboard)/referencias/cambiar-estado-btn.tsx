'use client'

import { useTransition } from 'react'
import { cambiarEstado } from './actions'

const FLUJO: Record<string, { siguiente: string; label: string; color: string }> = {
  captura:    { siguiente: 'validado',   label: 'Marcar validado',   color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  validado:   { siguiente: 'firmado',    label: 'Marcar firmado',    color: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  firmado:    { siguiente: 'despachado', label: 'Marcar despachado', color: 'bg-green-600 hover:bg-green-700 text-white' },
}

export default function CambiarEstadoBtn({
  id,
  estado,
}: {
  id: string
  estado: string
}) {
  const [pending, startTransition] = useTransition()
  const accion = FLUJO[estado]

  if (!accion) return null

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => cambiarEstado(id, accion.siguiente))}
      className={`rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50 ${accion.color}`}
    >
      {pending ? 'Guardando…' : accion.label}
    </button>
  )
}
