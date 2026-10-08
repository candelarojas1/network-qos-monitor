// Estadísticas de una serie de sondas TCP. Cada valor es un RTT en ms, o null si la sonda falló.
export type PingStats = {
  sent: number;
  received: number;
  min: number | null;
  avg: number | null;
  max: number | null;
  // Promedio de la diferencia absoluta entre RTT consecutivos que conectaron.
  jitter: number | null;
  // Porcentaje de sondas que no conectaron antes del timeout (estimación de pérdida).
  failPct: number;
};

export function computeStats(samples: (number | null)[]): PingStats {
  const ok = samples.filter((s): s is number => s !== null);
  const sent = samples.length;
  const failPct = sent === 0 ? 0 : ((sent - ok.length) / sent) * 100;

  if (ok.length === 0) {
    return { sent, received: 0, min: null, avg: null, max: null, jitter: null, failPct };
  }

  let jitter: number | null = null;
  if (ok.length > 1) {
    let sum = 0;
    for (let i = 1; i < ok.length; i++) sum += Math.abs(ok[i] - ok[i - 1]);
    jitter = sum / (ok.length - 1);
  }

  return {
    sent,
    received: ok.length,
    min: Math.min(...ok),
    avg: ok.reduce((a, b) => a + b, 0) / ok.length,
    max: Math.max(...ok),
    jitter,
    failPct,
  };
}
