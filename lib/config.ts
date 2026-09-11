/**
 * Central application configuration for the Radhaus booking portal.
 */

// Path to the SQLite file. Created by data/seed.mjs (`npm run seed`).
export const DB_PATH = 'data/radhaus.db'

// Directory the customer photos are stored in.
export const UPLOAD_DIR = 'public/uploads'

// The two branches of Radhaus Berlin.
export const FILIALEN = [
  { id: 1, name: 'Neukoelln' },
  { id: 2, name: 'Wedding' },
] as const
