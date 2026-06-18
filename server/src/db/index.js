import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || './data/kvadrat.db';
const fullDbPath = path.resolve(process.cwd(), dbPath);

// Säkerställ att mappen existerar
const dbDir = path.dirname(fullDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const rawDb = new DatabaseSync(fullDbPath);
rawDb.exec('PRAGMA journal_mode = WAL;');
rawDb.exec('PRAGMA foreign_keys = ON;');

/**
 * Tunt kompatibilitetslager ovanpå node:sqlite så att resten av appen
 * kan använda samma API-form som better-sqlite3: db.prepare(sql).run/get/all(...).
 * Detta görs för att undvika native-kompilering (node-gyp), vilket annars
 * ofta misslyckas på de senaste Node-versionerna innan paket hunnit uppdateras.
 */
export const db = {
  prepare(sql) {
    const stmt = rawDb.prepare(sql);
    return {
      run(...args) {
        const params = normalizeParams(args);
        return stmt.run(...params);
      },
      get(...args) {
        const params = normalizeParams(args);
        return stmt.get(...params);
      },
      all(...args) {
        const params = normalizeParams(args);
        return stmt.all(...params);
      }
    };
  },
  exec(sql) {
    return rawDb.exec(sql);
  },
  transaction(fn) {
    // node:sqlite saknar ett inbyggt transaction()-hjälpverktyg likt better-sqlite3.
    // Vi simulerar samma synkrona transaktionsbeteende manuellt.
    return (...args) => {
      rawDb.exec('BEGIN');
      try {
        const result = fn(...args);
        rawDb.exec('COMMIT');
        return result;
      } catch (err) {
        rawDb.exec('ROLLBACK');
        throw err;
      }
    };
  },
  pragma(pragmaStr) {
    rawDb.exec(`PRAGMA ${pragmaStr};`);
  }
};

// node:sqlite's .run()/.get()/.all() stödjer både positionsparametrar (?)
// och namngivna parametrar (@namn), men namngivna måste skickas som ett
// enda objekt - precis som better-sqlite3. Denna funktion normaliserar
// anropsformen så befintlig kod (skriven mot better-sqlite3) fungerar oförändrat.
function normalizeParams(args) {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
    // Namngivna parametrar: better-sqlite3 tar emot dem som @namn i SQL och ett objekt {namn: ...}.
    // node:sqlite förväntar sig samma form men med nycklar prefixade med @ i objektet.
    const obj = args[0];
    const prefixed = {};
    for (const key of Object.keys(obj)) {
      prefixed[`@${key}`] = obj[key];
    }
    return [prefixed];
  }
  return args;
}

export function initSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
}

initSchema();
