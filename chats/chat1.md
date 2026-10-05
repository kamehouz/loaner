# # Dinio Capital Loan Tracker

_Started 2026-10-02 21:43 UTC_

---

## User

Design a simple internal web app called "Dinio Capital Loan Tracker". It replaces a spreadsheet and is used by 3 business partners, all with the same access. Dinio Capital is a loan referral business: a bank lends the money, we refer equipment loans and earn fees. The app is internal only and never shown to borrowers. Desktop first, but it must also work well on a phone.

Look and feel: clean, calm and professional, like a modern finance tool. Blue as the main color (around #(9ECAE1), white and light grey surfaces, one soft accent for positive states. Generous spacing, easy to scan, no clutter. Money always shows with a dollar sign and commas, like $38,127.43. Dates show as day/month/year. All labels are in English.

The app has four screens in a simple side or top navigation: Overview, Loans, Loan Projection, Billing.

1. Overview. A row of five cards. Closed Loans shows a count, with the total dollar amount closed directly below it. Pipeline Loans shows a count, with the total dollar amount in pipeline directly below it. Then Origination Fees So Far, Closing Fees So Far, and Monthly Referral Fee (ongoing). At the top is a month picker with previous and next arrows, which controls the Monthly Referral Fee card. Below the cards is a table, "Referral fee for the month shown, by loan", with Client, Loan #, Status, Payment #, and Referral Fee.

2. Loans. A table with one row per loan: Loan #, Client or Company, Status (Pipeline, Closed or Dead, shown as colored chips), Closing Date, First Payment Date, Equipment Cost, Deposit %, Interest, Term in months (36, 48 or 60), Deposit $, Financed Amount, and Monthly Payment. The calculated columns look different from the typed ones. An "Add loan" button opens a short, friendly form with only the typed fields. First Payment Date defaults to one month after the Closing Date but can be changed. Clicking a row opens the Loan Detail screen. Loans can be edited, and marked Dead instead of deleted.

3. Loan Projection. Pick a loan at the top. Show its summary (client, status, equipment cost, deposit, financed amount, interest, term, monthly payment) and its fees side by side: Origination Fee, Legal/Closing Fee, Referral Fee over the life of the loan, Total Fees. Below is the full payment table with up to 60 rows: Pmt #, Pmt Date, Principal, Interest, P&I Payment, Balance, Referral Fee. Highlight the row for the current month, and show totals at the bottom.

4. Billing. This is the screen used most. A month picker with previous and next arrows. It lists every loan that has something to bill that month, with the three fees kept separate: Origination Fee, Legal/Closing Fee (both billed once, in the month the loan closes), and Referral Fee (billed every month, with the payment number shown). Each row has a Billed checkbox, a Date Billed, and an Invoice #. Billed rows turn soft green. At the top show totals for each fee type, the total to bill, the amount already billed, and the amount still to bill. A "Copy breakdown" button copies the month's per loan breakdown for pasting into an invoice.

Use this sample data so the mockups look real. Client A, Closed, equipment cost $38,127.43, 0% deposit, 8.99% interest, 60 months, monthly payment $791.28, origination $381.27, legal/closing $381.27, referral fee $15.89 in the first month and $486.52 over the life of the loan. Client B, Pipeline, $58,000, closing 20/10/2026, origination $580.00, legal/closing $580.00. Client C, Pipeline, $17,500. Example Billing screen for October 2026: Client A shows referral fee payment #2 of $15.62, Client B shows origination $580.00 and legal/closing $580.00, total to bill $1,175.62.

Include empty states (no loans yet, nothing to bill this month), a login screen (email and password, invite only), and keep every screen simple enough that a first time user needs no explanation. Return the four screens plus the add loan form and login, with the components and spacing notes a developer can build from.

## Assistant

_[tool: run_script]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

I've built two files. **Loan Tracker** is a clickable prototype with all four screens, the Loan Detail screen, the Add/Edit loan form, a "Mark as dead" confirmation, login and the empty states. **Developer Notes** has the colours, type, spacing, component specs, formatting and calculation rules, plus live phone-width views of Billing and Loans. A background check of the prototype is still running.

- **Checking your numbers:** Client A comes out at $791.28 a month, with referral fees of $15.89 and $15.62 and $486.52 over the life of the loan. October 2026 billing totals $1,175.62.
- **Referral fee is an approximation:** I couldn't work out the bank's real referral formula from the figures, so I fitted a curve that reproduces Client A's numbers exactly. Other loans are estimates. The developer needs to replace it with the bank's actual schedule.
- **Details I filled in:**
  - Client A: closed 14/08/2026.
  - Client B: 10% deposit, 9.49%, 48 months.
  - Client C: 9.99%, 36 months.
  - I added a Dead "Client D" so you can see the grey Dead chip.
  - Origination and legal/closing fees are 1% of equipment cost, which matches your figures.
- **Blue for buttons:** #9ECAE1 is too light for white text, so it's used for the logo and highlights. Buttons and links use a darker shade of the same blue, #2D6A8E.
- **Loan totals:** the Closed and Pipeline cards add up equipment cost, not the amount financed after deposit.
- **"Today" is fixed:** the prototype treats today as 02/10/2026 so the "current month" highlight matches your examples. The developer should switch this to the real date.
- **Trying it out:** there's a setting that shows the app with no loans, and another that chooses which screen it opens on, including login. To see "Nothing to bill", go to July 2026 on the Billing screen. Changes you make in the prototype are saved in your browser.

## User

everyhting looks great. only 1 small tweak. I am not sure if we will ahve fixed loan terms. I think for thos protype version the input should be manual to account for other months (Eg 50, 12) etc

## Assistant

_[tool: dc_html_str_replace]_

_[tool: run_script]_

_[tool: ready_for_verification]_

_[tool: get_webview_logs]_

_[tool: show_html]_

_[tool: ready_for_verification]_

Term is now a number you type in the Add/Edit loan form instead of the 36 / 48 / 60 buttons. It accepts any whole number from 1 to 600, with "months" shown beside it. The monthly payment and fees still work out for any term.

The first time I opened the updated page, the browser reported two errors with no details. They didn't come back when I reopened it, but I haven't found the cause. The background check is still running and will flag them if they show up again.

