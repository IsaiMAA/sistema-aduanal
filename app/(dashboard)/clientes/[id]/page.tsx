import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ClienteForm from '@/components/clientes/cliente-form'
import { actualizarCliente } from '../actions'
import ToggleActivoBtn from '../toggle-activo-btn'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Cliente' }

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!cliente) notFound()

  const actionConId = actualizarCliente.bind(null, id)

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/clientes" className="text-sm text-gray-400 hover:text-gray-600">
              Clientes
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600">{cliente.razon_social}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">{cliente.razon_social}</h1>
          <p className="text-sm text-gray-500">
            {cliente.clave} · {cliente.rfc}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              cliente.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {cliente.activo ? 'Activo' : 'Inactivo'}
          </span>
          <ToggleActivoBtn id={cliente.id} activo={cliente.activo} />
        </div>
      </div>

      {/* Formulario de edición */}
      <ClienteForm
        action={actionConId}
        initialData={cliente}
        cancelHref="/clientes"
      />
    </div>
  )
}
