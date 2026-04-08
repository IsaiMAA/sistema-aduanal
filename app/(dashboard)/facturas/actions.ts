'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type FacturaState = {
  error?: string
  errores?: Record<string, string>
} | null

// ---------- helpers ----------

function parseNum(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? '0').trim())
  return isNaN(n) ? 0 : n
}

interface Concepto {
  clave_prod_serv: string
  descripcion: string
  cantidad: number
  clave_unidad: string
  valor_unitario: number
  importe: number
  descuento: number
  objeto_impuesto: string
}

function parsearConceptos(formData: FormData): Concepto[] {
  const conceptos: Concepto[] = []
  let i = 0
  while (formData.has(`desc_${i}`)) {
    const desc = String(formData.get(`desc_${i}`) ?? '').trim()
    if (desc) {
      const cantidad = parseNum(formData.get(`cant_${i}`)) || 1
      const vu = parseNum(formData.get(`vu_${i}`))
      conceptos.push({
        clave_prod_serv: String(formData.get(`clave_${i}`) ?? '80141606').trim(),
        descripcion:     desc,
        cantidad,
        clave_unidad:    String(formData.get(`unidad_${i}`) ?? 'E48').trim(),
        valor_unitario:  vu,
        importe:         parseFloat((cantidad * vu).toFixed(2)),
        descuento:       parseNum(formData.get(`desc_imp_${i}`)),
        objeto_impuesto: String(formData.get(`obj_${i}`) ?? '02').trim(),
      })
    }
    i++
  }
  return conceptos
}

function calcularTotales(conceptos: Concepto[]) {
  const subtotal = parseFloat(
    conceptos.reduce((s, c) => s + c.importe - c.descuento, 0).toFixed(2)
  )
  const iva = parseFloat(
    conceptos
      .filter((c) => c.objeto_impuesto === '02')
      .reduce((s, c) => s + (c.importe - c.descuento) * 0.16, 0)
      .toFixed(2)
  )
  const total = parseFloat((subtotal + iva).toFixed(2))
  return { subtotal, iva, total }
}

// ---------- obtener siguiente folio ----------

async function siguienteFolio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agencia_id: string,
  serie: string,
): Promise<number> {
  const { data } = await supabase
    .from('series_factura')
    .select('ultimo_folio')
    .eq('agencia_id', agencia_id)
    .eq('serie', serie)
    .maybeSingle()

  const siguiente = (data?.ultimo_folio ?? 0) + 1

  await supabase
    .from('series_factura')
    .upsert({ agencia_id, serie, ultimo_folio: siguiente })

  return siguiente
}

// ---------- acciones ----------

export async function crearFactura(
  _prev: FacturaState,
  formData: FormData,
): Promise<FacturaState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('agencia_id')
    .eq('id', user.id)
    .single()
  if (!usuario) return { error: 'Usuario sin agencia configurada' }

  const conceptos = parsearConceptos(formData)
  if (conceptos.length === 0) return { error: 'Agrega al menos un concepto' }

  const { subtotal, iva, total } = calcularTotales(conceptos)
  if (total <= 0) return { error: 'El total debe ser mayor a cero' }

  const serie = String(formData.get('serie') ?? 'A').trim().toUpperCase()
  const folio = await siguienteFolio(supabase, usuario.agencia_id, serie)

  const facturaData = {
    agencia_id:   usuario.agencia_id,
    cliente_id:   String(formData.get('cliente_id') ?? '').trim(),
    referencia_id: (formData.get('referencia_id') as string | null)?.trim() || null,
    serie,
    folio,
    metodo_pago:  String(formData.get('metodo_pago') ?? 'PUE').trim(),
    forma_pago:   String(formData.get('forma_pago') ?? '03').trim(),
    uso_cfdi:     String(formData.get('uso_cfdi') ?? 'G03').trim(),
    moneda:       String(formData.get('moneda') ?? 'MXN').trim(),
    tipo_cambio:  parseNum(formData.get('tipo_cambio')) || 1,
    subtotal,
    iva,
    total,
    descuento:    0,
  }

  if (!facturaData.cliente_id) return { errores: { cliente_id: 'Selecciona un cliente' } }

  const { data: factura, error } = await supabase
    .from('facturas_cfdi')
    .insert(facturaData)
    .select('id')
    .single()

  if (error) return { error: `Error al guardar: ${error.message}` }

  const { error: errConceptos } = await supabase
    .from('conceptos_factura')
    .insert(conceptos.map((c) => ({ ...c, factura_id: factura.id })))

  if (errConceptos) return { error: `Error al guardar conceptos: ${errConceptos.message}` }

  revalidatePath('/facturas')
  redirect(`/facturas/${factura.id}`)
}

export async function cancelarFactura(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('facturas_cfdi')
    .update({ estado: 'cancelada', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('estado', 'borrador') // solo borradores se pueden cancelar sin PAC

  revalidatePath('/facturas')
  revalidatePath(`/facturas/${id}`)
}

export async function marcarPagada(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('facturas_cfdi')
    .update({ estado: 'pagada', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('estado', 'timbrada')

  revalidatePath('/facturas')
  revalidatePath(`/facturas/${id}`)
}
