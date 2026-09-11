# D2 — Handover notes

## Live demo script (points 2 and 3 — the attempt that has to fail)

1. Log in as **Mira Sandberg** (`/termine`). Book appointments until 3 are
   open, then try a 4th → rejected server-side with "Maximal 3 offene
   Termine". Then, in the browser console, fire 5 booking requests at once
   with `Promise.all` from an account with fewer than 3 open — only enough
   to reach 3 succeed, the rest come back `400`. This is the version of the
   attack a single sequential click can't show: the check-then-insert race.
2. Still as Mira, open the console and try
   `fetch('/api/termine/3', { method: 'PATCH', ... })` (an appointment
   belonging to a different customer) → `403`. Then try booking with a
   forged `kundeId` in the request body pointing at another customer →
   the appointment is created under Mira's own id regardless, provably by
   listing `/api/termine` again afterwards.
3. Switch to **Tom Baumgart** (Neukölln) and **Rita Ohlsen** (Wedding) on
   `/werkstatt` — show each sees only their own branch, then switch to
   **Katrin Lubitz** and show she sees both.

## What the agent got wrong, and how I noticed

1. **Type error from a too-narrow `as const` type.** `FILIALEN` is typed
   `as const`, so `Set(FILIALEN.map(f => f.id))` came out as `Set<1 | 2>`,
   which then rejected the plain `number` coming from `Number(body.filialeId)`
   in `.has()`. Caught immediately by running `npx tsc --noEmit` — the build
   would have failed.
2. **Missed that workshop staff had no branch assigned anywhere in the
   schema.** The original `kunden` table had no column linking Tom/Rita to
   a branch, so the first draft of the branch-scoping logic had nothing to
   scope by. Had to add a `filiale_id` column to `kunden` and assign Tom to
   Neukoelln / Rita to Wedding in the seed data before the "staff only sees
   their own branch" requirement could actually be implemented.
3. **First environment setup pointed at the wrong working directory.** An
   initial attempt to wire up a dev-server preview config used the outer
   session directory instead of the cloned repo, so it silently wouldn't
   have started the right project. Noticed because the preview tooling
   didn't pick it up, and confirmed by instead starting `npm run dev`
   directly and checking its own log output before testing.
4. Every fix was verified against the actual live behaviour, not just by
   reading the diff: concurrent-request testing surfaced the exact
   3-succeed/2-rejected split expected from the race-condition fix rather
   than trusting the transaction code by inspection alone.

## What was deliberately left out in the 60 minutes

**Photo access control** (`public/uploads/`) — filenames are still
sequential and served with no ownership check, because fixing it properly
means moving uploads out of `/public` entirely, which didn't fit alongside
the five appointment/session requirements in the time available.

## One stretch item beyond the checklist

Even after every server-side check above, the hard-wired sign-in itself was
still forgeable: the account switcher wrote plain `kunde_id`/`rolle` cookies
via `document.cookie`, so anyone could open devtools and become `verwaltung`
directly, bypassing every check that trusted the session. Signed the session
cookie with HMAC-SHA256 (using the `SESSION_SECRET` that was already sitting
unused in `.env`) and moved cookie-issuing server-side (`/api/sitzung`),
which looks the role up from the database rather than trusting the client at
all. Verified live: a hand-crafted cookie with a fake signature is rejected
(403/401), even from a fully logged-out state. This was explicitly out of
the "must hold" checklist and the brief says real authentication isn't the
point - kept it scoped to *signing* the existing hard-wired identity rather
than building real registration/passwords, since that would have gone
against what was actually asked for.
