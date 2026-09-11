// Server-only. Signs and verifies the session cookie so its content can only
// ever have been produced by this server - a visitor can no longer just
// write kunde_id/rolle into document.cookie and be believed.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { SESSION_SECRET } from './session-secret'

export interface SessionPayload {
  kundeId: number
  rolle: string
}

function sign(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url')
}

// Roles are short identifiers ('kunde', 'werkstatt', 'verwaltung') and must
// not contain the '.' separator. If one ever did, the token would simply
// fail to verify and the caller would be treated as anonymous - fail-closed.
export function createSessionToken({ kundeId, rolle }: SessionPayload): string {
  const payload = `${kundeId}.${rolle}`
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !SESSION_SECRET) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [kundeIdRaw, rolle, signature] = parts

  const expected = sign(`${kundeIdRaw}.${rolle}`)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  // Constant-time comparison - a plain === would leak how many leading
  // bytes of a guessed signature were correct via response timing.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const kundeId = Number(kundeIdRaw)
  if (!Number.isFinite(kundeId)) return null

  return { kundeId, rolle }
}
