import { createClient } from '@/lib/supabase/server'
import ReferenciaForm from '@/components/referencias/referencia-form'
import { crearReferencia } from '../actions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nueva referencia' }

export default async function NuevaReferenciaPage() {
  const supabase = await createClient()

  const [
    { data: clientes },
    { data: claves_documento },
    { data: aduanas },
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, clave, razon_social')
      .eq('activo', true)
      .order('razon_social'),
    supabase
      .from('cat_claves_documento')
      .select('clave, descripcion')
      .eq('activa', true)
      .order('clave'),
    supabase
      .from('cat_aduanas')
      .select('clave, nombre')
      .order('clave'),
  ])

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Nueva referencia</h1>
        <p className="text-sm text-gray-500">Captura los datos de la nueva operación</p>
      </div>
      <ReferenciaForm
        action={crearReferencia}
        clientes={clientes ?? []}
        claves_documento={claves_documento ?? []}
        aduanas={aduanas ?? []}
        cancelHref="/referencias"
      />
    </div>
  )
}
