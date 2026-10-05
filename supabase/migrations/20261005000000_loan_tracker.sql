-- Dinio Capital Loan Tracker schema.
-- All signed-in partners have the same full access. Sign-ups are invite only:
-- turn off "Allow new users to sign up" under Authentication → Sign In / Providers,
-- and invite partners from Authentication → Users.

create sequence if not exists public.loan_number_seq start 1001;

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  loan_number text not null unique default ('DC-' || nextval('public.loan_number_seq')),
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

create table if not exists public.billing_records (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
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
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  -- Yearly rate (percent) behind the referral fee schedule.
  referral_rate_pct numeric(6, 4) not null default 0.5 check (referral_rate_pct >= 0),
  origination_pct numeric(6, 4) not null default 1 check (origination_pct >= 0),
  legal_pct numeric(6, 4) not null default 1 check (legal_pct >= 0),
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger loans_touch before update on public.loans
  for each row execute function public.touch_updated_at();
create trigger billing_records_touch before update on public.billing_records
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

alter table public.loans enable row level security;
alter table public.billing_records enable row level security;
alter table public.settings enable row level security;

create policy "Partners manage loans" on public.loans
  for all to authenticated using (true) with check (true);
create policy "Partners manage billing" on public.billing_records
  for all to authenticated using (true) with check (true);
create policy "Partners read settings" on public.settings
  for select to authenticated using (true);
create policy "Partners update settings" on public.settings
  for update to authenticated using (true) with check (true);

grant usage, select on sequence public.loan_number_seq to authenticated;
