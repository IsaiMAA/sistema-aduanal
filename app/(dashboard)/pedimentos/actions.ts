'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type PedimentoState = {
  error?: string
  errores?: Record<string, string>
} | null

function parsearFormData(formData: FormData) {
  const parse = (key: string) => {
    const v = (formData.get(key) as string | null)?.trim()
    return v ? parseFloat(v) : null
  }

  return {
    referencia_id:    (formData.get('referencia_id') as string).trim(),
    numero_pedimento: (formData.get('numero_pedimento') as string | null)?.trim() || null,
    tipo_cambio:      parse('tipo_cambio'),
    valor_aduana:     parse('valor_aduana'),
    valor_comercial:  parse('valor_comercial'),
    peso_bruto:       parse('peso_bruto'),
    total_impuestos:  parse('total_impuestos') ?? 0,
    total_igi:        parse('total_igi') ?? 0,
    total_dta:        parse('total_dta') ?? 0,
    total_iva:        parse('total_iva') ?? 0,
  }
}

function validar(datos: ReturnType<typeof parsearFormData>): Record<string, string> | null {
  const e: Record<string, string> = {}
  if (!datos.referencia_id) e.referencia_id = 'La referencia es requerida'
  if (datos.tipo_cambio != null && datos.tipo_cambio <= 0)
    e.tipo_cambio = 'El tipo de cambio debe ser mayor a 0'
  return Object.keys(e).length ? e : null
}

export async function crearPedimento(
  _prev: PedimentoState,
  formData: FormData,
): Promise<PedimentoState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const datos = parsearFormData(formData)
  const errores = validar(datos)
  if (errores) return { errores }

  // Obtener agencia_id del usuario
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('agencia_id')
    .eq('id', user.id)
    .single()

  if (!usuario) return { error: 'Usuario sin agencia configurada' }

  // Verificar que no exista ya un pedimento para esta referencia
  const { data: existente } = await supabase
    .from('pedimentos')
    .select('id')
    .eq('referencia_id', datos.referencia_id)
    .maybeSingle()

  if (existente) return { error: 'Esta referencia ya tiene un pedimento asociado' }

  const anio = new Date().getFullYear()

  const { data: pedimento, error } = await supabase
    .from('pedimentos')
    .insert({
      ...datos,
      agencia_id: usuario.agencia_id,
      anio,
    })
    .select('id')
    .single()

  if (error) return { error: `Error al guardar: ${error.message}` }

  revalidatePath('/pedimentos')
  revalidatePath(`/referencias/${datos.referencia_id}`)
  redirect(`/pedimentos/${pedimento.id}`)
}

export async function actualizarPedimento(
  id: string,
  _prev: PedimentoState,
  formData: FormData,
): Promise<PedimentoState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const datos = parsearFormData(formData)
  const errores = validar(datos)
  if (errores) return { errores }

  const { error } = await supabase
    .from('pedimentos')
    .update({
      numero_pedimento: datos.numero_pedimento,
      tipo_cambio:      datos.tipo_cambio,
      valor_aduana:     datos.valor_aduana,
      valor_comercial:  datos.valor_comercial,
      peso_bruto:       datos.peso_bruto,
      total_impuestos:  datos.total_impuestos,
      total_igi:        datos.total_igi,
      total_dta:        datos.total_dta,
      total_iva:        datos.total_iva,
      updated_at:       new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: `Error al actualizar: ${error.message}` }

  revalidatePath('/pedimentos')
  revalidatePath(`/pedimentos/${id}`)
  redirect(`/pedimentos/${id}`)
}

export async function avanzarEstadoPedimento(id: string, estado: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('pedimentos')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/pedimentos')
  revalidatePath(`/pedimentos/${id}`)
}
