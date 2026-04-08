import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

  const [
    { count: refsMes },
    { count: refsCaptura },
    { count: pedPendientes },
    { count: facturasPendientes },
  ] = await Promise.all([
    supabase
      .from('referencias')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_alta', inicioMes),
    supabase
      .from('referencias')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'captura'),
    supabase
      .from('pedimentos')
      .select('*', { count: 'exact', head: true })
      .in('estado', ['borrador', 'generado']),
    supabase
      .from('facturas_cfdi')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'borrador'),
  ])

  const tarjetas = [
    { label: 'Referencias este mes',    valor: refsMes ?? 0,           color: 'blue' },
    { label: 'Referencias en captura',  valor: refsCaptura ?? 0,       color: 'yellow' },
    { label: 'Pedimentos pendientes',   valor: pedPendientes ?? 0,     color: 'orange' },
    { label: 'Facturas por timbrar',    valor: facturasPendientes ?? 0, color: 'purple' },
  ]

  const colores: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Resumen</h1>
        <p className="text-sm text-gray-500">
          {hoy.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tarjetas.map(({ label, valor, color }) => (
          <div
            key={label}
            className={`rounded-lg border p-4 ${colores[color]}`}
          >
            <p className="text-3xl font-bold">{valor}</p>
            <p className="mt-1 text-sm">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { href: '/referencias/nueva', label: 'Nueva referencia' },
            { href: '/clientes/nuevo',    label: 'Nuevo cliente' },
            { href: '/facturas/nueva',    label: 'Nueva factura' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="flex items-center justify-center rounded-md border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
