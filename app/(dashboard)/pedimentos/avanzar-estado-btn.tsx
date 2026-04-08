'use client'

import { useTransition } from 'react'
import { avanzarEstadoPedimento } from './actions'

const FLUJO: Record<string, { siguiente: string; label: string; color: string }> = {
  borrador:  { siguiente: 'generado',  label: 'Marcar generado',  color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  generado:  { siguiente: 'enviado',   label: 'Marcar enviado',   color: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  enviado:   { siguiente: 'validado',  label: 'Marcar validado',  color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  validado:  { siguiente: 'pagado',    label: 'Marcar pagado',    color: 'bg-orange-500 hover:bg-orange-600 text-white' },
  pagado:    { siguiente: 'liberado',  label: 'Marcar liberado',  color: 'bg-green-600 hover:bg-green-700 text-white' },
}

export default function AvanzarEstadoBtn({ id, estado }: { id: string; estado: string }) {
  const [pending, startTransition] = useTransition()
  const accion = FLUJO[estado]

  if (!accion) return null

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => avanzarEstadoPedimento(id, accion.siguiente))}
      className={`rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50 ${accion.color}`}
    >
      {pending ? 'Guardando…' : accion.label}
    </button>
  )
}
