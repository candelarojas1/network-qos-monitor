import { getDb } from './database';

export type LocationSource = 'gps' | 'last_known' | 'none';
export type MeasurementSource = 'session' | 'background';

export type Measurement = {
  id: number;
  session_id: number | null;
  ts: number;
  lat: number | null;
  lng: number | null;
  location_source: LocationSource;
  net_type: string;
  generation: string | null;
  radio_tech: string | null;
  carrier: string | null;
  rtt_min: number | null;
  rtt_avg: number | null;
  rtt_max: number | null;
  jitter: number | null;
  fail_pct: number;
  down_mbps: number | null;
  up_mbps: number | null;
  score: number;
  source: MeasurementSource;
};

export type NewMeasurement = Omit<Measurement, 'id'>;

export type SessionSummary = {
  id: number;
  started_at: number;
  ended_at: number | null;
  count: number;
  avg_score: number | null;
};

export async function createSession(startedAt: number): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync('INSERT INTO sessions (started_at) VALUES (?)', startedAt);
  return res.lastInsertRowId;
}

export async function endSession(id: number, endedAt: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sessions SET ended_at = ? WHERE id = ?', endedAt, id);
}

export async function insertMeasurement(m: NewMeasurement): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    `INSERT INTO measurements (
      session_id, ts, lat, lng, location_source, net_type, generation, radio_tech, carrier,
      rtt_min, rtt_avg, rtt_max, jitter, fail_pct, down_mbps, up_mbps, score, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    m.session_id, m.ts, m.lat, m.lng, m.location_source, m.net_type, m.generation, m.radio_tech,
    m.carrier, m.rtt_min, m.rtt_avg, m.rtt_max, m.jitter, m.fail_pct, m.down_mbps, m.up_mbps,
    m.score, m.source,
  );
  return res.lastInsertRowId;
}

export async function listSessions(): Promise<SessionSummary[]> {
  const db = await getDb();
  return db.getAllAsync<SessionSummary>(
    `SELECT s.id, s.started_at, s.ended_at, COUNT(m.id) AS count, AVG(m.score) AS avg_score
     FROM sessions s LEFT JOIN measurements m ON m.session_id = s.id
     GROUP BY s.id ORDER BY s.started_at DESC`,
  );
}

export async function listSessionMeasurements(sessionId: number): Promise<Measurement[]> {
  const db = await getDb();
  return db.getAllAsync<Measurement>(
    'SELECT * FROM measurements WHERE session_id = ? ORDER BY ts ASC',
    sessionId,
  );
}

// Mediciones con coordenadas, para el mapa. Las que no tienen ubicación no se dibujan.
export async function listMappedMeasurements(): Promise<Measurement[]> {
  const db = await getDb();
  return db.getAllAsync<Measurement>(
    'SELECT * FROM measurements WHERE lat IS NOT NULL AND lng IS NOT NULL ORDER BY ts ASC',
  );
}

export async function countUnmappedMeasurements(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM measurements WHERE lat IS NULL OR lng IS NULL',
  );
  return row?.n ?? 0;
}

// Mediciones de la tarea en segundo plano (no pertenecen a ninguna sesión), las más nuevas primero.
export async function listBackgroundMeasurements(): Promise<Measurement[]> {
  const db = await getDb();
  return db.getAllAsync<Measurement>(
    "SELECT * FROM measurements WHERE source = 'background' ORDER BY ts DESC",
  );
}
