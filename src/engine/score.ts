// Puntaje de calidad de 0 a 100 que se dibuja en el mapa.
// Usa solo métricas que se miden en todas las mediciones (latencia, jitter y fallos TCP),
// así los puntos del mapa son comparables entre sí. El throughput se muestra aparte,
// porque se mide solo cada N mediciones.

export type ScoreInput = {
  rttAvg: number | null;
  jitter: number | null;
  failPct: number;
};

// Por debajo de 50 ms la latencia no se nota; por encima de 500 ms la navegación se vuelve lenta.
const RTT_GOOD = 50;
const RTT_BAD = 500;
// Jitter menor a 5 ms es estable; desde 100 ms una llamada de voz se corta.
const JITTER_GOOD = 5;
const JITTER_BAD = 100;

// 100 cuando value <= good, 0 cuando value >= bad, lineal en el medio.
function lowerIsBetter(value: number, good: number, bad: number): number {
  if (value <= good) return 100;
  if (value >= bad) return 0;
  return ((bad - value) / (bad - good)) * 100;
}

export function qualityScore({ rttAvg, jitter, failPct }: ScoreInput): number {
  // Sin ninguna sonda exitosa no hay conexión utilizable.
  if (rttAvg === null) return 0;

  const rtt = lowerIsBetter(rttAvg, RTT_GOOD, RTT_BAD);
  // Con una sola sonda exitosa no hay jitter: se usa el puntaje de RTT para no premiar ni castigar.
  const jit = jitter === null ? rtt : lowerIsBetter(jitter, JITTER_GOOD, JITTER_BAD);
  const loss = 100 - failPct;

  return Math.round(rtt * 0.5 + jit * 0.2 + loss * 0.3);
}
