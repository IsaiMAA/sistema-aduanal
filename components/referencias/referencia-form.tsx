'use client'

import { useActionState } from 'react'
import type { ReferenciaState } from '@/app/(dashboard)/referencias/actions'

interface Catalogo { clave: string; descripcion?: string; nombre?: string }
interface Cliente { id: string; clave: string; razon_social: string }

interface Props {
  action: (prev: ReferenciaState, formData: FormData) => Promise<ReferenciaState>
  clientes: Cliente[]
  claves_documento: Catalogo[]
  aduanas: Catalogo[]
  initialData?: {
    referencia?: string
    cliente_id?: string
    tipo_operacion?: string
    clave_documento?: string
    aduana?: string | null
    contenedor?: string | null
    peso_bruto?: number | null
    bultos?: number | null
    observaciones?: string | null
  }
  cancelHref: string
}

export default function ReferenciaForm({
  action,
  clientes,
  claves_documento,
  aduanas,
  initialData,
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

      {/* Identificación */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Identificación</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Número de referencia *"
            name="referencia"
            defaultValue={initialData?.referencia}
            error={err.referencia}
            placeholder="REF-2026-001"
            className="uppercase"
          />
          <SelectCliente
            clientes={clientes}
            defaultValue={initialData?.cliente_id}
            error={err.cliente_id}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Tipo de operación *"
            name="tipo_operacion"
            defaultValue={initialData?.tipo_operacion ?? ''}
            error={err.tipo_operacion}
            options={[
              { value: 'importacion', label: 'Importación' },
              { value: 'exportacion', label: 'Exportación' },
            ]}
          />
          <SelectField
            label="Clave de documento *"
            name="clave_documento"
            defaultValue={initialData?.clave_documento ?? ''}
            error={err.clave_documento}
            options={claves_documento.map((c) => ({
              value: c.clave,
              label: `${c.clave} — ${c.descripcion ?? ''}`,
            }))}
          />
        </div>
        <SelectField
          label="Aduana"
          name="aduana"
          defaultValue={initialData?.aduana ?? ''}
          options={aduanas.map((a) => ({
            value: a.clave,
            label: `${a.clave} — ${a.nombre ?? a.descripcion ?? ''}`,
          }))}
        />
      </section>

      {/* Datos de carga */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Datos de carga</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="Contenedor / BL"
            name="contenedor"
            defaultValue={initialData?.contenedor ?? ''}
            placeholder="MSCU1234567"
            className="uppercase"
          />
          <Field
            label="Peso bruto (kg)"
            name="peso_bruto"
            type="number"
            defaultValue={initialData?.peso_bruto?.toString() ?? ''}
            placeholder="0.000"
          />
          <Field
            label="Bultos"
            name="bultos"
            type="number"
            defaultValue={initialData?.bultos?.toString() ?? ''}
            placeholder="0"
          />
        </div>
        <div>
          <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones
          </label>
          <textarea
            id="observaciones"
            name="observaciones"
            rows={3}
            defaultValue={initialData?.observaciones ?? ''}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
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
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

function SelectCliente({
  clientes,
  defaultValue,
  error,
}: {
  clientes: Cliente[]
  defaultValue?: string
  error?: string
}) {
  return (
    <div>
      <label htmlFor="cliente_id" className="block text-sm font-medium text-gray-700 mb-1">
        Cliente *
      </label>
      <select
        id="cliente_id"
        name="cliente_id"
        defaultValue={defaultValue ?? ''}
        className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        }`}
      >
        <option value="">— Seleccionar cliente —</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.clave} — {c.razon_social}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue = '',
  error,
  type = 'text',
  placeholder,
  className = '',
}: {
  label: string
  name: string
  defaultValue?: string
  error?: string
  type?: string
  placeholder?: string
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
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={type === 'number' ? 'any' : undefined}
        className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
          error ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : 'border-gray-300 focus:border-blue-500'
        } ${className}`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function SelectField({
  label,
  name,
  defaultValue = '',
  options,
  error,
}: {
  label: string
  name: string
  defaultValue?: string
  options: { value: string; label: string }[]
  error?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        }`}
      >
        <option value="">— Seleccionar —</option>
        {options.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
