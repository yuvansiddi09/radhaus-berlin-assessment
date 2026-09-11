# Radhaus Berlin — agent rules (D2)

Scope: fix authorization/session handling in the workshop booking portal per
`aufgaben/D2-live-build.md`. Sign-in stays hard-wired (pick one of six fixed
accounts via the switcher) — do not build real authentication (no
registration, no passwords).

## Non-negotiable rules

1. **Never trust identity or role from the request body.** Every API route
   must derive who is asking from the session helpers in `lib/session.ts`
   (`getKundeId()`, `getRolle()`), not from `body.kundeId` or similar.
2. **Every write must be scoped to the caller.** A customer can only read/
   write their own rows. A workshop employee is scoped to their own branch
   (`filiale_id`). Only `verwaltung` may see both branches.
3. **All SQL must be parameterized.** No string interpolation of values into
   SQL, ever — including inside template literals.
4. **Business rules enforced server-side, inside a transaction.** The "max 3
   open appointments" check and the insert that follows it must happen
   without an `await` between them, so no concurrent request can slip
   through between the check and the write.
5. **No secret is allowed to reach client-side code.** Anything imported by
   a file with `'use client'` (directly or transitively) is public. Move
   secrets (`SERVICE_KEY`) out of `lib/config.ts` and read them from
   `process.env` only in server-only files.
6. **Self-service must not allow privilege escalation.** A customer editing
   their own profile must never be able to change their own `rolle`.
7. Keep diffs minimal and scoped to the D2 checklist. Don't refactor
   unrelated code, don't add new dependencies, don't restyle the UI.

## Explicitly out of scope for this pass

- Fixing the photo upload/serving IDOR (`public/uploads/*` is served
  statically with guessable filenames, no ownership check). Flagged in the
  D2 handover notes as deliberately left out.
- Real password-based authentication: registration, passwords, hashing.
  (Note: the hard-wired identity was later made tamper-proof with a signed
  session cookie — see the "Amendment" section below. That's *signing* the
  existing fixed-account switcher, not building real auth, and stays
  within this rule.)

## Amendment — session cookie signing (added after the initial 60 minutes)

The switcher originally wrote plain `kunde_id`/`rolle` cookies via
`document.cookie`, which every server-side check above trusted. That's
forgeable by hand in devtools, which defeats every rule above it. Added:

8. **The session must be a single signed cookie (`session`), issued only by
   `app/api/sitzung/route.ts`.** It signs `kundeId.rolle` with HMAC-SHA256
   using `SESSION_SECRET` (server-only, never imported by client code) and
   sets it `httpOnly`. The client may only ever request *which* of the six
   fixed accounts to become by id — the role is looked up from the `kunden`
   table server-side, never taken from the client. No code should read or
   write `kunde_id`/`rolle` cookies directly anymore.
