import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pedimentos' }

const POR_PAGINA = 25

const ESTADOS = [
  { val: 'borrador',  label: 'Borrador',  color: 'bg-gray-100 text-gray-600' },
  { val: 'generado',  label: 'Generado',  color: 'bg-blue-100 text-blue-700' },
  { val: 'enviado',   label: 'Enviado',   color: 'bg-yellow-100 text-yellow-700' },
  { val: 'validado',  label: 'Validado',  color: 'bg-indigo-100 text-indigo-700' },
  { val: 'pagado',    label: 'Pagado',    color: 'bg-orange-100 text-orange-700' },
  { val: 'liberado',  label: 'Liberado',  color: 'bg-green-100 text-green-700' },
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

export default async function PedimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string; estado?: string }>
}) {
  const { q = '', pagina = '1', estado = '' } = await searchParams
  const page = Math.max(1, parseInt(pagina))
  const desde = (page - 1) * POR_PAGINA

  const supabase = await createClient()

  let query = supabase
    .from('pedimentos')
    .select(
      `id, anio, numero_pedimento, estado, tipo_cambio,
       valor_aduana, total_impuestos, total_iva, created_at,
       referencias(referencia, tipo_operacion, clientes(razon_social, clave))`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(desde, desde + POR_PAGINA - 1)

  if (estado) query = query.eq('estado', estado)
  if (q)      query = query.ilike('numero_pedimento', `%${q}%`)

  const { data: pedimentos, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / POR_PAGINA)

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pedimentos</h1>
          <p className="text-sm text-gray-500">{total} registros</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por número de pedimento…"
            className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input type="hidden" name="estado" value={estado} />
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Buscar
          </button>
        </form>

        <div className="flex rounded-md border border-gray-200 text-sm overflow-hidden">
          <Link
            href={`?q=${q}&estado=`}
            className={`px-3 py-1.5 ${!estado ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Todos
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
              {['Pedimento', 'Referencia', 'Cliente', 'T/C', 'Valor Aduana', 'Total IVA', 'Estado', ''].map((h) => (
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
            {pedimentos?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {pedimentos?.map((p) => {
              const ref = p.referencias as unknown as { referencia: string; tipo_operacion: string; clientes: { razon_social: string; clave: string } | null } | null
              const cliente = ref?.clientes
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">
                    <Link href={`/pedimentos/${p.id}`} className="hover:text-blue-600">
                      {p.numero_pedimento ?? <span className="text-gray-400 italic">Sin número</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {ref?.referencia ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="block font-medium">{cliente?.razon_social ?? '—'}</span>
                    <span className="text-xs text-gray-400">{cliente?.clave}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {p.tipo_cambio ? `$${fmt(p.tipo_cambio)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {p.valor_aduana ? `$${fmt(p.valor_aduana)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {p.total_iva ? `$${fmt(p.total_iva)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={p.estado} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/pedimentos/${p.id}`} className="text-xs text-blue-600 hover:underline">
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
              <Link
                href={`?q=${q}&estado=${estado}&pagina=${page - 1}`}
                className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
              >
                Anterior
              </Link>
            )}
            {page < totalPaginas && (
              <Link
                href={`?q=${q}&estado=${estado}&pagina=${page + 1}`}
                className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
