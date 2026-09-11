import Terminuebersicht from './Terminuebersicht'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function Werkstatt() {
  // Terminuebersicht is a client component that fetches once on mount.
  // Switching accounts calls router.refresh(), which re-renders this server
  // component but does not by itself remount a client child. Keying it off
  // the session forces React to remount (and therefore refetch) whenever the
  // signed-in account changes.
  const { kundeId, rolle } = await getSession()

  return (
    <>
      <h1>Werkstatt</h1>
      <p className="lead">
        Alle Termine beider Filialen. Status aendern, sobald ein Rad angenommen, in Arbeit oder
        fertig ist.
      </p>
      <Terminuebersicht key={`${kundeId}-${rolle}`} />
    </>
  )
}
