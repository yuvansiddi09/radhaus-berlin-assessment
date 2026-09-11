import { DatabaseSync } from 'node:sqlite'
import { DB_PATH } from './config'

// A single process-wide handle on the SQLite file. `data/radhaus.db` is
// created by the seed script - run `npm run seed` before the first start.
let handle: DatabaseSync | null = null

function getHandle(): DatabaseSync {
  if (!handle) {
    handle = new DatabaseSync(DB_PATH)
  }
  return handle
}

type Params = readonly (string | number | null)[]

// The driver resolves writes on the next tick, exactly like the network
// client it replaced.
const tick = () => new Promise<void>((resolve) => setImmediate(resolve))

/**
 * Thin async wrapper around the SQLite handle. Every method returns a promise,
 * so the route handlers still look the way they did on the old client.
 */
export function createClient() {
  const db = getHandle()

  return {
    async query<T = Record<string, unknown>>(sql: string, params: Params = []): Promise<T[]> {
      return db.prepare(sql).all(...params) as T[]
    },

    async first<T = Record<string, unknown>>(
      sql: string,
      params: Params = []
    ): Promise<T | undefined> {
      return db.prepare(sql).get(...params) as T | undefined
    },

    async run(sql: string, params: Params = []): Promise<void> {
      await tick()
      db.prepare(sql).run(...params)
    },

    async insert(table: string, values: Record<string, string | number | null>): Promise<void> {
      await tick()
      const columns = Object.keys(values)
      const placeholders = columns.map(() => '?').join(', ')
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
      db.prepare(sql).run(...columns.map((c) => values[c]))
    },

    // Runs `fn` synchronously with no `await` in between BEGIN/COMMIT, so no
    // other request's tick can interleave between a check and the write that
    // depends on it (e.g. "count open appointments, then insert one").
    transaction<T>(fn: (raw: DatabaseSync) => T): T {
      db.exec('BEGIN IMMEDIATE')
      try {
        const result = fn(db)
        db.exec('COMMIT')
        return result
      } catch (err) {
        db.exec('ROLLBACK')
        throw err
      }
    },
  }
}

export interface Termin {
  id: number
  kunde_id: number
  filiale_id: number
  datum: string
  beschreibung: string
  status: string
}

export interface Kunde {
  id: number
  name: string
  email: string
  telefon: string
  adresse: string
  rolle: string
}

export interface Foto {
  id: number
  termin_id: number
  dateiname: string
}
