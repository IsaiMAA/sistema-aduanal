'use client'

import { useActionState } from 'react'
import type { ClienteState } from '@/app/(dashboard)/clientes/actions'

const ESTADOS_MX = [
  'AGS','BC','BCS','CAMP','COAH','COL','CHIS','CHIH','CDMX','DGO',
  'GTO','GRO','HGO','JAL','MEX','MICH','MOR','NAY','NL','OAX',
  'PUE','QRO','QROO','SLP','SIN','SON','TAB','TAMPS','TLAX','VER','YUC','ZAC',
]

const REGIMENES = [
  { clave: '601', desc: 'General de Ley Personas Morales' },
  { clave: '603', desc: 'Personas Morales con Fines no Lucrativos' },
  { clave: '606', desc: 'Arrendamiento' },
  { clave: '610', desc: 'Residentes en el Extranjero sin Establecimiento Permanente' },
  { clave: '612', desc: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { clave: '616', desc: 'Sin obligaciones fiscales' },
  { clave: '621', desc: 'Incorporación Fiscal' },
  { clave: '622', desc: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { clave: '625', desc: 'Plataformas Tecnológicas' },
  { clave: '626', desc: 'Régimen Simplificado de Confianza (RESICO)' },
]

const USOS_CFDI = [
  { clave: 'G01', desc: 'Adquisición de mercancias' },
  { clave: 'G02', desc: 'Devoluciones, descuentos o bonificaciones' },
  { clave: 'G03', desc: 'Gastos en general' },
  { clave: 'I01', desc: 'Construcciones' },
  { clave: 'I03', desc: 'Equipo de transporte' },
  { clave: 'I04', desc: 'Equipo de cómputo y accesorios' },
  { clave: 'S01', desc: 'Sin efectos fiscales' },
  { clave: 'P01', desc: 'Por definir' },
]

interface Props {
  action: (prev: ClienteState, formData: FormData) => Promise<ClienteState>
  initialData?: {
    clave?: string
    razon_social?: string
    rfc?: string
    domicilio?: string | null
    ciudad?: string | null
    estado_mx?: string | null
    pais?: string | null
    cp?: string | null
    email?: string | null
    email_cc?: string[] | null
    telefono?: string | null
    regimen_fiscal?: string | null
    uso_cfdi?: string | null
  }
  cancelHref: string
}

export default function ClienteForm({ action, initialData, cancelHref }: Props) {
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Clave *" name="clave" defaultValue={initialData?.clave} error={err.clave}
            placeholder="CLI-001" className="uppercase" />
          <Field label="RFC *" name="rfc" defaultValue={initialData?.rfc} error={err.rfc}
            placeholder="XAXX010101000" className="uppercase" />
          <div />
        </div>
        <Field label="Razón Social *" name="razon_social" defaultValue={initialData?.razon_social}
          error={err.razon_social} placeholder="EMPRESA SA DE CV" className="uppercase" />
      </section>

      {/* Domicilio */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Domicilio</h2>
        <Field label="Domicilio" name="domicilio" defaultValue={initialData?.domicilio ?? ''} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Ciudad" name="ciudad" defaultValue={initialData?.ciudad ?? ''} />
          <SelectField
            label="Estado"
            name="estado_mx"
            defaultValue={initialData?.estado_mx ?? ''}
            options={ESTADOS_MX.map((e) => ({ value: e, label: e }))}
          />
          <Field label="C.P." name="cp" defaultValue={initialData?.cp ?? ''} placeholder="00000" />
        </div>
        <SelectField
          label="País"
          name="pais"
          defaultValue={initialData?.pais ?? 'MEX'}
          options={[{ value: 'MEX', label: 'México' }, { value: 'USA', label: 'Estados Unidos' }]}
        />
      </section>

      {/* Contacto */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Contacto</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" name="email" type="email" defaultValue={initialData?.email ?? ''} />
          <Field label="Teléfono" name="telefono" defaultValue={initialData?.telefono ?? ''} />
        </div>
        <Field
          label="Email CC (separados por coma)"
          name="email_cc"
          defaultValue={initialData?.email_cc?.join(', ') ?? ''}
          placeholder="correo1@empresa.com, correo2@empresa.com"
        />
      </section>

      {/* Fiscal */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Datos fiscales</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Régimen fiscal"
            name="regimen_fiscal"
            defaultValue={initialData?.regimen_fiscal ?? ''}
            options={REGIMENES.map((r) => ({ value: r.clave, label: `${r.clave} – ${r.desc}` }))}
          />
          <SelectField
            label="Uso CFDI"
            name="uso_cfdi"
            defaultValue={initialData?.uso_cfdi ?? 'G03'}
            options={USOS_CFDI.map((u) => ({ value: u.clave, label: `${u.clave} – ${u.desc}` }))}
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
}: {
  label: string
  name: string
  defaultValue?: string
  options: { value: string; label: string }[]
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
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">— Seleccionar —</option>
        {options.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
