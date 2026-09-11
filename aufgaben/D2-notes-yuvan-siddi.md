# D2 — Handover notes

## Live demo script (points 2 and 3 — the attempt that has to fail)

1. **Max 3 open appointments.** As **Mira Sandberg** (`/termine`), book until
   3 are open, then try a 4th → rejected server-side, "Maximal 3 offene
   Termine". Then the version a sequential click can't show: from the
   browser console, fire 5 booking requests at once with `Promise.all` from
   an account with fewer than 3 open → only enough to reach 3 succeed, the
   rest come back `400`. That's the check-then-insert race.
2. **No customer touches another customer's appointment.** Still as Mira, in
   the console: `fetch('/api/termine/3', { method: 'PATCH', ... })` against
   an appointment belonging to someone else → `403`. Then book with a forged
   `kundeId` in the request body pointing at another customer → the
   appointment is created under Mira's own id anyway; prove it by listing
   `/api/termine` again.
3. **Branch scoping.** Switch to **Tom Baumgart** (Neukoelln) and **Rita
   Ohlsen** (Wedding) on `/werkstatt` — each sees only their own branch.
   Then **Katrin Lubitz** (Verwaltung) — sees both.
4. **Forged identity.** Logged out, set `document.cookie =
   'session=6.verwaltung.fake'` and call `/api/termine/werkstatt` → `403`.
   The cookie is signed; without the server's secret it can't be faked.

## What the agent got wrong, and how I noticed

1. **A "cleaner" rewrite that silently dropped the actual fix.** A revised
   version of `app/api/termine/route.ts` came back looking more
   production-grade — `try`/`catch`, tidy error responses, a comment
   announcing "use a parameterized query instead of string interpolation."
   It had quietly gone back to reading `kundeId` from the request body
   (the whole vulnerability) and split the check and insert into two
   separate awaited calls again (the race). On top of that its
   "parameterized" query used `$1` placeholders — Postgres syntax, not what
   this project's `node:sqlite` driver takes. Noticed by reading it against
   the requirements rather than against the previous diff, and confirmed the
   placeholder bug by running that exact pattern against the real driver:
   `column index out of range`. It would have crashed on the first booking.
   **Lesson: "looks more professional" and "is more correct" are unrelated.**
2. **Missed that workshop staff had no branch anywhere in the schema.** The
   `kunden` table had no column linking Tom/Rita to a branch, so the first
   pass at branch scoping had nothing to scope by. Noticed when writing the
   filter and finding no field to filter on; had to add `filiale_id` to
   `kunden` and assign the staff accounts in the seed before requirement 4
   could be implemented at all.
3. **Fixed the API but left the UI showing stale data.** After the branch
   scoping worked, switching accounts still showed the previous account's
   appointments until a manual reload. Only turned up by clicking through
   the app as a user; the API was correct the whole time, so no amount of
   re-reading the route would have found it. Cause: the list is a client
   component that fetches once on mount, and `router.refresh()` re-renders
   server components without remounting it.
4. **An enumeration oracle in the authorization code itself.** The first
   version of `app/api/termine/[id]/route.ts` loaded the appointment before
   checking the caller's role, so an unauthorized caller got `404` for a
   missing id and `403` for a real one — enough to map which appointments
   exist. Ironic given D1 flagged exactly this pattern on the password
   reset. Found while re-reading my own merged code before hand-in, not
   while writing it.
5. **Type error from a too-narrow `as const`.** `FILIALEN` is `as const`, so
   `Set(FILIALEN.map(f => f.id))` inferred `Set<1 | 2>` and rejected the
   plain `number` from `Number(body.filialeId)`. Caught by `npx tsc
   --noEmit`; the build would have failed.
6. **Two packaging slips.** A dev-server config pointed at the wrong working
   directory, and the first submission ZIP swept in gitignored build
   artifacts (`tsconfig.tsbuildinfo`, `next-env.d.ts`). Caught by checking
   the server's own startup log, and by diffing the ZIP's contents against
   `git ls-files`.

## How I checked the agent's work

Reading the diff was never the test. Each requirement was verified against
running behaviour, and specifically against the case that must *fail*:
concurrent requests for the race (`Promise.all`, asserting how many got
through), forged ids and forged cookies for the access rules, and switching
between all six accounts in the browser for the scoping rules. Plus `npx
tsc --noEmit` and `npm run build` on every pass, and a `grep` over the
built client bundle to confirm no secret shipped to the browser.

## What was deliberately left out in the 60 minutes

**Photo access control** (`public/uploads/`) — filenames are still
sequential and served with no ownership check, because fixing it properly
means moving uploads out of `/public` entirely, which didn't fit alongside
the five appointment/session requirements in the time available.

## One stretch item beyond the checklist

Every fix above trusts the session — but the session itself was forgeable:
the switcher wrote plain `kunde_id`/`rolle` cookies via `document.cookie`,
so anyone could open devtools and become `verwaltung`, walking straight past
all of it. The `session` cookie is now signed with HMAC-SHA256 (using the
`SESSION_SECRET` that was already sitting unused in `.env`) and issued only
server-side by `/api/sitzung`, which looks the role up from the database.
Kept deliberately narrow: this *signs* the existing hard-wired switcher, it
does not add registration or passwords, because the brief says real
authentication isn't the point.
