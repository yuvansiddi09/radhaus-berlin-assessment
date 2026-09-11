// app/api/termine/werkstatt/route.ts - appointment list for the workshop
// view. Workshop staff see only their own branch; administration sees both.
// Identity comes from the session cookie, same as every other route here -
// never from a header or a shared key the browser could carry around.
import { createClient } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const { kundeId, rolle } = await getSession()

  if (rolle !== 'werkstatt' && rolle !== 'verwaltung') {
    return Response.json({ fehler: 'Kein Zugriff' }, { status: 403 })
  }

  const db = createClient()

  let filialeId: number | null = null
  if (rolle === 'werkstatt') {
    const mitarbeiter = await db.first<{ filiale_id: number | null }>(
      'select filiale_id from kunden where id = ?',
      [kundeId]
    )
    filialeId = mitarbeiter?.filiale_id ?? null
    if (!filialeId) {
      return Response.json({ termine: [] })
    }
  }

  const termine = await db.query(
    `select t.id, t.datum, t.beschreibung, t.status, t.kunde_id,
            f.name as filiale, k.name as kunde, k.email as kunde_email
       from termine t
       join filialen f on f.id = t.filiale_id
       join kunden   k on k.id = t.kunde_id
      where t.status <> 'geloescht'
        ${filialeId ? 'and t.filiale_id = ?' : ''}
      order by t.datum desc`,
    filialeId ? [filialeId] : []
  )

  return Response.json({ termine })
}
