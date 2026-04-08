import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Referencias' }

const POR_PAGINA = 25

const ESTADOS = [
  { val: 'captura',    label: 'Captura',    color: 'bg-gray-100 text-gray-600' },
  { val: 'validado',   label: 'Validado',   color: 'bg-blue-100 text-blue-700' },
  { val: 'firmado',    label: 'Firmado',    color: 'bg-yellow-100 text-yellow-700' },
  { val: 'despachado', label: 'Despachado', color: 'bg-green-100 text-green-700' },
  { val: 'cancelado',  label: 'Cancelado',  color: 'bg-red-100 text-red-600' },
]

function EstadoBadge({ estado }: { estado: string }) {
  const def = ESTADOS.find((e) => e.val === estado)
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${def?.color ?? 'bg-gray-100 text-gray-600'}`}>
      {def?.label ?? estado}
    </span>
  )
}

export default async function ReferenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string; estado?: string; tipo?: string }>
}) {
  const { q = '', pagina = '1', estado = '', tipo = '' } = await searchParams
  const page = Math.max(1, parseInt(pagina))
  const desde = (page - 1) * POR_PAGINA

  const supabase = await createClient()

  let query = supabase
    .from('referencias')
    .select(
      `id, referencia, tipo_operacion, estado, aduana, fecha_alta,
       clientes(razon_social, clave),
       cat_claves_documento(clave, descripcion)`,
      { count: 'exact' },
    )
    .order('fecha_alta', { ascending: false })
    .range(desde, desde + POR_PAGINA - 1)

  if (estado) query = query.eq('estado', estado)
  if (tipo)   query = query.eq('tipo_operacion', tipo)
  if (q)      query = query.ilike('referencia', `%${q}%`)

  const { data: referencias, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / POR_PAGINA)

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Referencias</h1>
          <p className="text-sm text-gray-500">{total} registros</p>
        </div>
        <Link
          href="/referencias/nueva"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nueva referencia
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por referencia…"
            className="w-56 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input type="hidden" name="estado" value={estado} />
          <input type="hidden" name="tipo" value={tipo} />
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Buscar
          </button>
        </form>

        {/* Filtro por tipo */}
        <div className="flex rounded-md border border-gray-200 text-sm overflow-hidden">
          {[
            { val: '',             label: 'Todos' },
            { val: 'importacion',  label: 'Importación' },
            { val: 'exportacion',  label: 'Exportación' },
          ].map(({ val, label }) => (
            <Link
              key={val}
              href={`?q=${q}&estado=${estado}&tipo=${val}`}
              className={`px-3 py-1.5 ${tipo === val ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Filtro por estado */}
        <div className="flex rounded-md border border-gray-200 text-sm overflow-hidden">
          <Link
            href={`?q=${q}&tipo=${tipo}&estado=`}
            className={`px-3 py-1.5 ${!estado ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Todos
          </Link>
          {ESTADOS.map(({ val, label }) => (
            <Link
              key={val}
              href={`?q=${q}&tipo=${tipo}&estado=${val}`}
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
              {['Referencia', 'Cliente', 'Tipo', 'Doc.', 'Aduana', 'Fecha Alta', 'Estado', ''].map((h) => (
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
            {referencias?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {referencias?.map((r) => {
              const cliente = r.clientes as unknown as { razon_social: string; clave: string } | null
              const doc = r.cat_claves_documento as unknown as { clave: string; descripcion: string } | null
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">
                    <Link href={`/referencias/${r.id}`} className="hover:text-blue-600">
                      {r.referencia}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="block font-medium">{cliente?.razon_social ?? '—'}</span>
                    <span className="text-xs text-gray-400">{cliente?.clave}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.tipo_operacion}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600" title={doc?.descripcion ?? ''}>
                    {doc?.clave ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.aduana ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(r.fecha_alta).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={r.estado} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/referencias/${r.id}`} className="text-xs text-blue-600 hover:underline">
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
                href={`?q=${q}&estado=${estado}&tipo=${tipo}&pagina=${page - 1}`}
                className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
              >
                Anterior
              </Link>
            )}
            {page < totalPaginas && (
              <Link
                href={`?q=${q}&estado=${estado}&tipo=${tipo}&pagina=${page + 1}`}
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
