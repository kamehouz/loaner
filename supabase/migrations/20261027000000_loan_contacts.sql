-- Optional contacts kept on file for each loan: the Rimco contact and the Tu Coop contact,
-- each with a name and an email (either can be left blank).
--
-- Run once. Safe to run again. Only adds columns: nothing existing is changed or removed.

alter table public.tracker_loans add column if not exists rimco_contact_name text;
alter table public.tracker_loans add column if not exists rimco_contact_email text;
alter table public.tracker_loans add column if not exists tucoop_contact_name text;
alter table public.tracker_loans add column if not exists tucoop_contact_email text;
