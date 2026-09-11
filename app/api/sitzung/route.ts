// app/api/sitzung/route.ts - issues the signed session cookie for the
// exercise's hard-wired sign-in. The client may only ever pick *which* of
// the six real accounts to become; the role is looked up here from the
// database, never taken from the client. See lib/session-token.ts.
import { cookies } from 'next/headers'
import { createClient } from '@/lib/db'
import { createSessionToken } from '@/lib/session-token'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const kontoId = Number(body.kontoId)
  const store = await cookies()

  if (!kontoId) {
    store.delete('session')
    return Response.json({ ok: true })
  }

  const db = createClient()
  const konto = await db.first<{ id: number; rolle: string }>(
    'select id, rolle from kunden where id = ?',
    [kontoId]
  )

  if (!konto) {
    return Response.json({ fehler: 'Unbekanntes Konto' }, { status: 400 })
  }

  store.set('session', createSessionToken({ kundeId: konto.id, rolle: konto.rolle }), {
    path: '/',
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    sameSite: 'lax',
  })

  return Response.json({ ok: true })
}
