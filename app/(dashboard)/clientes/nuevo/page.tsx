import ClienteForm from '@/components/clientes/cliente-form'
import { crearCliente } from '../actions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nuevo cliente' }

export default function NuevoClientePage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Nuevo cliente</h1>
        <p className="text-sm text-gray-500">Completa los datos del cliente</p>
      </div>
      <ClienteForm action={crearCliente} cancelHref="/clientes" />
    </div>
  )
}
