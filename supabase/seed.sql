-- Optional sample data from the design brief. Run once against an empty database.
insert into public.loans (loan_number, client, status, closing_date, first_payment_date, equipment_cost, deposit_pct, interest_rate, term_months) values
  ('DC-1000', 'Client D', 'Dead', '2026-07-10', '2026-08-10', 24600, 5, 9.25, 48),
  ('DC-1001', 'Client A', 'Closed', '2026-08-14', '2026-09-14', 38127.43, 0, 8.99, 60),
  ('DC-1002', 'Client B', 'Pipeline', '2026-10-20', '2026-11-20', 58000, 10, 9.49, 48),
  ('DC-1003', 'Client C', 'Pipeline', '2026-11-16', '2026-12-16', 17500, 0, 9.99, 36);

select setval('public.loan_number_seq', 1003);
