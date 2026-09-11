# D0 — Code reading notes

Name: Yuvan Siddi

Findings on `app/api/termine/route.ts`, worst first:

1. **No authentication/authorization at all.** `GET` returns *every*
   appointment in the system to any caller, and `POST` takes `kundeId`
   straight from the request body — anyone can create (or, via the 3-open
   count, probe) appointments for any customer. Should derive the customer
   from the session (cookie), never from the body.
2. **SQL injection.** `` `select * from termine where kunde_id = '${kundeId}'` ``
   interpolates a client-controlled value directly into SQL. Should be a
   parameterized query (`where kunde_id = ?`, `[kundeId]`).
3. **Race condition on the business rule.** The "max 3 open appointments"
   check and the insert are two separate awaited calls (`db.query` then
   `db.insert`), with a real tick between them (see `lib/db.ts`). Two
   concurrent requests can both read "2 open" and both insert, exceeding the
   limit. Needs to be one atomic check-and-insert (e.g. a transaction).
4. **No input validation.** `filialeId`, `datum`, `beschreibung` are used
   unchecked — an unknown branch id or empty description is accepted.
5. **Minor:** `GET` has no filter at all, not even a `status <> 'geloescht'`
   exclusion — deleted appointments would still show up if this endpoint
   were used to list anything.
