'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ReferenciaState = {
  error?: string
  errores?: Record<string, string>
} | null

function parsearFormData(formData: FormData) {
  const pesoBrutoRaw = (formData.get('peso_bruto') as string | null)?.trim()
  const bultosRaw = (formData.get('bultos') as string | null)?.trim()

  return {
    referencia:      (formData.get('referencia') as string).trim().toUpperCase(),
    cliente_id:      (formData.get('cliente_id') as string).trim(),
    tipo_operacion:  (formData.get('tipo_operacion') as string).trim(),
    clave_documento: (formData.get('clave_documento') as string).trim(),
    aduana:          (formData.get('aduana') as string | null) || null,
    contenedor:      (formData.get('contenedor') as string | null)?.trim() || null,
    peso_bruto:      pesoBrutoRaw ? parseFloat(pesoBrutoRaw) : null,
    bultos:          bultosRaw ? parseInt(bultosRaw) : null,
    observaciones:   (formData.get('observaciones') as string | null)?.trim() || null,
  }
}

function validar(datos: ReturnType<typeof parsearFormData>): Record<string, string> | null {
  const e: Record<string, string> = {}
  if (!datos.referencia)      e.referencia      = 'La referencia es requerida'
  if (!datos.cliente_id)      e.cliente_id      = 'Selecciona un cliente'
  if (!datos.tipo_operacion)  e.tipo_operacion  = 'Selecciona el tipo de operación'
  if (!datos.clave_documento) e.clave_documento = 'Selecciona la clave de documento'
  return Object.keys(e).length ? e : null
}

export async function crearReferencia(
  _prev: ReferenciaState,
  formData: FormData,
): Promise<ReferenciaState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const datos = parsearFormData(formData)
  const errores = validar(datos)
  if (errores) return { errores }

  const { error } = await supabase.from('referencias').insert({
    ...datos,
    capturista_id: user.id,
  })

  if (error) {
    if (error.code === '23505')
      return { error: 'Ya existe una referencia con ese número en el año en curso' }
    return { error: `Error al guardar: ${error.message}` }
  }

  revalidatePath('/referencias')
  redirect('/referencias')
}

export async function actualizarReferencia(
  id: string,
  _prev: ReferenciaState,
  formData: FormData,
): Promise<ReferenciaState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const datos = parsearFormData(formData)
  const errores = validar(datos)
  if (errores) return { errores }

  const { error } = await supabase
    .from('referencias')
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    if (error.code === '23505')
      return { error: 'Ya existe una referencia con ese número en el año en curso' }
    return { error: `Error al actualizar: ${error.message}` }
  }

  revalidatePath('/referencias')
  revalidatePath(`/referencias/${id}`)
  redirect(`/referencias/${id}`)
}

export async function cambiarEstado(id: string, estado: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const extra: Record<string, string> = { updated_at: new Date().toISOString() }
  if (estado === 'despachado') extra.fecha_despacho = new Date().toISOString()

  await supabase
    .from('referencias')
    .update({ estado, ...extra })
    .eq('id', id)

  revalidatePath('/referencias')
  revalidatePath(`/referencias/${id}`)
}
