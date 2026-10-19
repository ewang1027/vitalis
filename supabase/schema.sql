-- Supabase schema for Vitalis, reconstructed from the app's queries in src/.

-- Ids are text because the app looks rooms up by ids like 'room-101' as well as generated ones.

create table public.staff (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  role text not null,                      -- doctors are role 'Doctor'
  specialty text,
  phone text,
  email text,
  avatar_url text,
  is_online boolean not null default false, -- the first online staff row is the current user
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  age integer not null,
  gender text not null,                    -- 'Male', 'Female', 'Other', 'Unknown'
  condition text,
  severity text not null default 'stable', -- stable, moderate, warning, critical, recovering
  admission_date timestamptz not null default now(),
  discharge_date timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id text primary key default gen_random_uuid()::text,
  room_number text not null unique,
  room_name text not null,
  room_type text not null,                 -- 'General Ward', 'ICU', 'Pharmacy', ...
  status text not null default 'available', -- available, ready, occupied, cleaning, maintenance
  floor integer,
  position_x double precision,
  position_y double precision,
  position_z double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  equipment_type text not null,            -- bed, wheelchair, iv_pump, oxygen_tank, monitor
  current_room_id text references public.rooms (id),
  is_rental boolean not null default false,
  state text not null default 'idle_ready', -- in_use, idle_ready, idle_too_long, missing, dirty, broken
  state_label text,
  idle_minutes integer not null default 0,
  utilization_score numeric not null default 0,
  position_x double precision,
  position_y double precision,
  position_z double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_assignments (
  id text primary key default gen_random_uuid()::text,
  room_id text not null references public.rooms (id),
  patient_id text not null references public.patients (id), -- needed for select('*, patients(*)')
  assigned_doctor_id text references public.staff (id),
  assigned_nurse_id text references public.staff (id),
  assigned_at timestamptz not null default now(),
  discharged_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vitals (
  id text primary key default gen_random_uuid()::text,
  patient_id text not null references public.patients (id),
  room_id text references public.rooms (id),
  heart_rate integer,
  blood_pressure text,                     -- '120/80'
  temperature numeric,                     -- deg F
  oxygen_saturation integer,
  respiratory_rate integer,
  recorded_at timestamptz not null default now(),
  recorded_by_id text references public.staff (id),
  created_at timestamptz not null default now()
);

-- tasks.room_id has no foreign key: the task parsers can fall back to ids like 'room-101' that may not exist.
create table public.tasks (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  reason text,
  priority text not null default 'medium', -- low, medium, high, urgent
  action text not null,                    -- deliver_food, clean_asset, food_delivery, ...
  status text not null default 'active',   -- active, pending, in_progress, done, dismissed, completed, cancelled
  equipment_id text,
  room_id text,
  assigned_to_id text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  title text not null,
  message text not null,
  priority text not null default 'medium', -- critical, high, medium, low
  status text not null default 'unread',   -- unread, read, dismissed
  action_label text,
  action_id text,
  related_room_id text,
  related_equipment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.alerts (
  id text primary key default gen_random_uuid()::text,
  room_id text not null,
  alert_type text not null,
  message text not null,
  is_active boolean not null default true,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id text primary key default gen_random_uuid()::text,
  user_id text,
  room_id text,                            -- null for the general chat
  role text not null,                      -- user, assistant
  content text not null,
  created_at timestamptz not null default now(),
  is_archived boolean not null default false,
  archived_at timestamptz
);

-- The chat's task animations and the patient vitals panel subscribe to these with postgres_changes.
alter publication supabase_realtime add table public.tasks, public.vitals;

-- RLS is left off: the browser reads and writes every table with the anon key.
