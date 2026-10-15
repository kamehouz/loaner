-- Pipeline loans are still being underwritten, so most details can be unknown until
-- the bank confirms them. This lets those details be blank, and makes the loan number
-- the bank's own (typed in) instead of an automatic DC- number.
--
-- Run once, after 20261005120000_loan_tracker.sql. Safe to run again.
-- Existing loans and their numbers are not changed.

alter table public.tracker_loans alter column loan_number drop default;
alter table public.tracker_loans alter column loan_number drop not null;
alter table public.tracker_loans alter column closing_date drop not null;
alter table public.tracker_loans alter column first_payment_date drop not null;
alter table public.tracker_loans alter column equipment_cost drop not null;
alter table public.tracker_loans alter column interest_rate drop not null;
alter table public.tracker_loans alter column term_months drop not null;

-- The loan number must still be unique when it is filled in (several loans can be waiting on one).
-- A closed loan must be complete.
alter table public.tracker_loans drop constraint if exists tracker_loans_closed_is_complete;
alter table public.tracker_loans add constraint tracker_loans_closed_is_complete check (
  status <> 'Closed' or (
    loan_number is not null and closing_date is not null and first_payment_date is not null
    and equipment_cost is not null and interest_rate is not null and term_months is not null
  )
);
