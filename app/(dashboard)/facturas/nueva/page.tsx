import { createClient } from '@/lib/supabase/server'
import FacturaForm from '@/components/facturas/factura-form'
import { crearFactura } from '../actions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nueva factura' }

export default async function NuevaFacturaPage({
  searchParams,
}: {
  searchParams: Promise<{ referencia_id?: string; cliente_id?: string }>
}) {
  const { referencia_id, cliente_id } = await searchParams
  const supabase = await createClient()

  const [{ data: clientes }, { data: referencias }] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, clave, razon_social, rfc, uso_cfdi')
      .eq('activo', true)
      .order('razon_social'),
    supabase
      .from('referencias')
      .select('id, referencia')
      .in('estado', ['captura', 'validado', 'firmado', 'despachado'])
      .order('fecha_alta', { ascending: false }),
  ])

  // Referencia fija (cuando viene desde una referencia)
  let referenciaFija: { id: string; referencia: string } | undefined
  if (referencia_id) {
    const ref = referencias?.find((r) => r.id === referencia_id)
    if (ref) referenciaFija = ref
  }

  // Cliente fijo (cuando viene con cliente pre-seleccionado)
  let clienteFijo: { id: string; razon_social: string; rfc: string } | undefined
  if (cliente_id) {
    const cli = clientes?.find((c) => c.id === cliente_id)
    if (cli) clienteFijo = cli
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Nueva factura CFDI</h1>
        <p className="text-sm text-gray-500">El folio se asigna automáticamente según la serie</p>
      </div>
      <FacturaForm
        action={crearFactura}
        clientes={clientes ?? []}
        referencias={referenciaFija ? undefined : referencias ?? []}
        referenciaFija={referenciaFija}
        clienteFijo={clienteFijo}
        cancelHref={referencia_id ? `/referencias/${referencia_id}` : '/facturas'}
      />
    </div>
  )
}
