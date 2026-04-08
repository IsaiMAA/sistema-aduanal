import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PedimentoForm from '@/components/pedimentos/pedimento-form'
import AvanzarEstadoBtn from '../avanzar-estado-btn'
import { actualizarPedimento } from '../actions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pedimento' }

const ESTADO_COLORS: Record<string, string> = {
  borrador:  'bg-gray-100 text-gray-600',
  generado:  'bg-blue-100 text-blue-700',
  enviado:   'bg-yellow-100 text-yellow-700',
  validado:  'bg-indigo-100 text-indigo-700',
  pagado:    'bg-orange-100 text-orange-700',
  liberado:  'bg-green-100 text-green-700',
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function PedimentoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: pedimento } = await supabase
    .from('pedimentos')
    .select(`
      *,
      referencias(
        id, referencia, tipo_operacion, aduana,
        clientes(razon_social, clave, rfc)
      )
    `)
    .eq('id', id)
    .single()

  if (!pedimento) notFound()

  const ref = pedimento.referencias as unknown as {
    id: string
    referencia: string
    tipo_operacion: string
    aduana: string | null
    clientes: { razon_social: string; clave: string; rfc: string } | null
  } | null

  const cliente = ref?.clientes
  const editable = !['liberado'].includes(pedimento.estado)
  const actionConId = actualizarPedimento.bind(null, id)

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/pedimentos" className="text-sm text-gray-400 hover:text-gray-600">
              Pedimentos
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600 font-mono">
              {pedimento.numero_pedimento ?? 'Sin número'}
            </span>
          </div>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">
            {pedimento.numero_pedimento ?? 'Pedimento en borrador'}
          </h1>
          {ref && (
            <p className="text-sm text-gray-500">
              Ref. <span className="font-mono">{ref.referencia}</span>
              {' · '}
              {cliente?.razon_social}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${ESTADO_COLORS[pedimento.estado] ?? 'bg-gray-100 text-gray-600'}`}>
            {pedimento.estado}
          </span>
          <AvanzarEstadoBtn id={id} estado={pedimento.estado} />
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg border border-gray-200 bg-white p-4">
        {[
          { label: 'Valor aduana (USD)',  valor: `$${fmt(pedimento.valor_aduana)}` },
          { label: 'Tipo de cambio',      valor: pedimento.tipo_cambio ? `$${fmt(pedimento.tipo_cambio)}` : '—' },
          { label: 'Total IVA (MXN)',     valor: `$${fmt(pedimento.total_iva)}` },
          { label: 'Total impuestos',     valor: `$${fmt(pedimento.total_impuestos)}` },
        ].map(({ label, valor }) => (
          <div key={label}>
            <p className="text-xs text-gray-400">{label}</p>
            <p className="font-mono font-semibold text-sm text-gray-900">{valor}</p>
          </div>
        ))}
      </div>

      {/* Desglose impuestos */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Desglose de impuestos (MXN)</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            { label: 'IGI', valor: pedimento.total_igi },
            { label: 'DTA', valor: pedimento.total_dta },
            { label: 'IVA', valor: pedimento.total_iva },
          ].map(({ label, valor }) => (
            <div key={label} className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">{label}</span>
              <span className="font-mono font-medium">${fmt(valor)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span className="font-mono">${fmt(pedimento.total_impuestos)}</span>
        </div>
      </div>

      {/* Enlace a referencia */}
      {ref && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Referencia vinculada</p>
            <p className="font-mono font-semibold">{ref.referencia}</p>
            <p className="text-gray-500 text-xs capitalize">{ref.tipo_operacion} · Aduana {ref.aduana ?? '—'}</p>
          </div>
          <Link
            href={`/referencias/${ref.id}`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Ver referencia
          </Link>
        </div>
      )}

      {/* Formulario de edición */}
      {editable ? (
        <PedimentoForm
          action={actionConId}
          initialData={pedimento}
          referenciaFija={ref ? { id: ref.id, referencia: ref.referencia, cliente: cliente?.razon_social ?? '' } : undefined}
          cancelHref="/pedimentos"
        />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          Este pedimento está <strong>liberado</strong> y no puede editarse.
        </div>
      )}
    </div>
  )
}
