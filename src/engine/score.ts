// Puntaje de calidad de 0 a 100 que se dibuja en el mapa.
// Cada métrica se lleva a 0-100 con una recta entre un valor "bueno" y uno "malo",
// y después se combinan con pesos fijos.

export type ScoreInput = {
  rttAvg: number | null;
  jitter: number | null;
  failPct: number;
  downMbps: number | null;
};

// Valores elegidos con criterios de experiencia de usuario:
// por debajo de 50 ms la latencia no se nota; por encima de 500 ms la navegación se vuelve lenta.
const RTT_GOOD = 50;
const RTT_BAD = 500;
// Jitter menor a 5 ms es estable; desde 100 ms una llamada de voz se corta.
const JITTER_GOOD = 5;
const JITTER_BAD = 100;
// 25 Mbps alcanza para video en alta definición.
const DOWN_GOOD = 25;

// 100 cuando value <= good, 0 cuando value >= bad, lineal en el medio.
function lowerIsBetter(value: number, good: number, bad: number): number {
  if (value <= good) return 100;
  if (value >= bad) return 0;
  return ((bad - value) / (bad - good)) * 100;
}

export function qualityScore({ rttAvg, jitter, failPct, downMbps }: ScoreInput): number {
  // Sin ninguna sonda exitosa no hay conexión utilizable.
  if (rttAvg === null) return 0;

  const rtt = lowerIsBetter(rttAvg, RTT_GOOD, RTT_BAD);
  const jit = jitter === null ? rtt : lowerIsBetter(jitter, JITTER_GOOD, JITTER_BAD);
  const loss = 100 - failPct;

  // La bajada solo se mide cada N mediciones; cuando no hay dato se reparte su peso.
  if (downMbps === null) {
    return Math.round(rtt * 0.5 + jit * 0.2 + loss * 0.3);
  }
  const down = Math.min(downMbps / DOWN_GOOD, 1) * 100;
  return Math.round(rtt * 0.4 + jit * 0.15 + loss * 0.25 + down * 0.2);
}
