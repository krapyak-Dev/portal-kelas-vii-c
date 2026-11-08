-- Jalankan seluruh SQL ini di Supabase > SQL Editor.
-- Buat akun melalui Authentication > Users. Jangan aktifkan public sign-up.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'siswa' check (role in ('siswa','admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  status text not null check (status in ('masuk','tidak_masuk')),
  note text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(student_id,date)
);
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.duty_schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  duty_date date not null,
  task text default 'Piket kelas',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.cash_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  month text not null,
  year integer not null,
  amount numeric(12,2) not null default 0 check(amount >= 0),
  paid boolean not null default false,
  paid_at date,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(student_id,month,year)
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

alter table public.profiles enable row level security;
alter table public.attendance enable row level security;
alter table public.announcements enable row level security;
alter table public.duty_schedules enable row level security;
alter table public.cash_payments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profile self or admin read" on public.profiles;
create policy "profile self or admin read" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "attendance self or admin read" on public.attendance;
create policy "attendance self or admin read" on public.attendance for select to authenticated
using (student_id = auth.uid() or public.is_admin());
drop policy if exists "admin manage attendance" on public.attendance;
create policy "admin manage attendance" on public.attendance for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "all authenticated read announcements" on public.announcements;
create policy "all authenticated read announcements" on public.announcements for select to authenticated using (true);
drop policy if exists "admin manage announcements" on public.announcements;
create policy "admin manage announcements" on public.announcements for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "duty self or admin read" on public.duty_schedules;
create policy "duty self or admin read" on public.duty_schedules for select to authenticated
using (student_id = auth.uid() or public.is_admin());
drop policy if exists "admin manage duty" on public.duty_schedules;
create policy "admin manage duty" on public.duty_schedules for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "cash self or admin read" on public.cash_payments;
create policy "cash self or admin read" on public.cash_payments for select to authenticated
using (student_id = auth.uid() or public.is_admin());
drop policy if exists "admin manage cash" on public.cash_payments;
create policy "admin manage cash" on public.cash_payments for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "notification self or admin read" on public.notifications;
create policy "notification self or admin read" on public.notifications for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notification self mark read" on public.notifications;
create policy "notification self mark read" on public.notifications for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "admin create notifications" on public.notifications;
create policy "admin create notifications" on public.notifications for insert to authenticated
with check (public.is_admin());
drop policy if exists "admin manage notifications" on public.notifications;
create policy "admin manage notifications" on public.notifications for delete to authenticated
using (public.is_admin());

-- Catatan: buat user Auth satu per satu, lalu masukkan id-nya ke profiles.
-- Dua akun admin harus diberi role 'admin' lewat SQL Editor oleh pemilik project.
