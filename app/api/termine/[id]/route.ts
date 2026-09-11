// app/api/termine/[id]/route.ts - change the status of a single appointment,
// and remove one from the customer view. Workshop staff only, scoped to
// their own branch; administration may act on either branch.
import { createClient } from '@/lib/db'
import { getSession } from '@/lib/session'

const ERLAUBTE_STATUS = ['offen', 'angenommen', 'in Arbeit', 'fertig']

type Db = ReturnType<typeof createClient>
type Termin = { id: number; filiale_id: number }
type Zugriff = { ok: true; termin: Termin } | { ok: false; antwort: Response }

const keinZugriff = () => Response.json({ fehler: 'Kein Zugriff' }, { status: 403 })

/**
 * Resolves the caller to the appointment they may act on.
 *
 * The role is checked *before* the appointment is loaded, so a caller who
 * may not touch appointments at all cannot tell an existing id from a
 * missing one by comparing 403 against 404.
 */
async function terminFuerZugriff(db: Db, id: string): Promise<Zugriff> {
  const { kundeId, rolle } = await getSession()

  if (rolle !== 'werkstatt' && rolle !== 'verwaltung') {
    return { ok: false, antwort: keinZugriff() }
  }

  const termin = await db.first<Termin>('select id, filiale_id from termine where id = ?', [
    Number(id),
  ])
  if (!termin) {
    return { ok: false, antwort: Response.json({ fehler: 'Termin nicht gefunden' }, { status: 404 }) }
  }

  if (rolle === 'werkstatt') {
    const mitarbeiter = await db.first<{ filiale_id: number | null }>(
      'select filiale_id from kunden where id = ?',
      [kundeId]
    )
    if (mitarbeiter?.filiale_id !== termin.filiale_id) {
      return { ok: false, antwort: keinZugriff() }
    }
  }

  return { ok: true, termin }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createClient()

  const zugriff = await terminFuerZugriff(db, id)
  if (!zugriff.ok) return zugriff.antwort

  const body = await request.json()
  if (!ERLAUBTE_STATUS.includes(body.status)) {
    return Response.json({ fehler: 'Unbekannter Status' }, { status: 400 })
  }

  await db.run('update termine set status = ? where id = ?', [body.status, zugriff.termin.id])

  return Response.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createClient()

  const zugriff = await terminFuerZugriff(db, id)
  if (!zugriff.ok) return zugriff.antwort

  // We keep the row for the accounting export and just mark it as deleted.
  // The appointment list filters this status out.
  await db.run('update termine set status = ? where id = ?', ['geloescht', zugriff.termin.id])

  return Response.json({ ok: true })
}
