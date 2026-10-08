import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Una sola conexión para toda la app. Las tablas se crean la primera vez.
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('qos.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at INTEGER NOT NULL,
          ended_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS measurements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER REFERENCES sessions(id),
          ts INTEGER NOT NULL,
          lat REAL,
          lng REAL,
          location_source TEXT NOT NULL,
          net_type TEXT NOT NULL,
          generation TEXT,
          radio_tech TEXT,
          carrier TEXT,
          rtt_min REAL,
          rtt_avg REAL,
          rtt_max REAL,
          jitter REAL,
          fail_pct REAL NOT NULL,
          down_mbps REAL,
          up_mbps REAL,
          score REAL NOT NULL,
          source TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_measurements_session ON measurements(session_id);
        CREATE INDEX IF NOT EXISTS idx_measurements_ts ON measurements(ts);
      `);
      return db;
    })();
  }
  return dbPromise;
}
