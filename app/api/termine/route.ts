// app/api/termine/route.ts - list and create the caller's own workshop
// appointments.
import { createClient } from '@/lib/db'
import { getSession } from '@/lib/session'
import { FILIALEN } from '@/lib/config'

export async function GET() {
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
}

const FILIALE_IDS = new Set<number>(FILIALEN.map((f) => f.id))

export async function POST(request: Request) {
  const { kundeId, rolle } = await getSession()
  if (!kundeId || rolle !== 'kunde') {
    return Response.json({ fehler: 'Nicht angemeldet' }, { status: 401 })
  }

  const body = await request.json()

  const filialeId = Number(body.filialeId)
  const datum = String(body.datum ?? '').trim()
  const beschreibung = String(body.beschreibung ?? '').trim()

  if (!FILIALE_IDS.has(filialeId) || !datum || !beschreibung) {
    return Response.json({ fehler: 'Ungueltige Eingabe' }, { status: 400 })
  }

  const db = createClient()

  // Check-then-insert has to be one atomic step, otherwise two requests
  // fired at the same time can both read "2 open" and both insert a 3rd,
  // and a 4th, appointment.
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

  return Response.json({ ok: true })
}
