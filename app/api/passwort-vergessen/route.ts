// app/api/passwort-vergessen/route.ts - request a password reset mail.
import { createClient } from '@/lib/db'

export async function POST(request: Request) {
  const body = await request.json()
  const db = createClient()

  await db.first('select id, email from kunden where email = ?', [String(body.email ?? '')])

  // Always the same response, whether or not the address exists - otherwise
  // this endpoint lets anyone check which email addresses are registered.
  // In this exercise environment no mail is actually sent.
  return Response.json({
    ok: true,
    meldung: 'Falls diese E-Mail-Adresse bei uns registriert ist, haben wir dir eine E-Mail geschickt.',
  })
}
