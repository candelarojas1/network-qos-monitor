import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';

import Telephony from '../../modules/telephony';
import { checkDegradation } from '@/background/degradation';
import {
  insertMeasurement,
  type LocationSource,
  type MeasurementSource,
  type NewMeasurement,
} from '@/db/measurements';
import { getRecentFix } from '@/geo/location-updates';
import { MB, loadSettings } from '@/store/settings-store';
import { pingHosts, type HostResult } from './ping';
import { qualityScore } from './score';
import { measureThroughput, warmUp } from './throughput';

// Resume los 3 hosts en una sola fila: mínimo de los mínimos, promedio de los promedios,
// máximo de los máximos, promedio de los jitter y fallos sobre el total de sondas.
export function aggregateHosts(results: HostResult[]) {
  const ok = results.filter((r) => r.stats.avg !== null);
  const sent = results.reduce((a, r) => a + r.stats.sent, 0);
  const received = results.reduce((a, r) => a + r.stats.received, 0);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const jitters = ok.map((r) => r.stats.jitter).filter((j): j is number => j !== null);

  return {
    rttMin: ok.length ? Math.min(...ok.map((r) => r.stats.min!)) : null,
    rttAvg: mean(ok.map((r) => r.stats.avg!)),
    rttMax: ok.length ? Math.max(...ok.map((r) => r.stats.max!)) : null,
    jitter: mean(jitters),
    failPct: sent === 0 ? 100 : ((sent - received) / sent) * 100,
  };
}

type Position = { lat: number | null; lng: number | null; source: LocationSource };

// "current": posición de la sesión o GPS actual, con respaldo en la última conocida.
// "last_known": solo la última conocida (tarea en segundo plano, donde no se pide GPS nuevo).
export async function getPosition(mode: 'current' | 'last_known'): Promise<Position> {
  if (mode === 'current') {
    // Durante una sesión, la tarea de ubicación ya tiene una posición fresca.
    const fix = getRecentFix(15_000);
    if (fix) return { lat: fix.lat, lng: fix.lng, source: 'gps' };
    try {
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((r) => setTimeout(() => r(null), 10_000)),
      ]);
      if (pos) return { lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps' };
    } catch {
      // sin permiso o sin señal GPS: se intenta con la última conocida
    }
  }
  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) return { lat: last.coords.latitude, lng: last.coords.longitude, source: 'last_known' };
  } catch {
    // sin permiso
  }
  return { lat: null, lng: null, source: 'none' };
}

type MeasureOptions = {
  sessionId: number | null;
  source: MeasurementSource;
  withThroughput: boolean;
};

// Una medición completa. Ping y GPS corren en paralelo; el throughput va después
// para que no compita con las sondas de latencia.
export async function takeMeasurement({ sessionId, source, withThroughput }: MeasureOptions): Promise<NewMeasurement> {
  // En un arranque en segundo plano los ajustes todavía no se leyeron de SQLite.
  const settings = await loadSettings();
  const ts = Date.now();

  const [net, pos, hostResults] = await Promise.all([
    NetInfo.fetch(),
    getPosition(source === 'background' ? 'last_known' : 'current'),
    pingHosts(settings.hosts),
  ]);
  const cellular = Telephony.getCellularInfo();
  const agg = aggregateHosts(hostResults);

  let downMbps: number | null = null;
  let upMbps: number | null = null;
  if (withThroughput && agg.rttAvg !== null) {
    try {
      await warmUp(settings.backendUrl);
      const t = await measureThroughput(settings.backendUrl, settings.downloadMB * MB, settings.uploadMB * MB);
      downMbps = t.downMbps;
      upMbps = t.upMbps;
    } catch {
      // si el backend no responde, la medición se guarda igual sin throughput
    }
  }

  const m: NewMeasurement = {
    session_id: sessionId,
    ts,
    lat: pos.lat,
    lng: pos.lng,
    location_source: pos.source,
    net_type: net.type,
    generation: cellular.generation,
    radio_tech: cellular.radioTech,
    carrier: cellular.carrier,
    rtt_min: agg.rttMin,
    rtt_avg: agg.rttAvg,
    rtt_max: agg.rttMax,
    jitter: agg.jitter,
    fail_pct: agg.failPct,
    down_mbps: downMbps,
    up_mbps: upMbps,
    score: qualityScore({ rttAvg: agg.rttAvg, jitter: agg.jitter, failPct: agg.failPct }),
    source,
  };
  await insertMeasurement(m);
  // Si la notificación falla (por ejemplo, sin permiso), la medición ya quedó guardada.
  await checkDegradation(m).catch(() => {});
  return m;
}
