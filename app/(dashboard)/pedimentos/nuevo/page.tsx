import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PedimentoForm from '@/components/pedimentos/pedimento-form'
import { crearPedimento } from '../actions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nuevo pedimento' }

export default async function NuevoPedimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ referencia_id?: string }>
}) {
  const { referencia_id } = await searchParams
  const supabase = await createClient()

  // Si viene con referencia_id, cargamos los datos de la referencia
  let referenciaFija: { id: string; referencia: string; cliente: string } | undefined
  let referencias: { id: string; referencia: string; clientes: { razon_social: string; clave: string } | null }[] = []

  if (referencia_id) {
    const { data: ref } = await supabase
      .from('referencias')
      .select('id, referencia, clientes(razon_social, clave)')
      .eq('id', referencia_id)
      .single()

    if (!ref) notFound()

    const cliente = ref.clientes as unknown as { razon_social: string; clave: string } | null
    referenciaFija = {
      id: ref.id,
      referencia: ref.referencia,
      cliente: cliente ? `${cliente.clave} — ${cliente.razon_social}` : '',
    }
  } else {
    // Sin referencia_id: mostrar selector de referencias sin pedimento
    const { data } = await supabase
      .from('referencias')
      .select('id, referencia, clientes(razon_social, clave)')
      .in('estado', ['captura', 'validado', 'firmado'])
      .order('fecha_alta', { ascending: false })

    // Filtrar las que ya tienen pedimento (no se puede hacer en 1 query sin RPC)
    const { data: conPedimento } = await supabase
      .from('pedimentos')
      .select('referencia_id')

    const idsConPedimento = new Set(conPedimento?.map((p) => p.referencia_id) ?? [])
    referencias = (data ?? [])
      .filter((r) => !idsConPedimento.has(r.id))
      .map((r) => ({
        id: r.id,
        referencia: r.referencia,
        clientes: r.clientes as unknown as { razon_social: string; clave: string } | null,
      }))
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Nuevo pedimento</h1>
        <p className="text-sm text-gray-500">Captura los datos del pedimento aduanal</p>
      </div>
      <PedimentoForm
        action={crearPedimento}
        referencias={referencias}
        referenciaFija={referenciaFija}
        cancelHref={referencia_id ? `/referencias/${referencia_id}` : '/pedimentos'}
      />
    </div>
  )
}
