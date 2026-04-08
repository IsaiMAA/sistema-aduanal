'use client'

import { useActionState } from 'react'
import type { PedimentoState } from '@/app/(dashboard)/pedimentos/actions'

interface Referencia {
  id: string
  referencia: string
  clientes: { razon_social: string; clave: string } | null
}

interface Props {
  action: (prev: PedimentoState, formData: FormData) => Promise<PedimentoState>
  referencias?: Referencia[]
  initialData?: {
    referencia_id?: string
    numero_pedimento?: string | null
    tipo_cambio?: number | null
    valor_aduana?: number | null
    valor_comercial?: number | null
    peso_bruto?: number | null
    total_impuestos?: number | null
    total_igi?: number | null
    total_dta?: number | null
    total_iva?: number | null
  }
  referenciaFija?: { id: string; referencia: string; cliente: string }
  cancelHref: string
}

export default function PedimentoForm({
  action,
  referencias,
  initialData,
  referenciaFija,
  cancelHref,
}: Props) {
  const [state, formAction, pending] = useActionState(action, null)

  const err = (state as { errores?: Record<string, string> } | null)?.errores ?? {}
  const errorGeneral = (state as { error?: string } | null)?.error

  return (
    <form action={formAction} className="space-y-6">
      {errorGeneral && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorGeneral}
        </div>
      )}

      {/* Referencia */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Referencia y número de pedimento</h2>

        {referenciaFija ? (
          <>
            <input type="hidden" name="referencia_id" value={referenciaFija.id} />
            <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              <span className="font-mono font-semibold">{referenciaFija.referencia}</span>
              {' — '}{referenciaFija.cliente}
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="referencia_id" className="block text-sm font-medium text-gray-700 mb-1">
              Referencia *
            </label>
            <select
              id="referencia_id"
              name="referencia_id"
              defaultValue={initialData?.referencia_id ?? ''}
              className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                err.referencia_id
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            >
              <option value="">— Seleccionar referencia —</option>
              {referencias?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.referencia} — {r.clientes?.razon_social ?? ''}
                </option>
              ))}
            </select>
            {err.referencia_id && <p className="mt-1 text-xs text-red-600">{err.referencia_id}</p>}
          </div>
        )}

        <NumField
          label="Número de pedimento"
          name="numero_pedimento"
          defaultValue={initialData?.numero_pedimento ?? ''}
          placeholder="26  730  4000000"
          className="font-mono uppercase"
        />
      </section>

      {/* Valores */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Valores en aduana</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumField
            label="Tipo de cambio (MXN/USD)"
            name="tipo_cambio"
            defaultValue={initialData?.tipo_cambio?.toString() ?? ''}
            placeholder="17.5000"
            error={err.tipo_cambio}
            step="0.0001"
          />
          <NumField
            label="Valor en aduana (USD)"
            name="valor_aduana"
            defaultValue={initialData?.valor_aduana?.toString() ?? ''}
            placeholder="10000.00"
          />
          <NumField
            label="Valor comercial (USD)"
            name="valor_comercial"
            defaultValue={initialData?.valor_comercial?.toString() ?? ''}
            placeholder="10000.00"
          />
        </div>
        <NumField
          label="Peso bruto total (kg)"
          name="peso_bruto"
          defaultValue={initialData?.peso_bruto?.toString() ?? ''}
          placeholder="0.000"
        />
      </section>

      {/* Impuestos */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Impuestos (MXN)</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumField
            label="IGI"
            name="total_igi"
            defaultValue={initialData?.total_igi?.toString() ?? '0'}
            placeholder="0.00"
          />
          <NumField
            label="DTA"
            name="total_dta"
            defaultValue={initialData?.total_dta?.toString() ?? '0'}
            placeholder="0.00"
          />
          <NumField
            label="IVA"
            name="total_iva"
            defaultValue={initialData?.total_iva?.toString() ?? '0'}
            placeholder="0.00"
          />
          <NumField
            label="Total impuestos"
            name="total_impuestos"
            defaultValue={initialData?.total_impuestos?.toString() ?? '0'}
            placeholder="0.00"
          />
        </div>
        <p className="text-xs text-gray-400">
          El total de impuestos debe incluir IGI + DTA + IVA + cualquier otro cargo (IEPS, cuotas compensatorias, etc.)
        </p>
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
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

function NumField({
  label,
  name,
  defaultValue = '',
  error,
  placeholder,
  step = 'any',
  className = '',
}: {
  label: string
  name: string
  defaultValue?: string
  error?: string
  placeholder?: string
  step?: string
  className?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={name === 'numero_pedimento' ? 'text' : 'number'}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={step}
        className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:border-blue-500'
        } ${className}`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
