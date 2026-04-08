import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, rol, agencia_id, agencias(nombre)')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-full">
      <Sidebar
        nombre={usuario?.nombre ?? user.email ?? ''}
        rol={usuario?.rol ?? ''}
        agencia={(usuario?.agencias as unknown as { nombre: string } | null)?.nombre ?? ''}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
