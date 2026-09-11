import ProfilFormular from './ProfilFormular'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function Profil() {
  // Same reasoning as app/werkstatt/page.tsx: key the client component off
  // the session so switching accounts remounts (and refetches) it.
  const { kundeId, rolle } = await getSession()

  return (
    <>
      <h1>Mein Profil</h1>
      <p className="lead">Adresse und Telefonnummer pflegst du hier selbst.</p>
      <ProfilFormular key={`${kundeId}-${rolle}`} />
    </>
  )
}
