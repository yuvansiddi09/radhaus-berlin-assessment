// app/api/termine/alle/route.ts - full appointment list across both
// branches, for the nightly reminder/accounting job only. Not used by the
// browser - the workshop UI calls /api/termine/werkstatt with its session
// instead, so this key never has to reach client-side code.
import { createClient } from '@/lib/db'
import { SERVICE_KEY } from '@/lib/service-key'

export async function GET(request: Request) {
  if (!SERVICE_KEY || request.headers.get('x-service-key') !== SERVICE_KEY) {
    return Response.json({ fehler: 'Kein Zugriff' }, { status: 401 })
  }

  const db = createClient()
  const termine = await db.query(
    `select t.id, t.datum, t.beschreibung, t.status, t.kunde_id,
            f.name as filiale, k.name as kunde, k.email as kunde_email
       from termine t
       join filialen f on f.id = t.filiale_id
       join kunden   k on k.id = t.kunde_id
      order by t.datum desc`
  )

  return Response.json({ termine })
}
