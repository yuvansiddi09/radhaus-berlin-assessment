# D2 — Handover notes

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

**The photo IDOR** (`public/uploads/foto-104x.svg`, sequential filenames,
served statically with no ownership check) — fixing it properly means moving
uploads out of `/public` entirely and serving them through an authenticated,
ownership-checked route, which is a bigger structural change than the time
budget allowed alongside the five appointment/session requirements.
