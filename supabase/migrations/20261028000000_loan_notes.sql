-- A running log of notes on each loan: why it is waiting, what was sent to whom, and so on.
-- Every note is stamped with the date and the signed-in partner's email automatically.
--
-- Run once. Safe to run again. Only adds a new table: nothing existing is changed or removed.

create table if not exists public.tracker_loan_notes (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.tracker_loans (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  -- Filled in by the database from the signed-in user, so it can't be faked from the app.
  author text not null default coalesce(auth.jwt() ->> 'email', 'Unknown'),
  created_at timestamptz not null default now()
);

create index if not exists tracker_loan_notes_loan_idx on public.tracker_loan_notes (loan_id, created_at desc);

alter table public.tracker_loan_notes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tracker_loan_notes' and policyname = 'Partners manage notes'
  ) then
    create policy "Partners manage notes" on public.tracker_loan_notes
      for all to authenticated using (true) with check (true);
  end if;
end
$$;
