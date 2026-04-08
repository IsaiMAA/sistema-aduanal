'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard',    label: 'Inicio' },
  { href: '/referencias',  label: 'Referencias' },
  { href: '/pedimentos',   label: 'Pedimentos' },
  { href: '/clientes',     label: 'Clientes' },
  { href: '/proveedores',  label: 'Proveedores' },
  { href: '/facturas',     label: 'Facturas CFDI' },
  { href: '/coves',        label: 'COVEs' },
  { href: '/catalogos',    label: 'Catálogos' },
]

interface Props {
  nombre: string
  rol: string
  agencia: string
}

export default function Sidebar({ nombre, rol, agencia }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      {/* Header agencia */}
      <div className="border-b border-gray-200 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Agencia</p>
        <p className="mt-0.5 truncate text-sm font-medium text-gray-900">{agencia || '—'}</p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV.map(({ href, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer usuario */}
      <div className="border-t border-gray-200 px-4 py-3">
        <p className="truncate text-sm font-medium text-gray-900">{nombre}</p>
        <p className="text-xs capitalize text-gray-400">{rol}</p>
        <button
          onClick={handleLogout}
          className="mt-2 w-full rounded-md px-3 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
