# Dinio Capital Loan Tracker

Internal web app for the three Dinio Capital partners. It tracks equipment loan referrals and works out fees, payment schedules and monthly billing. It replaces the spreadsheet.

Screens: Overview, Loans (with Loan Detail and the Add/Edit form), Loan Projection, Billing, Settings and Login. Desktop gets a sidebar. Phones get a bottom tab bar and card layouts.

The design this was built from is in `project/Loan Tracker.dc.html`, with the design conversation in `chats/` and the handoff notes in `HANDOFF.md`.

## Stack

- React + TypeScript + Vite
- Supabase for Postgres and email/password auth
- Vitest for the calculation tests

## Running locally

```sh
npm install
npm run dev
```

The app connects to the Dinio Capital Supabase project out of the box: its URL and publishable key are built into `src/data/index.ts` (both are public by design). `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` override them. Run with `VITE_DEMO=1 npm run dev` for **demo mode**, which loads the sample loans from the brief, saves changes in the browser only, and accepts any email and password at sign in.

```sh
npm test          # calculation and billing tests
npm run build     # typecheck + production build into dist/
```

## Setting up Supabase

1. Create a Supabase project.
2. Run `supabase/migrations/20261005120000_loan_tracker.sql` in the SQL editor, or use `supabase db push`. You can also run `supabase/seed.sql` to load the sample loans. Every table is prefixed `tracker_`, so this is safe in a database shared with other apps, and the script can be run again safely.
3. Go to **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**. Access is invite only.
4. Go to **Authentication → Users** and invite each partner by email.
5. To point the app at a different project, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from **Project Settings → API**) in `.env.local` or in Vercel's environment variables.

Every signed-in partner has the same full access, which Row Level Security enforces. Loans are never deleted. They get marked Dead instead.

## How the numbers work

All of this lives in `src/lib/calc.ts` and `src/lib/billing.ts`.

- **Deposit** = equipment cost × deposit %. **Financed** = equipment cost − deposit.
- **Monthly payment**: a standard amortizing payment on the financed amount at the loan's interest rate, over the term. The term can be any whole number of months from 1 to 600.
- **Origination fee** and **Legal/closing fee**: a percent of equipment cost (1% by default, editable in Settings). Both are billed once, in the month the loan closes. Dead loans are skipped.
- **Referral fee**: the interest portion of payment *n* on a hypothetical loan of the **full equipment cost**, at the referral rate (0.5% a year by default, editable in Settings), over the same term. It is billed monthly from the first payment date through the last, for **Closed** loans only. Each month is rounded to the cent so that the running total stays exact. For Client A ($38,127.43, 60 months) that gives $15.89 for payment 1, $15.62 for payment 2 and $486.52 over the life of the loan. Unit tests cover all three.
- Money shows as `$38,127.43`. Dates show and are typed as day/month/year.

Changing a rate in Settings recalculates every loan, including months already billed.

## Project layout

```
src/
  lib/          formatting, loan maths, billing rules, sample data, tests
  data/         DataStore interface, Supabase and demo implementations
  screens/      Overview, Loans, LoanDetail, Projection, Billing, Settings, Login
  components/   shared UI, Add/Edit loan form
  styles.css    design tokens and components, taken from the prototype
supabase/       schema migration and seed data
```
