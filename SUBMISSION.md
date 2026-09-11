# Assessment submission — Yuvan Siddi

Radhaus Berlin workshop portal, assessment day 11.09.2026.

## Where things are

| Deliverable | File |
|---|---|
| D0 — code reading notes | `aufgaben/D0-notes-yuvan-siddi.md` |
| D1 — permission matrix, findings, design | `aufgaben/D1-notes-yuvan-siddi.md` |
| D2 — handover notes (agent mistakes, what was left out, demo script) | `aufgaben/D2-notes-yuvan-siddi.md` |
| Agent rules file | `CLAUDE.md` |
| D2 code changes | commit history from `959185b` onwards |

## Running it

```
npm install
npm run seed     # creates data/radhaus.db
npm run dev      # http://localhost:3000
```

Requires Node.js ≥ 22.5. Pick an account from the selector, top right.

## What changed in D2

All five requirements hold; each was verified against running behaviour,
including the attempts that must fail (see the demo script in the D2 notes).

- Identity is derived from the session on every route, never from the
  request body — this was the root cause behind most D1 findings.
- The "max 3 open appointments" check and its insert run in one transaction,
  so concurrent requests cannot slip past the limit.
- `PATCH`/`DELETE` on an appointment now require workshop staff or
  administration, scoped to the staff member's own branch.
- `SERVICE_KEY` no longer reaches the browser; the workshop view uses a
  session-scoped endpoint instead of a shared secret.
- Customers can no longer edit their own `rolle`; password reset no longer
  reveals whether an address is registered.
- `kunden.filiale_id` added, so staff can be scoped to a branch at all.
- Beyond the checklist: the session cookie is HMAC-signed and issued
  server-side, so the hard-wired identity can no longer be forged by hand.

Known gap, left open deliberately: photo access control (`public/uploads/`).
