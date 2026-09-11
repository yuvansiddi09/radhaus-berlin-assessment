'use client'

import { useRouter } from 'next/navigation'

// Login is hard-wired for this exercise environment: pick an account and the
// portal treats you as that person. The client only ever sends *which*
// account id to become - the server looks up that account's real role in
// the database and issues a signed cookie for it (see /api/sitzung). The
// browser can no longer just declare its own role.
const KONTEN = [
  { id: 0, label: 'Nicht angemeldet' },
  { id: 1, label: 'Mira Sandberg (Kundin)' },
  { id: 2, label: 'Jonas Kreft (Kunde)' },
  { id: 3, label: 'Ayse Demirel (Kundin)' },
  { id: 4, label: 'Tom Baumgart (Werkstatt)' },
  { id: 5, label: 'Rita Ohlsen (Werkstatt)' },
  { id: 6, label: 'Katrin Lubitz (Verwaltung)' },
]

export default function Benutzerwechsel({ aktiv }: { aktiv: number }) {
  const router = useRouter()

  async function wechseln(id: number) {
    await fetch('/api/sitzung', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kontoId: id }),
    })
    router.refresh()
  }

  return (
    <select
      aria-label="Angemeldet als"
      value={aktiv}
      onChange={(e) => wechseln(Number(e.target.value))}
      style={{ width: 'auto', marginBottom: 0, fontSize: 13 }}
    >
      {KONTEN.map((k) => (
        <option key={k.id} value={k.id}>
          {k.label}
        </option>
      ))}
    </select>
  )
}
