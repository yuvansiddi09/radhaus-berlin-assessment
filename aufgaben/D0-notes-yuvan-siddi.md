# D0 — Code reading

Name: Yuvan Siddi

Notes on `app/api/termine/route.ts`, worst first:

1. **No auth on GET.** `select * from termine` — no `where`, no session check.
   Anyone hits this route, gets every customer's appointments.
2. **kundeId trusted from request body.** `body.kundeId` — never checked
   against who's actually asking. Anyone can create/probe appointments for
   any customer.
3. **SQL injection.** `kunde_id = '${kundeId}'` — string interpolation, not a
   parameter. Should be `where kunde_id = ?`, params array.
4. **Check + insert not atomic.** `offene` check is one awaited call, insert
   is another, nothing ties them together — a second request could slip in
   between and both pass the "< 3" check. Needs to be one atomic step.
5. **No input validation.** `filialeId`, `datum`, `beschreibung` — used
   as-is, no checks.
6. Minor: GET has no `status` filter either — deleted ones would show too.
