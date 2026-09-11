# D1 — Permission concept notes

## Part A — Matrix

| Object | Role | read | create | update | delete | enforced where? | why there? |
|---|---|---|---|---|---|---|---|
| Profile | Visitor | – | – | – | – | – | No account, nothing to show. |
| Profile | Customer | own only | – | own only | – | Server/API | Ownership can only be checked once you know who is asking (session), which the browser can't be trusted to enforce. |
| Profile | Workshop staff | – | – | – | – | – | Staff never need raw customer profile data; the customer's name/branch reaches them only through the appointment view. |
| Profile | Administration | all | – | all | all | Server/API | Support needs to correct customer data; still needs a role check, not a client toggle. |
| Profile | Nightly job | – | – | – | – | – | Job only touches appointments, never profiles. |
| Appointment | Visitor | aggregate free-slot counts only | – | – | – | Server/API | The count is derived server-side from real rows; raw rows must never reach an anonymous caller. |
| Appointment | Customer | own only | own only (max 3 open) | – | – | Server/API | Both "own only" and "max 3 open" are business rules that depend on server state (session + a live count) that the browser cannot be trusted to check. |
| Appointment | Workshop staff | own branch only | – | status, own branch only | own branch only (soft-delete) | Server/API | Branch scoping needs the staff member's own branch, known only server-side from their account row. |
| Appointment | Administration | all branches | – | all | all | Server/API | Same mechanism as staff, just without the branch filter. |
| Appointment | Nightly job | all (for reminders/export) | – | – | – | Server/API | Authenticated by a server-held secret header, never exposed to a browser. |
| Photo | Visitor | – | – | – | – | – | Photos are personal data tied to a specific appointment. |
| Photo | Customer | own only | own only | – | own only | Server/API | Same reasoning as appointments — needs session + an ownership join, not just "guess the filename". |
| Photo | Workshop staff | own branch only | – | – | – | Server/API | Staff need to see the bike's condition for appointments they're handling, nothing more. |
| Photo | Administration | all | – | – | all | Server/API | Oversight/cleanup. |
| Price list | Visitor | all | – | – | – | Browser | Public marketing information, nothing sensitive — fine to render straight from a public page. |
| Price list | Customer/Staff | all | – | – | – | Browser | Same as above. |
| Price list | Administration | all | all | all | all | Server/API | Writes need a role check; reads can stay public. |

## Part B — The attack (findings in this repository)

**Must be gone before go-live:**

1. **Client fully controls its own identity and role.** `Benutzerwechsel.tsx`
   sets `kunde_id`/`rolle` via plain, unsigned `document.cookie` writes, and
   every route that matters (`termine/route.ts`, `termine/[id]/route.ts`,
   `profil/route.ts`) either trusted the cookie blindly or trusted the
   request body instead. Net effect: anyone can set
   `document.cookie = "rolle=verwaltung"` in devtools and become an admin.
   Severity: critical — this undermines every other control in the app.
2. **SQL injection** in the old `POST /api/termine`
   (`` `...kunde_id = '${kundeId}'` ``). Severity: critical.
3. **No authorization on `PATCH`/`DELETE /api/termine/[id]`.** Any caller —
   logged in or not — could change the status of, or soft-delete, *any*
   appointment by id. Severity: critical.
4. **`SERVICE_KEY` hard-coded in `lib/config.ts` and imported by a
   `'use client'` component** (`Terminuebersicht.tsx`). Anything a client
   component imports ships in the browser bundle — the "secret" meant only
   for the nightly job was sitting in plain text in every visitor's browser,
   and the workshop overview used it to read data for *both* branches
   regardless of which branch the logged-in staff member belonged to (no
   branch scoping at all). Severity: critical.
5. **Privilege escalation via `PATCH /api/profil`.** `FELDER` included
   `'rolle'`, so a customer could `PATCH` their own account into
   `verwaltung`. Severity: critical.
6. **Photo IDOR.** `public/uploads/foto-104x.svg` — sequential, guessable
   filenames, served as static files with no ownership or auth check at all.
   Anyone can enumerate and download any customer's photos. Severity: high.
   *(Deliberately not fixed in the 60-minute D2 window — see handover notes.)*

**Can clean up later:**

7. **Account enumeration via `/api/passwort-vergessen`.** Distinct
   404-vs-200 responses reveal whether an email is registered. Low severity
   (no direct data exposure, just a minor privacy leak), but cheap to fix —
   we fixed it anyway in D2 since it was a one-line change.
8. **No input validation** on appointment fields (`filialeId`, `datum`,
   `beschreibung` accepted unchecked in the original code).

## Part C — Design: enforcing "max 3 open appointments" server-side

```sql
-- Inside one transaction (BEGIN IMMEDIATE ... COMMIT), no `await` between the
-- two statements:
SELECT COUNT(*) AS n FROM termine
 WHERE kunde_id = :sessionKundeId AND status = 'offen';
-- if n >= 3: abort, return 400
INSERT INTO termine (kunde_id, filiale_id, datum, beschreibung, status)
VALUES (:sessionKundeId, :filialeId, :datum, :beschreibung, 'offen');
```

The key point isn't the SQL — it's that the check and the write must not have
an `await` (or any other yield point) between them, otherwise two requests
arriving at nearly the same time can each read "2 open" and both proceed.

**How would I know it works?** Fire N concurrent `POST` requests from an
account that currently has fewer than 3 open appointments, where N would
push the total past 3 (e.g. 5 requests from an account with 1 open). Assert
that exactly `3 - current_open` succeed and the rest come back `400`, and
that the final row count for that customer never exceeds 3. A single
sequential test can't catch this — it has to be concurrent (`Promise.all`),
which is exactly how we verified the fix in D2.
