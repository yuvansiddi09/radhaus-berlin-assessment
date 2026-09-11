import { cookies } from 'next/headers'

/**
 * Who is currently using the portal.
 *
 * On login the app writes the customer id into the `kunde_id` cookie, so every
 * later request knows who is asking without hitting the database again.
 */
export async function getKundeId(): Promise<number | null> {
  const store = await cookies()
  const raw = store.get('kunde_id')?.value
  if (!raw) return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}

export async function getRolle(): Promise<string> {
  const store = await cookies()
  return store.get('rolle')?.value ?? 'besucher'
}

export interface Session {
  kundeId: number | null
  rolle: string
}

export async function getSession(): Promise<Session> {
  return { kundeId: await getKundeId(), rolle: await getRolle() }
}
