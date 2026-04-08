import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import ToggleActivoBtn from './toggle-activo-btn'

export const metadata: Metadata = { title: 'Clientes' }

const POR_PAGINA = 25

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string; filtro?: string }>
}) {
  const { q = '', pagina = '1', filtro = 'activos' } = await searchParams
  const page = Math.max(1, parseInt(pagina))
  const desde = (page - 1) * POR_PAGINA

  const supabase = await createClient()

  let query = supabase
    .from('clientes')
    .select('id, clave, razon_social, rfc, ciudad, estado_mx, email, telefono, activo', {
      count: 'exact',
    })
    .order('razon_social')
    .range(desde, desde + POR_PAGINA - 1)

  if (filtro === 'activos')   query = query.eq('activo', true)
  if (filtro === 'inactivos') query = query.eq('activo', false)

  if (q) {
    query = query.or(`razon_social.ilike.%${q}%,rfc.ilike.%${q}%,clave.ilike.%${q}%`)
  }

  const { data: clientes, count } = await query
  const total = count ?? 0
  const totalPaginas = Math.ceil(total / POR_PAGINA)

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">{total} registros</p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nuevo cliente
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por razón social, RFC o clave…"
            className="w-72 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input type="hidden" name="filtro" value={filtro} />
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Buscar
          </button>
        </form>

        <div className="flex rounded-md border border-gray-200 text-sm overflow-hidden">
          {[
            { val: 'todos',     label: 'Todos' },
            { val: 'activos',   label: 'Activos' },
            { val: 'inactivos', label: 'Inactivos' },
          ].map(({ val, label }) => (
            <Link
              key={val}
              href={`?q=${q}&filtro=${val}`}
              className={`px-3 py-1.5 ${
                filtro === val
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
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
              {['Clave', 'Razón Social', 'RFC', 'Ciudad', 'Teléfono', 'Email', 'Estado', ''].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clientes?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {clientes?.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.clave}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link href={`/clientes/${c.id}`} className="hover:text-blue-600">
                    {c.razon_social}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{c.rfc}</td>
                <td className="px-4 py-3 text-gray-600">
                  {[c.ciudad, c.estado_mx].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{c.telefono || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.activo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver
                    </Link>
                    <ToggleActivoBtn id={c.id} activo={c.activo} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Página {page} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?q=${q}&filtro=${filtro}&pagina=${page - 1}`}
                className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
              >
                Anterior
              </Link>
            )}
            {page < totalPaginas && (
              <Link
                href={`?q=${q}&filtro=${filtro}&pagina=${page + 1}`}
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
