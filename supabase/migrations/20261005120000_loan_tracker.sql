-- Dinio Capital Loan Tracker schema.
-- Safe to run more than once, and safe to run in a database that already holds
-- other apps' tables: everything here is prefixed "tracker_".
--
-- All signed-in partners have the same full access. Sign-ups are invite only:
-- turn off "Allow new users to sign up" under Authentication → Sign In / Providers,
-- and add partners under Authentication → Users.

create sequence if not exists public.tracker_loan_number_seq start 1001;

create table if not exists public.tracker_loans (
  id uuid primary key default gen_random_uuid(),
  loan_number text not null unique default ('DC-' || nextval('public.tracker_loan_number_seq')),
  client text not null check (length(trim(client)) > 0),
  status text not null default 'Pipeline' check (status in ('Pipeline', 'Closed', 'Dead')),
  closing_date date not null,
  first_payment_date date not null,
  equipment_cost numeric(14, 2) not null check (equipment_cost > 0),
  deposit_pct numeric(6, 3) not null default 0 check (deposit_pct >= 0 and deposit_pct <= 100),
  interest_rate numeric(6, 3) not null check (interest_rate >= 0),
  term_months integer not null check (term_months between 1 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracker_billing (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.tracker_loans (id) on delete cascade,
  fee_type text not null check (fee_type in ('orig', 'legal', 'ref')),
  -- First day of the billing month.
  period date not null check (extract(day from period) = 1),
  billed boolean not null default false,
  date_billed date,
  invoice_number text not null default '',
  updated_at timestamptz not null default now(),
  unique (loan_id, fee_type, period)
);

-- Single row of editable settings.
create table if not exists public.tracker_settings (
  id integer primary key default 1 check (id = 1),
  -- Yearly rate (percent) behind the referral fee schedule.
  referral_rate_pct numeric(6, 4) not null default 0.5 check (referral_rate_pct >= 0),
  origination_pct numeric(6, 4) not null default 1 check (origination_pct >= 0),
  legal_pct numeric(6, 4) not null default 1 check (legal_pct >= 0),
  updated_at timestamptz not null default now()
);
insert into public.tracker_settings (id) values (1) on conflict (id) do nothing;

create or replace function public.tracker_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tracker_loans_touch on public.tracker_loans;
create trigger tracker_loans_touch before update on public.tracker_loans
  for each row execute function public.tracker_touch_updated_at();
drop trigger if exists tracker_billing_touch on public.tracker_billing;
create trigger tracker_billing_touch before update on public.tracker_billing
  for each row execute function public.tracker_touch_updated_at();
drop trigger if exists tracker_settings_touch on public.tracker_settings;
create trigger tracker_settings_touch before update on public.tracker_settings
  for each row execute function public.tracker_touch_updated_at();

alter table public.tracker_loans enable row level security;
alter table public.tracker_billing enable row level security;
alter table public.tracker_settings enable row level security;

drop policy if exists "Partners manage loans" on public.tracker_loans;
create policy "Partners manage loans" on public.tracker_loans
  for all to authenticated using (true) with check (true);
drop policy if exists "Partners manage billing" on public.tracker_billing;
create policy "Partners manage billing" on public.tracker_billing
  for all to authenticated using (true) with check (true);
drop policy if exists "Partners read settings" on public.tracker_settings;
create policy "Partners read settings" on public.tracker_settings
  for select to authenticated using (true);
drop policy if exists "Partners update settings" on public.tracker_settings;
create policy "Partners update settings" on public.tracker_settings
  for update to authenticated using (true) with check (true);

grant usage, select on sequence public.tracker_loan_number_seq to authenticated;
