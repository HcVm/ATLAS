-- Create table for Open Data Catalogs (Acuerdos Marco)
create table if not exists public.open_data_catalogs (
  id text primary key,
  name text not null,
  description text,
  color text,
  icon text,
  full_name text not null,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.open_data_catalogs enable row level security;

-- Create policies (modify as needed for your auth setup)
create policy "Enable read access for all users" on public.open_data_catalogs for select using (true);
create policy "Enable insert for authenticated users" on public.open_data_catalogs for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on public.open_data_catalogs for update using (auth.role() = 'authenticated');

-- Create table for System Configuration (e.g., current year)
create table if not exists public.system_config (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.system_config enable row level security;

-- Create policies
create policy "Enable read access for all users" on public.system_config for select using (true);
create policy "Enable update for authenticated users" on public.system_config for update using (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on public.system_config for insert with check (auth.role() = 'authenticated');

-- Seed initial data for Catalogs (from existing hardcoded values)
insert into public.open_data_catalogs (id, name, description, color, icon, full_name, status)
values 
  ('EXT-CE-2024-11', 'Mobiliario en General', 'Datos de compras de mobiliario y equipamiento para oficinas y espacios públicos', 'from-blue-500 to-cyan-500', '🪑', 'EXT-CE-2024-11 MOBILIARIO EN GENERAL', 'inactive'),
  ('EXT-CE-2025-11', 'Mobiliario en General', 'Acuerdo marco reemplazante para mobiliario en general (vigente 2025)', 'from-blue-600 to-indigo-600', '🪑', 'EXT-CE-2025-11 MOBILIARIO EN GENERAL', 'active'),
  ('EXT-CE-2024-12', 'Tuberías y Acabados', 'Acuerdo marco para materiales de construcción y acabados', 'from-amber-500 to-orange-500', '🔧', 'EXT-CE-2024-12 TUBERIAS, PINTURAS, CERAMICOS, SANITARIOS, ACCESORIOS Y COMPLEMENTOS EN GENERAL', 'active'),
  ('EXT-CE-2024-3', 'Materiales de Limpieza', 'Acuerdo marco para materiales e insumos de limpieza, papeles para aseo y limpieza', 'from-emerald-500 to-green-600', '🧹', 'EXT-CE-2024-3 MATERIALES E INSUMOS DE LIMPIEZA, PAPELES PARA ASEO Y LIMPIEZA', 'active'),
  ('EXT-CE-2024-16', 'Accesorios Domésticos', 'Accesorios domésticos y bienes para usos diversos en instituciones públicas', 'from-teal-500 to-emerald-500', '🏠', 'EXT-CE-2024-16 ACCESORIOS DOMÉSTICOS Y BIENES PARA USOS DIVERSOS', 'active'),
  ('EXT-CE-2024-26', 'Jardinería y Agricultura', 'Máquinas, equipos y herramientas para jardinería, silvicultura y agricultura', 'from-orange-500 to-red-500', '🌱', 'EXT-CE-2024-26 MAQUINAS, EQUIPOS Y HERRAMIENTAS PARA JARDINERIA, SILVICULTURA Y AGRICULTURA', 'active')
on conflict (id) do nothing;

-- Seed initial data for System Config
insert into public.system_config (key, value, description)
values ('current_fiscal_year', '2026', 'Año fiscal vigente para mostrar en dashboards')
on conflict (key) do nothing;
