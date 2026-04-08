import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CancelarBtn, MarcarPagadaBtn } from '../acciones-btn'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Factura CFDI' }

const ESTADO_COLORS: Record<string, string> = {
  borrador:  'bg-gray-100 text-gray-600',
  timbrada:  'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-600',
  pagada:    'bg-blue-100 text-blue-700',
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function FacturaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: factura } = await supabase
    .from('facturas_cfdi')
    .select(`
      *,
      clientes(razon_social, clave, rfc, domicilio, regimen_fiscal),
      referencias(referencia)
    `)
    .eq('id', id)
    .single()

  if (!factura) notFound()

  const { data: conceptos } = await supabase
    .from('conceptos_factura')
    .select('*')
    .eq('factura_id', id)
    .order('id')

  const cliente = factura.clientes as unknown as {
    razon_social: string; clave: string; rfc: string; domicilio: string | null; regimen_fiscal: string | null
  } | null

  const ref = factura.referencias as unknown as { referencia: string } | null

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/facturas" className="text-sm text-gray-400 hover:text-gray-600">
              Facturas
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-mono text-gray-600">{factura.serie}{factura.folio}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">
            Factura {factura.serie}{factura.folio}
          </h1>
          <p className="text-sm text-gray-500">
            {cliente?.razon_social}
            {ref && <> · Ref. <span className="font-mono">{ref.referencia}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${ESTADO_COLORS[factura.estado] ?? 'bg-gray-100 text-gray-600'}`}>
            {factura.estado}
          </span>
          {factura.estado === 'borrador' && <CancelarBtn id={id} />}
          {factura.estado === 'timbrada' && <MarcarPagadaBtn id={id} />}
        </div>
      </div>

      {/* Aviso de timbrado */}
      {factura.estado === 'borrador' && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <strong>Pendiente de timbrar.</strong> Configura tu PAC (Facturama) en Ajustes para habilitar el timbrado automático.
        </div>
      )}

      {/* Datos del CFDI */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Datos del comprobante</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
          {[
            { label: 'Serie / Folio', valor: `${factura.serie}${factura.folio}` },
            { label: 'Fecha emisión', valor: factura.fecha_emision ? new Date(factura.fecha_emision).toLocaleDateString('es-MX') : 'Sin timbrar' },
            { label: 'Método de pago', valor: factura.metodo_pago },
            { label: 'Forma de pago', valor: factura.forma_pago },
            { label: 'Moneda', valor: factura.moneda },
            { label: 'Tipo de cambio', valor: factura.tipo_cambio ? `$${fmt(factura.tipo_cambio)}` : '1.00' },
            { label: 'Uso CFDI', valor: factura.uso_cfdi },
          ].map(({ label, valor }) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-medium font-mono">{valor}</p>
            </div>
          ))}
        </div>
        {factura.folio_fiscal && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400">UUID / Folio fiscal</p>
            <p className="font-mono text-xs text-gray-700 break-all">{factura.folio_fiscal}</p>
          </div>
        )}
      </div>

      {/* Datos del cliente */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-2 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Receptor</h2>
        <p className="font-semibold text-gray-900">{cliente?.razon_social}</p>
        <p className="font-mono text-gray-600">{cliente?.rfc}</p>
        {cliente?.domicilio && <p className="text-gray-500">{cliente.domicilio}</p>}
        {cliente?.regimen_fiscal && <p className="text-gray-500">Régimen: {cliente.regimen_fiscal}</p>}
      </div>

      {/* Conceptos */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conceptos</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Clave SAT</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Cant.</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">V. Unitario</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Importe</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">IVA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {conceptos?.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.clave_prod_serv}</td>
                <td className="px-4 py-3 text-gray-700">{c.descripcion}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{c.cantidad}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">${fmt(c.valor_unitario)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs font-medium">${fmt(c.importe)}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">
                  {c.objeto_impuesto === '02' ? '16%' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="px-5 py-4 border-t border-gray-100 space-y-1 text-sm">
          <div className="flex justify-end gap-16 text-gray-600">
            <span>Subtotal</span>
            <span className="font-mono w-28 text-right">${fmt(factura.subtotal)}</span>
          </div>
          <div className="flex justify-end gap-16 text-gray-600">
            <span>IVA 16%</span>
            <span className="font-mono w-28 text-right">${fmt(factura.iva)}</span>
          </div>
          {factura.descuento && factura.descuento > 0 ? (
            <div className="flex justify-end gap-16 text-gray-600">
              <span>Descuento</span>
              <span className="font-mono w-28 text-right">-${fmt(factura.descuento)}</span>
            </div>
          ) : null}
          <div className="flex justify-end gap-16 font-semibold text-gray-900 text-base border-t border-gray-200 pt-2 mt-2">
            <span>Total</span>
            <span className="font-mono w-28 text-right">${fmt(factura.total)}</span>
          </div>
        </div>
      </div>

      {/* Enlace a referencia */}
      {factura.referencia_id && ref && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Referencia vinculada</p>
            <p className="font-mono font-semibold">{ref.referencia}</p>
          </div>
          <Link
            href={`/referencias/${factura.referencia_id}`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Ver referencia
          </Link>
        </div>
      )}
    </div>
  )
}
