import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Facturas CFDI' }

const POR_PAGINA = 25

const ESTADOS = [
  { val: 'borrador',  label: 'Borrador',  color: 'bg-gray-100 text-gray-600' },
  { val: 'timbrada',  label: 'Timbrada',  color: 'bg-green-100 text-green-700' },
  { val: 'cancelada', label: 'Cancelada', color: 'bg-red-100 text-red-600' },
  { val: 'pagada',    label: 'Pagada',    color: 'bg-blue-100 text-blue-700' },
]

function EstadoBadge({ estado }: { estado: string }) {
  const def = ESTADOS.find((e) => e.val === estado)
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${def?.color ?? 'bg-gray-100 text-gray-600'}`}>
      {def?.label ?? estado}
    </span>
  )
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string; estado?: string }>
}) {
  const { q = '', pagina = '1', estado = '' } = await searchParams
  const page = Math.max(1, parseInt(pagina))
  const desde = (page - 1) * POR_PAGINA

  const supabase = await createClient()

  let query = supabase
    .from('facturas_cfdi')
    .select(
      `id, serie, folio, folio_fiscal, fecha_emision, estado,
       subtotal, iva, total, moneda, created_at,
       clientes(razon_social, clave, rfc)`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(desde, desde + POR_PAGINA - 1)

  if (estado) query = query.eq('estado', estado)
  if (q)      query = query.or(`clientes.razon_social.ilike.%${q}%,folio_fiscal.eq.${q}`)

  const { data: facturas, count } = await query
  const total_count = count ?? 0
  const totalPaginas = Math.ceil(total_count / POR_PAGINA)

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Facturas CFDI</h1>
          <p className="text-sm text-gray-500">{total_count} registros</p>
        </div>
        <Link
          href="/facturas/nueva"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nueva factura
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por cliente o folio fiscal…"
            className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input type="hidden" name="estado" value={estado} />
          <button type="submit" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
            Buscar
          </button>
        </form>

        <div className="flex rounded-md border border-gray-200 text-sm overflow-hidden">
          <Link
            href={`?q=${q}&estado=`}
            className={`px-3 py-1.5 ${!estado ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Todas
          </Link>
          {ESTADOS.map(({ val, label }) => (
            <Link
              key={val}
              href={`?q=${q}&estado=${val}`}
              className={`px-3 py-1.5 ${estado === val ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Folio', 'Cliente', 'RFC', 'Fecha', 'Subtotal', 'IVA', 'Total', 'Estado', ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {facturas?.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {facturas?.map((f) => {
              const cliente = f.clientes as unknown as { razon_social: string; clave: string; rfc: string } | null
              return (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">
                    <Link href={`/facturas/${f.id}`} className="hover:text-blue-600">
                      {f.serie}{f.folio}
                    </Link>
                    {f.folio_fiscal && (
                      <span className="block text-gray-400 font-normal">{String(f.folio_fiscal).slice(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="block font-medium">{cliente?.razon_social ?? '—'}</span>
                    <span className="text-xs text-gray-400">{cliente?.clave}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{cliente?.rfc ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {f.fecha_emision
                      ? new Date(f.fecha_emision).toLocaleDateString('es-MX')
                      : new Date(f.created_at).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">${fmt(f.subtotal)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">${fmt(f.iva)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">${fmt(f.total)}</td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={f.estado} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/facturas/${f.id}`} className="text-xs text-blue-600 hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Página {page} de {totalPaginas}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`?q=${q}&estado=${estado}&pagina=${page - 1}`} className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50">
                Anterior
              </Link>
            )}
            {page < totalPaginas && (
              <Link href={`?q=${q}&estado=${estado}&pagina=${page + 1}`} className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50">
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
