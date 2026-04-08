import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './login-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Iniciar sesión' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) redirect((await searchParams).next ?? '/dashboard')

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sistema Aduanal</h1>
          <p className="mt-1 text-sm text-gray-500">Ingresa tus credenciales</p>
        </div>
        <LoginForm next={(await searchParams).next} />
      </div>
    </div>
  )
}
