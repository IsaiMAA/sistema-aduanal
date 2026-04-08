'use client'

import { useTransition } from 'react'
import { toggleActivo } from './actions'

export default function ToggleActivoBtn({ id, activo }: { id: string; activo: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleActivo(id, activo))}
      className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-40"
    >
      {activo ? 'Desactivar' : 'Activar'}
    </button>
  )
}
