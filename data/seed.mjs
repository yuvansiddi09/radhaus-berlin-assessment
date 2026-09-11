// Creates the example database data/radhaus.db for the Radhaus Berlin
// workshop booking portal.
//
// Run with:  npm run seed
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('data/radhaus.db')

db.exec(`
  DROP TABLE IF EXISTS fotos;
  DROP TABLE IF EXISTS termine;
  DROP TABLE IF EXISTS kunden;
  DROP TABLE IF EXISTS filialen;
  DROP TABLE IF EXISTS preisliste;

  CREATE TABLE filialen (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    adresse         TEXT NOT NULL,
    oeffnungszeiten TEXT NOT NULL
  );

  CREATE TABLE kunden (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    passwort_hash TEXT NOT NULL,
    telefon       TEXT NOT NULL DEFAULT '',
    adresse       TEXT NOT NULL DEFAULT '',
    rolle         TEXT NOT NULL DEFAULT 'kunde',
    filiale_id    INTEGER REFERENCES filialen(id)
  );

  CREATE TABLE termine (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    kunde_id     INTEGER NOT NULL,
    filiale_id   INTEGER NOT NULL,
    datum        TEXT NOT NULL,
    beschreibung TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'offen'
  );

  CREATE TABLE fotos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    termin_id INTEGER NOT NULL,
    dateiname TEXT NOT NULL
  );

  CREATE TABLE preisliste (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    leistung  TEXT NOT NULL,
    preis_eur TEXT NOT NULL
  );
`)

const filialen = [
  ['Neukoelln', 'Sonnenallee 112, 12045 Berlin', 'Mo-Fr 09:00-18:00, Sa 10:00-14:00'],
  ['Wedding', 'Muellerstrasse 47, 13349 Berlin', 'Mo-Fr 10:00-19:00'],
]
const insertFiliale = db.prepare(
  'INSERT INTO filialen (name, adresse, oeffnungszeiten) VALUES (?, ?, ?)'
)
for (const f of filialen) insertFiliale.run(...f)

// All accounts below are fictional. The password hashes are placeholders -
// this is an exercise environment, not a real system.
const kunden = [
  ['Mira Sandberg', 'mira.sandberg@example.org', 'hash$mira', '030 5512300', 'Weserstr. 8, 12047 Berlin', 'kunde', null],
  ['Jonas Kreft', 'jonas.kreft@example.org', 'hash$jonas', '030 5512301', 'Pankstr. 21, 13357 Berlin', 'kunde', null],
  ['Ayse Demirel', 'ayse.demirel@example.org', 'hash$ayse', '030 5512302', 'Hermannstr. 4, 12049 Berlin', 'kunde', null],
  ['Tom Baumgart', 'tom.baumgart@radhaus.local', 'hash$tom', '030 5512400', '', 'werkstatt', 1],
  ['Rita Ohlsen', 'rita.ohlsen@radhaus.local', 'hash$rita', '030 5512401', '', 'werkstatt', 2],
  ['Katrin Lubitz', 'katrin.lubitz@radhaus.local', 'hash$katrin', '030 5512500', '', 'verwaltung', null],
]
const insertKunde = db.prepare(
  'INSERT INTO kunden (name, email, passwort_hash, telefon, adresse, rolle, filiale_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
)
for (const k of kunden) insertKunde.run(...k)

const termine = [
  [1, 1, '2026-09-14', 'Schaltung springt beim Hochschalten', 'offen'],
  [1, 1, '2026-09-21', 'Bremsbelaege hinten wechseln', 'angenommen'],
  [2, 2, '2026-09-15', 'Platten am Vorderrad, Schlauch defekt', 'in Arbeit'],
  [2, 2, '2026-08-30', 'Jahresinspektion', 'fertig'],
  [3, 1, '2026-09-16', 'Licht vorne ohne Funktion', 'offen'],
  [3, 2, '2026-09-02', 'Kette gerissen', 'geloescht'],
]
const insertTermin = db.prepare(
  'INSERT INTO termine (kunde_id, filiale_id, datum, beschreibung, status) VALUES (?, ?, ?, ?, ?)'
)
for (const t of termine) insertTermin.run(...t)

const fotos = [
  [1, 'foto-1041.svg'],
  [3, 'foto-1042.svg'],
  [5, 'foto-1043.svg'],
]
const insertFoto = db.prepare('INSERT INTO fotos (termin_id, dateiname) VALUES (?, ?)')
for (const f of fotos) insertFoto.run(...f)

const preise = [
  ['Inspektion klein', '49,00'],
  ['Inspektion gross', '89,00'],
  ['Schlauch wechseln', '19,50'],
  ['Bremsbelaege wechseln', '29,00'],
  ['Schaltung einstellen', '24,00'],
]
const insertPreis = db.prepare('INSERT INTO preisliste (leistung, preis_eur) VALUES (?, ?)')
for (const p of preise) insertPreis.run(...p)

const n = db.prepare('SELECT COUNT(*) AS n FROM termine').get()
console.log(
  `Seed complete: ${filialen.length} branches, ${kunden.length} accounts, ${n.n} appointments.`
)
db.close()
