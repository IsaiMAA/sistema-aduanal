'use client'

import { useActionState, useState, useCallback } from 'react'
import type { FacturaState } from '@/app/(dashboard)/facturas/actions'

interface Cliente { id: string; clave: string; razon_social: string; rfc: string; uso_cfdi: string | null }
interface Referencia { id: string; referencia: string }

interface ConceptoRow {
  key: number
  clave_prod_serv: string
  descripcion: string
  cantidad: string
  clave_unidad: string
  valor_unitario: string
  objeto_impuesto: string
}

const CONCEPTOS_PRESET = [
  { label: 'Honorarios aduanales', clave: '80141606', unidad: 'E48' },
  { label: 'Gastos de despacho',   clave: '80141606', unidad: 'E48' },
  { label: 'Prevalidación',        clave: '80141606', unidad: 'E48' },
  { label: 'Maniobras',            clave: '78101803', unidad: 'E48' },
  { label: 'Gestión VUCEM/COVE',   clave: '80141606', unidad: 'E48' },
]

const METODOS_PAGO = [
  { val: 'PUE', label: 'PUE – Pago en una sola exhibición' },
  { val: 'PPD', label: 'PPD – Pago en parcialidades o diferido' },
]

const FORMAS_PAGO = [
  { val: '01', label: '01 – Efectivo' },
  { val: '02', label: '02 – Cheque nominativo' },
  { val: '03', label: '03 – Transferencia electrónica' },
  { val: '04', label: '04 – Tarjeta de crédito' },
  { val: '28', label: '28 – Tarjeta de débito' },
  { val: '99', label: '99 – Por definir' },
]

const USOS_CFDI = [
  { val: 'G01', label: 'G01 – Adquisición de mercancias' },
  { val: 'G03', label: 'G03 – Gastos en general' },
  { val: 'S01', label: 'S01 – Sin efectos fiscales' },
  { val: 'P01', label: 'P01 – Por definir' },
]

let keySeq = 1

function nuevoConcepto(preset?: typeof CONCEPTOS_PRESET[0]): ConceptoRow {
  return {
    key:             keySeq++,
    clave_prod_serv: preset?.clave ?? '80141606',
    descripcion:     preset?.label ?? '',
    cantidad:        '1',
    clave_unidad:    preset?.unidad ?? 'E48',
    valor_unitario:  '',
    objeto_impuesto: '02',
  }
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  action: (prev: FacturaState, formData: FormData) => Promise<FacturaState>
  clientes: Cliente[]
  referencias?: Referencia[]
  referenciaFija?: { id: string; referencia: string }
  clienteFijo?: { id: string; razon_social: string; rfc: string }
  cancelHref: string
}

export default function FacturaForm({
  action,
  clientes,
  referencias,
  referenciaFija,
  clienteFijo,
  cancelHref,
}: Props) {
  const [state, formAction, pending] = useActionState(action, null)
  const [conceptos, setConceptos] = useState<ConceptoRow[]>([nuevoConcepto(CONCEPTOS_PRESET[0])])
  const [clienteSelId, setClienteSelId] = useState(clienteFijo?.id ?? '')

  const err = (state as { errores?: Record<string, string> } | null)?.errores ?? {}
  const errorGeneral = (state as { error?: string } | null)?.error

  const clienteSel = clientes.find((c) => c.id === clienteSelId)

  const agregar = useCallback((preset?: typeof CONCEPTOS_PRESET[0]) => {
    setConceptos((prev) => [...prev, nuevoConcepto(preset)])
  }, [])

  const quitar = useCallback((key: number) => {
    setConceptos((prev) => prev.filter((c) => c.key !== key))
  }, [])

  const actualizar = useCallback((key: number, campo: keyof ConceptoRow, valor: string) => {
    setConceptos((prev) =>
      prev.map((c) => (c.key === key ? { ...c, [campo]: valor } : c))
    )
  }, [])

  // Calcular totales en tiempo real
  const subtotal = conceptos.reduce((s, c) => {
    const importe = (parseFloat(c.cantidad) || 0) * (parseFloat(c.valor_unitario) || 0)
    return s + importe
  }, 0)
  const iva = conceptos
    .filter((c) => c.objeto_impuesto === '02')
    .reduce((s, c) => {
      const importe = (parseFloat(c.cantidad) || 0) * (parseFloat(c.valor_unitario) || 0)
      return s + importe * 0.16
    }, 0)
  const total = subtotal + iva

  return (
    <form action={formAction} className="space-y-6">
      {errorGeneral && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorGeneral}
        </div>
      )}

      {/* Cliente y referencia */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Cliente y referencia</h2>

        {clienteFijo ? (
          <>
            <input type="hidden" name="cliente_id" value={clienteFijo.id} />
            <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              <span className="font-semibold">{clienteFijo.razon_social}</span>
              <span className="ml-2 font-mono text-xs">{clienteFijo.rfc}</span>
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="cliente_id" className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <select
              id="cliente_id"
              name="cliente_id"
              value={clienteSelId}
              onChange={(e) => setClienteSelId(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                err.cliente_id ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            >
              <option value="">— Seleccionar cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clave} — {c.razon_social} ({c.rfc})
                </option>
              ))}
            </select>
            {err.cliente_id && <p className="mt-1 text-xs text-red-600">{err.cliente_id}</p>}
          </div>
        )}

        {referenciaFija ? (
          <>
            <input type="hidden" name="referencia_id" value={referenciaFija.id} />
            <div className="text-sm text-gray-500">
              Referencia vinculada: <span className="font-mono font-semibold">{referenciaFija.referencia}</span>
            </div>
          </>
        ) : referencias && referencias.length > 0 ? (
          <div>
            <label htmlFor="referencia_id" className="block text-sm font-medium text-gray-700 mb-1">
              Referencia (opcional)
            </label>
            <select
              id="referencia_id"
              name="referencia_id"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Sin referencia —</option>
              {referencias.map((r) => (
                <option key={r.id} value={r.id}>{r.referencia}</option>
              ))}
            </select>
          </div>
        ) : null}
      </section>

      {/* Datos fiscales de la factura */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Datos fiscales</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="serie" className="block text-sm font-medium text-gray-700 mb-1">Serie</label>
            <input
              id="serie"
              name="serie"
              defaultValue="A"
              maxLength={10}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="moneda" className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
            <select id="moneda" name="moneda" defaultValue="MXN" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label htmlFor="tipo_cambio" className="block text-sm font-medium text-gray-700 mb-1">T/C</label>
            <input
              id="tipo_cambio"
              name="tipo_cambio"
              type="number"
              step="0.0001"
              defaultValue="1"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="uso_cfdi" className="block text-sm font-medium text-gray-700 mb-1">Uso CFDI</label>
            <select
              id="uso_cfdi"
              name="uso_cfdi"
              defaultValue={clienteSel?.uso_cfdi ?? 'G03'}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {USOS_CFDI.map(({ val, label }) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="metodo_pago" className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
            <select id="metodo_pago" name="metodo_pago" defaultValue="PUE" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              {METODOS_PAGO.map(({ val, label }) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="forma_pago" className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
            <select id="forma_pago" name="forma_pago" defaultValue="03" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              {FORMAS_PAGO.map(({ val, label }) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Conceptos */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Conceptos</h2>
          <div className="flex gap-2">
            {CONCEPTOS_PRESET.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => agregar(p)}
                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                + {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="pb-2 text-left font-medium w-32">Clave SAT</th>
                <th className="pb-2 text-left font-medium">Descripción</th>
                <th className="pb-2 text-right font-medium w-20">Cant.</th>
                <th className="pb-2 text-left font-medium w-20">Unidad</th>
                <th className="pb-2 text-right font-medium w-28">V. Unitario</th>
                <th className="pb-2 text-right font-medium w-28">Importe</th>
                <th className="pb-2 text-center font-medium w-16">IVA</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conceptos.map((c, idx) => {
                const importe = (parseFloat(c.cantidad) || 0) * (parseFloat(c.valor_unitario) || 0)
                return (
                  <tr key={c.key}>
                    <td className="py-2 pr-2">
                      <input
                        name={`clave_${idx}`}
                        value={c.clave_prod_serv}
                        onChange={(e) => actualizar(c.key, 'clave_prod_serv', e.target.value)}
                        placeholder="80141606"
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        name={`desc_${idx}`}
                        value={c.descripcion}
                        onChange={(e) => actualizar(c.key, 'descripcion', e.target.value)}
                        placeholder="Descripción del servicio"
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        name={`cant_${idx}`}
                        type="number"
                        value={c.cantidad}
                        onChange={(e) => actualizar(c.key, 'cantidad', e.target.value)}
                        step="any"
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-right font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        name={`unidad_${idx}`}
                        value={c.clave_unidad}
                        onChange={(e) => actualizar(c.key, 'clave_unidad', e.target.value)}
                        placeholder="E48"
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        name={`vu_${idx}`}
                        type="number"
                        value={c.valor_unitario}
                        onChange={(e) => actualizar(c.key, 'valor_unitario', e.target.value)}
                        step="any"
                        placeholder="0.00"
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-right font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2 text-right font-mono text-xs text-gray-700">
                      ${fmt(importe)}
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <select
                        name={`obj_${idx}`}
                        value={c.objeto_impuesto}
                        onChange={(e) => actualizar(c.key, 'objeto_impuesto', e.target.value)}
                        className="rounded border border-gray-200 px-1 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      >
                        <option value="02">16%</option>
                        <option value="01">0%</option>
                      </select>
                    </td>
                    <td className="py-2">
                      {conceptos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => quitar(c.key)}
                          className="text-gray-300 hover:text-red-500"
                          title="Eliminar concepto"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => agregar()}
          className="text-sm text-blue-600 hover:underline"
        >
          + Agregar concepto
        </button>

        {/* Totales */}
        <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-mono">${fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>IVA 16%</span>
            <span className="font-mono">${fmt(iva)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 text-base border-t border-gray-200 pt-2 mt-2">
            <span>Total</span>
            <span className="font-mono">${fmt(total)}</span>
          </div>
        </div>
      </section>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-3">
        <a
          href={cancelHref}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Guardando…' : 'Guardar borrador'}
        </button>
      </div>
    </form>
  )
}
