// app/api/termine/route.ts - list and create the caller's own workshop
// appointments.
//
// Identity always comes from the session (cookie), never from the request
// body - a client-supplied kundeId cannot be trusted. See CLAUDE.md.
import { createClient } from '@/lib/db'
import { getSession } from '@/lib/session'
import { FILIALEN } from '@/lib/config'

export async function GET() {
  try {
    const { kundeId } = await getSession()
    if (!kundeId) {
      return Response.json({ fehler: 'Nicht angemeldet' }, { status: 401 })
    }

    const db = createClient()
    const termine = await db.query(
      `select * from termine where kunde_id = ? and status <> 'geloescht' order by datum desc`,
      [kundeId]
    )
    return Response.json({ termine })
  } catch (error) {
    console.error('Fehler beim Laden der Termine:', error)
    return Response.json({ fehler: 'Termine konnten nicht geladen werden' }, { status: 500 })
  }
}

const FILIALE_IDS = new Set<number>(FILIALEN.map((f) => f.id))

export async function POST(request: Request) {
  try {
    const { kundeId, rolle } = await getSession()
    if (!kundeId || rolle !== 'kunde') {
      return Response.json({ fehler: 'Nicht angemeldet' }, { status: 401 })
    }

    const body = await request.json()

    const filialeId = Number(body.filialeId)
    const datum = String(body.datum ?? '').trim()
    const beschreibung = String(body.beschreibung ?? '').trim()

    if (!FILIALE_IDS.has(filialeId) || !datum || !beschreibung) {
      return Response.json(
        { fehler: 'filialeId, datum und beschreibung sind erforderlich' },
        { status: 400 }
      )
    }

    const db = createClient()

    // Check-then-insert has to be one atomic step (no `await` in between),
    // otherwise two requests fired at the same time can both read "2 open"
    // and both insert - a 3rd and a 4th appointment. kundeId comes from the
    // session above, never from `body`, so this can only ever count and
    // insert against the caller's own appointments.
    const erlaubt = db.transaction((raw) => {
      const offene = raw
        .prepare(`select count(*) as n from termine where kunde_id = ? and status = 'offen'`)
        .get(kundeId) as { n: number }

      if (offene.n >= 3) return false

      raw
        .prepare(
          `insert into termine (kunde_id, filiale_id, datum, beschreibung, status)
           values (?, ?, ?, ?, 'offen')`
        )
        .run(kundeId, filialeId, datum, beschreibung)
      return true
    })

    if (!erlaubt) {
      return Response.json({ fehler: 'Maximal 3 offene Termine' }, { status: 400 })
    }

    return Response.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Fehler beim Erstellen des Termins:', error)
    return Response.json({ fehler: 'Termin konnte nicht erstellt werden' }, { status: 500 })
  }
}
