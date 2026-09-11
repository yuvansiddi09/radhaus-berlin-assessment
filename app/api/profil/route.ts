// app/api/profil/route.ts - customers maintain their own contact details here.
import { createClient } from '@/lib/db'
import { getKundeId } from '@/lib/session'

// Deliberately excludes 'rolle' - a customer editing their own profile must
// never be able to grant themselves a different role.
const FELDER = ['name', 'email', 'telefon', 'adresse']

export async function GET() {
  const kundeId = await getKundeId()
  if (!kundeId) {
    return Response.json({ fehler: 'Nicht angemeldet' }, { status: 401 })
  }

  const db = createClient()
  const profil = await db.first('select * from kunden where id = ?', [kundeId])
  return Response.json({ profil })
}

export async function PATCH(request: Request) {
  const kundeId = await getKundeId()
  if (!kundeId) {
    return Response.json({ fehler: 'Nicht angemeldet' }, { status: 401 })
  }

  const body = await request.json()
  const db = createClient()

  for (const feld of FELDER) {
    if (body[feld] !== undefined) {
      await db.run(`update kunden set ${feld} = ? where id = ?`, [String(body[feld]), kundeId])
    }
  }

  return Response.json({ ok: true })
}
