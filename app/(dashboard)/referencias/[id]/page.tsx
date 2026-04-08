import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ReferenciaForm from '@/components/referencias/referencia-form'
import CambiarEstadoBtn from '../cambiar-estado-btn'
import { actualizarReferencia } from '../actions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Referencia' }

const ESTADO_COLORS: Record<string, string> = {
  captura:    'bg-gray-100 text-gray-600',
  validado:   'bg-blue-100 text-blue-700',
  firmado:    'bg-yellow-100 text-yellow-700',
  despachado: 'bg-green-100 text-green-700',
  cancelado:  'bg-red-100 text-red-600',
}

export default async function ReferenciaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: referencia },
    { data: clientes },
    { data: claves_documento },
    { data: aduanas },
    { data: pedimento },
    { data: facturas },
  ] = await Promise.all([
    supabase
      .from('referencias')
      .select(`
        *,
        clientes(razon_social, clave, rfc),
        cat_claves_documento(clave, descripcion),
        cat_aduanas(clave, nombre)
      `)
      .eq('id', id)
      .single(),
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
    supabase
      .from('pedimentos')
      .select('id, estado, numero_pedimento')
      .eq('referencia_id', id)
      .maybeSingle(),
    supabase
      .from('facturas_cfdi')
      .select('id, serie, folio, estado, total')
      .eq('referencia_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (!referencia) notFound()

  const cliente = referencia.clientes as { razon_social: string; clave: string; rfc: string } | null
  const doc = referencia.cat_claves_documento as { clave: string; descripcion: string } | null
  const aduana = referencia.cat_aduanas as { clave: string; nombre: string } | null

  const actionConId = actualizarReferencia.bind(null, id)
  const editable = !['despachado', 'cancelado'].includes(referencia.estado)

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/referencias" className="text-sm text-gray-400 hover:text-gray-600">
              Referencias
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600 font-mono">{referencia.referencia}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">{referencia.referencia}</h1>
          <p className="text-sm text-gray-500">
            {cliente?.clave} — {cliente?.razon_social}
            {' · '}
            {doc?.clave} — {doc?.descripcion}
          </p>
          {aduana && (
            <p className="text-xs text-gray-400 mt-0.5">Aduana {aduana.clave} — {aduana.nombre}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${ESTADO_COLORS[referencia.estado] ?? 'bg-gray-100 text-gray-600'}`}>
            {referencia.estado}
          </span>
          <CambiarEstadoBtn id={id} estado={referencia.estado} />
        </div>
      </div>

      {/* Info rápida */}
      <div className="grid grid-cols-3 gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <div>
          <p className="text-xs text-gray-400">Tipo</p>
          <p className="font-medium capitalize">{referencia.tipo_operacion}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Fecha alta</p>
          <p className="font-medium">{new Date(referencia.fecha_alta).toLocaleDateString('es-MX')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Contenedor / BL</p>
          <p className="font-mono">{referencia.contenedor ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Peso bruto</p>
          <p className="font-medium">{referencia.peso_bruto != null ? `${referencia.peso_bruto} kg` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Bultos</p>
          <p className="font-medium">{referencia.bultos ?? '—'}</p>
        </div>
        {referencia.fecha_despacho && (
          <div>
            <p className="text-xs text-gray-400">Fecha despacho</p>
            <p className="font-medium">{new Date(referencia.fecha_despacho).toLocaleDateString('es-MX')}</p>
          </div>
        )}
      </div>

      {/* Pedimento vinculado */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <div>
          <p className="text-xs text-gray-400">Pedimento</p>
          {pedimento ? (
            <p className="font-mono font-semibold">{pedimento.numero_pedimento ?? 'En borrador'}</p>
          ) : (
            <p className="text-gray-400 italic">Sin pedimento</p>
          )}
        </div>
        {pedimento ? (
          <Link
            href={`/pedimentos/${pedimento.id}`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Ver pedimento
          </Link>
        ) : (
          <Link
            href={`/pedimentos/nuevo?referencia_id=${id}`}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Crear pedimento
          </Link>
        )}
      </div>

      {/* Facturas vinculadas */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Facturas CFDI</p>
          <Link
            href={`/facturas/nueva?referencia_id=${id}&cliente_id=${referencia.cliente_id}`}
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            + Nueva factura
          </Link>
        </div>
        {facturas && facturas.length > 0 ? (
          <div className="space-y-1">
            {facturas.map((f) => (
              <Link
                key={f.id}
                href={`/facturas/${f.id}`}
                className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-gray-50"
              >
                <span className="font-mono font-semibold">{f.serie}{f.folio}</span>
                <span className="text-gray-500">${f.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  f.estado === 'timbrada' ? 'bg-green-100 text-green-700' :
                  f.estado === 'pagada'   ? 'bg-blue-100 text-blue-700' :
                  f.estado === 'cancelada'? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {f.estado}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 italic">Sin facturas</p>
        )}
      </div>

      {referencia.observaciones && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <p className="text-xs text-gray-400 mb-1">Observaciones</p>
          <p className="text-gray-700">{referencia.observaciones}</p>
        </div>
      )}

      {/* Formulario de edición (solo si no está despachado/cancelado) */}
      {editable ? (
        <ReferenciaForm
          action={actionConId}
          clientes={clientes ?? []}
          claves_documento={claves_documento ?? []}
          aduanas={aduanas ?? []}
          initialData={referencia}
          cancelHref="/referencias"
        />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          Esta referencia está en estado <strong>{referencia.estado}</strong> y no puede editarse.
        </div>
      )}
    </div>
  )
}
