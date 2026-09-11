import { cookies } from 'next/headers'
import { verifySessionToken } from './session-token'

/**
 * Who is currently using the portal.
 *
 * The `session` cookie is a signed token (see lib/session-token.ts and
 * app/api/sitzung/route.ts) - it can only have been produced by this server,
 * so a visitor can no longer just write an id/role into document.cookie by
 * hand and be believed.
 */
export interface Session {
  kundeId: number | null
  rolle: string
}

export async function getSession(): Promise<Session> {
  const store = await cookies()
  const verified = verifySessionToken(store.get('session')?.value)
  if (!verified) return { kundeId: null, rolle: 'besucher' }
  return verified
}

export async function getKundeId(): Promise<number | null> {
  return (await getSession()).kundeId
}

export async function getRolle(): Promise<string> {
  return (await getSession()).rolle
}
