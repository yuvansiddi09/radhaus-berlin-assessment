// app/api/termine/[id]/route.ts - change the status of a single appointment,
// and remove one from the customer view. Workshop staff only, scoped to
// their own branch; administration may act on either branch.
import { createClient } from '@/lib/db'
import { getSession } from '@/lib/session'

const ERLAUBTE_STATUS = ['offen', 'angenommen', 'in Arbeit', 'fertig']

async function terminFuerRolleLaden(db: ReturnType<typeof createClient>, id: number) {
  return db.first<{ id: number; filiale_id: number }>(
    'select id, filiale_id from termine where id = ?',
    [id]
  )
}

async function darfBearbeiten(rolle: string, kundeId: number | null, filialeId: number) {
  if (rolle === 'verwaltung') return true
  if (rolle !== 'werkstatt' || !kundeId) return false
  const db = createClient()
  const mitarbeiter = await db.first<{ filiale_id: number | null }>(
    'select filiale_id from kunden where id = ?',
    [kundeId]
  )
  return mitarbeiter?.filiale_id === filialeId
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { kundeId, rolle } = await getSession()
  const body = await request.json()
  const db = createClient()

  if (!ERLAUBTE_STATUS.includes(body.status)) {
    return Response.json({ fehler: 'Unbekannter Status' }, { status: 400 })
  }

  const termin = await terminFuerRolleLaden(db, Number(id))
  if (!termin) {
    return Response.json({ fehler: 'Termin nicht gefunden' }, { status: 404 })
  }
  if (!(await darfBearbeiten(rolle, kundeId, termin.filiale_id))) {
    return Response.json({ fehler: 'Kein Zugriff' }, { status: 403 })
  }

  await db.run('update termine set status = ? where id = ?', [body.status, termin.id])

  return Response.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { kundeId, rolle } = await getSession()
  const db = createClient()

  const termin = await terminFuerRolleLaden(db, Number(id))
  if (!termin) {
    return Response.json({ fehler: 'Termin nicht gefunden' }, { status: 404 })
  }
  if (!(await darfBearbeiten(rolle, kundeId, termin.filiale_id))) {
    return Response.json({ fehler: 'Kein Zugriff' }, { status: 403 })
  }

  // We keep the row for the accounting export and just mark it as deleted.
  // The appointment list filters this status out.
  await db.run('update termine set status = ? where id = ?', ['geloescht', termin.id])

  return Response.json({ ok: true })
}
