'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ClienteState = {
  error?: string
  errores?: Record<string, string>
} | null

function parsearFormData(formData: FormData) {
  const emailCcRaw = (formData.get('email_cc') as string | null)?.trim()
  return {
    clave:          (formData.get('clave') as string).trim().toUpperCase(),
    razon_social:   (formData.get('razon_social') as string).trim().toUpperCase(),
    rfc:            (formData.get('rfc') as string).trim().toUpperCase(),
    domicilio:      (formData.get('domicilio') as string | null)?.trim() || null,
    ciudad:         (formData.get('ciudad') as string | null)?.trim() || null,
    estado_mx:      (formData.get('estado_mx') as string | null) || null,
    pais:           (formData.get('pais') as string | null) || 'MEX',
    cp:             (formData.get('cp') as string | null)?.trim() || null,
    email:          (formData.get('email') as string | null)?.trim() || null,
    email_cc:       emailCcRaw
                      ? emailCcRaw.split(',').map((e) => e.trim()).filter(Boolean)
                      : [],
    telefono:       (formData.get('telefono') as string | null)?.trim() || null,
    regimen_fiscal: (formData.get('regimen_fiscal') as string | null) || null,
    uso_cfdi:       (formData.get('uso_cfdi') as string | null) || 'G03',
  }
}

function validar(datos: ReturnType<typeof parsearFormData>): Record<string, string> | null {
  const e: Record<string, string> = {}
  if (!datos.clave)        e.clave        = 'La clave es requerida'
  if (!datos.razon_social) e.razon_social = 'La razón social es requerida'
  if (!datos.rfc)          e.rfc          = 'El RFC es requerido'
  if (datos.rfc && !/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(datos.rfc))
    e.rfc = 'RFC con formato inválido'
  return Object.keys(e).length ? e : null
}

export async function crearCliente(
  _prev: ClienteState,
  formData: FormData,
): Promise<ClienteState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const datos = parsearFormData(formData)
  const errores = validar(datos)
  if (errores) return { errores }

  const { error } = await supabase.from('clientes').insert(datos)
  if (error) {
    if (error.code === '23505')
      return { error: 'Ya existe un cliente con esa clave o RFC' }
    return { error: 'Error al guardar el cliente' }
  }

  revalidatePath('/clientes')
  redirect('/clientes')
}

export async function actualizarCliente(
  id: string,
  _prev: ClienteState,
  formData: FormData,
): Promise<ClienteState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const datos = parsearFormData(formData)
  const errores = validar(datos)
  if (errores) return { errores }

  const { error } = await supabase
    .from('clientes')
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    if (error.code === '23505')
      return { error: 'Ya existe un cliente con esa clave o RFC' }
    return { error: 'Error al actualizar el cliente' }
  }

  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
  redirect(`/clientes/${id}`)
}

export async function toggleActivo(id: string, activo: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('clientes')
    .update({ activo: !activo, updated_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
}
