-- SCHEMA SUPABASE v2 — Sistema Aduanal
-- Optimizado para 500+ pedimentos/mes

-- EXTENSIONES
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "btree_gist";

-- AGENCIAS
create table agencias (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  rfc             text not null unique,
  patente         text not null,
  aduana_principal text not null,
  logo_url        text,
  plan            text not null default 'basico' check (plan in ('basico','profesional','enterprise')),
  activa          boolean not null default true,
  created_at      timestamptz not null default now(),
  regimen_fiscal  text,
  uso_cfdi        text default 'G03'
);

-- USUARIOS
create table usuarios (
  id              uuid primary key references auth.users(id) on delete cascade,
  agencia_id      uuid not null references agencias(id),
  nombre          text not null,
  rol             text not null check (rol in ('admin','supervisor','capturista','visor','contador')),
  activo          boolean not null default true,
  ultimo_acceso   timestamptz,
  created_at      timestamptz not null default now()
);
create index on usuarios(id) include (agencia_id, rol);

-- HELPER RLS
create or replace function get_agencia_id()
returns uuid language sql stable security definer as $$
  select agencia_id from usuarios where id = auth.uid()
$$;

create or replace function get_rol()
returns text language sql stable security definer as $$
  select rol from usuarios where id = auth.uid()
$$;

-- CATÁLOGOS SAT
create table cat_aduanas (
  clave text primary key,
  nombre text not null,
  estado text,
  region text
);

create table cat_claves_documento (
  clave text primary key,
  descripcion text not null,
  tipo text check (tipo in ('importacion','exportacion','trasbordo','deposito')),
  requiere_cove boolean default true,
  activa boolean default true
);

create table cat_paises (
  clave text primary key,
  nombre text not null,
  con_embargo boolean default false
);

create table cat_monedas (
  clave text primary key,
  nombre text not null,
  pais_clave text references cat_paises(clave)
);

create table cat_fracciones_arancelarias (
  fraccion text primary key,
  descripcion text,
  umc text,
  regulaciones text[],
  activa boolean default true,
  vigencia_desde date,
  vigencia_hasta date
);
create index on cat_fracciones_arancelarias using gin (descripcion gin_trgm_ops);
create index on cat_fracciones_arancelarias using gin (fraccion gin_trgm_ops);

create table cat_contribuciones (
  clave text primary key,
  descripcion text not null,
  tipo text
);

-- TIPO DE CAMBIO
create table tipos_cambio (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  moneda text not null references cat_monedas(clave),
  valor numeric(14,6) not null,
  fuente text default 'banxico',
  precargado boolean default false,
  created_at timestamptz default now(),
  unique (fecha, moneda)
);
create index on tipos_cambio(fecha desc, moneda) include (valor);

-- CLIENTES
create table clientes (
  id              uuid primary key default gen_random_uuid(),
  agencia_id      uuid not null references agencias(id),
  clave           text not null,
  razon_social    text not null,
  rfc             text not null,
  domicilio       text,
  ciudad          text,
  estado_mx       text,
  pais            text default 'MEX' references cat_paises(clave),
  cp              text,
  email           text,
  email_cc        text[],
  telefono        text,
  regimen_fiscal  text,
  uso_cfdi        text default 'G03',
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (agencia_id, clave),
  unique (agencia_id, rfc)
);
create index on clientes(agencia_id, activo) include (clave, razon_social, rfc);
create index on clientes using gin (razon_social gin_trgm_ops);
create index on clientes using gin (rfc gin_trgm_ops);

-- PROVEEDORES
create table proveedores (
  id              uuid primary key default gen_random_uuid(),
  agencia_id      uuid not null references agencias(id),
  nombre          text not null,
  tax_id          text,
  pais            text references cat_paises(clave),
  domicilio       text,
  activo          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index on proveedores(agencia_id, activo) include (nombre, tax_id);

-- TRIGGER: poblar anio en referencias automáticamente
create or replace function fn_set_anio_referencias()
returns trigger language plpgsql as $$
begin
  new.anio := extract(year from new.fecha_alta at time zone 'UTC')::integer;
  return new;
end;
$$;

-- REFERENCIAS (particionada por año)
create table referencias (
  id              uuid not null default gen_random_uuid(),
  agencia_id      uuid not null references agencias(id),
  cliente_id      uuid not null references clientes(id),
  referencia      text not null,
  anio            integer not null,
  tipo_operacion  text not null check (tipo_operacion in ('importacion','exportacion')),
  clave_documento text not null references cat_claves_documento(clave),
  aduana          text references cat_aduanas(clave),
  estado          text not null default 'captura' check (estado in ('captura','validado','firmado','despachado','cancelado')),
  contenedor      text,
  peso_bruto      numeric(14,3),
  bultos          integer,
  capturista_id   uuid references usuarios(id),
  fecha_alta      timestamptz not null default now(),
  fecha_pago      date,
  fecha_despacho  timestamptz,
  observaciones   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (id, anio),
  unique (agencia_id, referencia, anio)
) partition by range (anio);

create trigger trg_set_anio_referencias
  before insert on referencias
  for each row execute function fn_set_anio_referencias();

create table referencias_2024 partition of referencias for values from (2024) to (2025);
create table referencias_2025 partition of referencias for values from (2025) to (2026);
create table referencias_2026 partition of referencias for values from (2026) to (2027);
create table referencias_futuro partition of referencias default;

create index on referencias(agencia_id, estado, fecha_alta desc);
create index on referencias(agencia_id, cliente_id, estado);
create index on referencias(agencia_id, referencia);
create index on referencias using gin (referencia gin_trgm_ops);

-- PEDIMENTOS (particionada por año)
create table pedimentos (
  id                  uuid not null default gen_random_uuid(),
  referencia_id       uuid not null,
  agencia_id          uuid not null references agencias(id),
  anio                integer not null,
  numero_pedimento    text,
  tipo_cambio         numeric(10,4),
  valor_aduana        numeric(14,2),
  valor_comercial     numeric(14,2),
  peso_bruto          numeric(14,3),
  total_impuestos     numeric(14,2) default 0,
  total_igi           numeric(14,2) default 0,
  total_dta           numeric(14,2) default 0,
  total_iva           numeric(14,2) default 0,
  archivo_m3_url      text,
  estado              text not null default 'borrador' check (estado in ('borrador','generado','enviado','validado','pagado','liberado')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (id, anio)
) partition by range (anio);

create table pedimentos_2024 partition of pedimentos for values from (2024) to (2025);
create table pedimentos_2025 partition of pedimentos for values from (2025) to (2026);
create table pedimentos_2026 partition of pedimentos for values from (2026) to (2027);
create table pedimentos_futuro partition of pedimentos default;

create index on pedimentos(agencia_id, anio, estado) include (total_impuestos, total_iva);
create index on pedimentos(referencia_id, anio);

-- FACTURAS CFDI
create table facturas_cfdi (
  id              uuid primary key default gen_random_uuid(),
  agencia_id      uuid not null references agencias(id),
  cliente_id      uuid not null references clientes(id),
  referencia_id   uuid,
  serie           text default 'A',
  folio           integer,
  folio_fiscal    uuid unique,
  fecha_emision   timestamptz,
  metodo_pago     text default 'PUE',
  forma_pago      text default '03',
  uso_cfdi        text default 'G03',
  subtotal        numeric(14,2) not null,
  descuento       numeric(14,2) default 0,
  iva             numeric(14,2) default 0,
  total           numeric(14,2) not null,
  moneda          text default 'MXN',
  tipo_cambio     numeric(10,4) default 1,
  estado          text not null default 'borrador' check (estado in ('borrador','timbrada','cancelada','pagada')),
  xml_cfdi_url    text,
  pdf_url         text,
  pac_response    jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on facturas_cfdi(agencia_id, estado, fecha_emision desc);
create index on facturas_cfdi(agencia_id, cliente_id, estado);
create index on facturas_cfdi(referencia_id);

-- CONCEPTOS FACTURA
create table conceptos_factura (
  id              uuid primary key default gen_random_uuid(),
  factura_id      uuid not null references facturas_cfdi(id) on delete cascade,
  clave_prod_serv text not null,
  descripcion     text not null,
  cantidad        numeric(10,3) default 1,
  clave_unidad    text default 'E48',
  valor_unitario  numeric(14,4) not null,
  importe         numeric(14,2) not null,
  descuento       numeric(14,2) default 0,
  objeto_impuesto text default '02'
);
create index on conceptos_factura(factura_id);

-- SERIES FACTURA
create table series_factura (
  agencia_id  uuid not null references agencias(id),
  serie       text not null,
  ultimo_folio integer not null default 0,
  primary key (agencia_id, serie)
);

-- CERTIFICADOS
create table certificados (
  id              uuid primary key default gen_random_uuid(),
  agencia_id      uuid not null references agencias(id),
  tipo            text not null check (tipo in ('efirma','csd')),
  rfc             text not null,
  no_certificado  text,
  cer_base64      text,
  cer_path        text,
  key_path        text,
  vencimiento     date,
  activo          boolean default true,
  created_at      timestamptz default now()
);

-- COVES
create table coves (
  id              uuid primary key default gen_random_uuid(),
  referencia_id   uuid not null,
  agencia_id      uuid not null references agencias(id),
  numero_operacion text,
  estado          text not null default 'pendiente' check (estado in ('pendiente','enviado','aceptado','rechazado','cancelado')),
  xml_generado    text,
  acuse_url       text,
  fecha_envio     timestamptz,
  created_at      timestamptz not null default now()
);
create index on coves(agencia_id, estado);
create index on coves(referencia_id);

-- AUDITORÍA
create table auditoria (
  id          bigint generated always as identity primary key,
  agencia_id  uuid,
  usuario_id  uuid,
  tabla       text not null,
  registro_id text,
  accion      text not null,
  datos_antes jsonb,
  datos_despues jsonb,
  created_at  timestamptz not null default now()
);
create index on auditoria(agencia_id, created_at desc);

-- RLS
alter table clientes            enable row level security;
alter table proveedores         enable row level security;
alter table referencias         enable row level security;
alter table pedimentos          enable row level security;
alter table facturas_cfdi       enable row level security;
alter table conceptos_factura   enable row level security;
alter table coves               enable row level security;
alter table certificados        enable row level security;
alter table series_factura      enable row level security;
alter table auditoria           enable row level security;

create policy "agencia_isolation" on clientes          for all using (agencia_id = get_agencia_id());
create policy "agencia_isolation" on proveedores       for all using (agencia_id = get_agencia_id());
create policy "agencia_isolation" on referencias       for all using (agencia_id = get_agencia_id());
create policy "agencia_isolation" on pedimentos        for all using (agencia_id = get_agencia_id());
create policy "agencia_isolation" on facturas_cfdi     for all using (agencia_id = get_agencia_id());
create policy "agencia_isolation" on coves             for all using (agencia_id = get_agencia_id());
create policy "agencia_isolation" on series_factura    for all using (agencia_id = get_agencia_id());
create policy "solo_admin" on certificados             for all using (agencia_id = get_agencia_id() and get_rol() in ('admin','supervisor'));

create policy "lectura_catalogos" on cat_aduanas                 for select using (true);
create policy "lectura_catalogos" on cat_claves_documento        for select using (true);
create policy "lectura_catalogos" on cat_paises                  for select using (true);
create policy "lectura_catalogos" on cat_monedas                 for select using (true);
create policy "lectura_catalogos" on cat_fracciones_arancelarias for select using (true);
create policy "lectura_catalogos" on cat_contribuciones          for select using (true);
create policy "lectura_catalogos" on tipos_cambio                for select using (true);

-- DATOS SEMILLA
insert into cat_contribuciones (clave, descripcion, tipo) values
  ('IGI','Impuesto General de Importación','arancel'),
  ('IGE','Impuesto General de Exportación','arancel'),
  ('DTA','Derecho de Trámite Aduanero','derecho'),
  ('IVA','Impuesto al Valor Agregado','iva'),
  ('ISAN','Impuesto sobre Automóviles Nuevos','especial'),
  ('IEPS','Impuesto Especial sobre Producción y Servicios','especial'),
  ('PRV','Prevalidación Electrónica','derecho'),
  ('CNT','Cuota Compensatoria','cuota')
on conflict do nothing;

insert into cat_paises (clave, nombre) values
  ('MEX','México'),('USA','Estados Unidos'),('CAN','Canadá'),
  ('CHN','China'),('DEU','Alemania'),('JPN','Japón'),
  ('KOR','Corea del Sur'),('ITA','Italia'),('FRA','Francia'),
  ('ESP','España'),('GBR','Reino Unido'),('BRA','Brasil')
on conflict do nothing;

insert into cat_monedas (clave, nombre, pais_clave) values
  ('MXN','Peso Mexicano','MEX'),('USD','Dólar Americano','USA'),
  ('EUR','Euro','DEU'),('CAD','Dólar Canadiense','CAN'),
  ('JPY','Yen Japonés','JPN'),('GBP','Libra Esterlina','GBR')
on conflict do nothing;

insert into cat_claves_documento (clave, descripcion, tipo) values
  ('A1','Importación definitiva','importacion'),
  ('IN','Importación definitiva consolidada','importacion'),
  ('V1','Exportación definitiva','exportacion'),
  ('A3','Reimportación','importacion'),
  ('F2','Depósito fiscal entrada','deposito'),
  ('F4','Extracción depósito fiscal','deposito'),
  ('H3','Importación temporal IMMEX','importacion'),
  ('K1','Importación temporal','importacion'),
  ('RT','Retorno de exportación temporal','exportacion'),
  ('AF','Activo fijo IMMEX','importacion')
on conflict do nothing;

insert into cat_aduanas (clave, nombre, estado, region) values
  ('730','Aguascalientes','Aguascalientes','Centro'),
  ('240','Ciudad de México (AICM)','CDMX','Centro'),
  ('010','Tijuana','Baja California','Noroeste'),
  ('020','Mexicali','Baja California','Noroeste'),
  ('430','Ciudad Juárez','Chihuahua','Norte'),
  ('270','Nuevo Laredo','Tamaulipas','Noreste'),
  ('280','Monterrey','Nuevo León','Noreste'),
  ('470','Lázaro Cárdenas','Michoacán','Occidente'),
  ('480','Manzanillo','Colima','Occidente'),
  ('590','Veracruz','Veracruz','Sureste')
on conflict do nothing;
