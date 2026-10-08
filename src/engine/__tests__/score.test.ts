import { qualityScore } from '../score';

describe('qualityScore', () => {
  it('da 100 a una conexión ideal', () => {
    expect(qualityScore({ rttAvg: 8, jitter: 2, failPct: 0 })).toBe(100);
  });

  it('da 0 sin conexión', () => {
    expect(qualityScore({ rttAvg: null, jitter: null, failPct: 100 })).toBe(0);
  });

  it('baja con más latencia, jitter y fallos', () => {
    const good = qualityScore({ rttAvg: 48, jitter: 15, failPct: 0 });
    const bad = qualityScore({ rttAvg: 400, jitter: 80, failPct: 40 });
    expect(good).toBeGreaterThan(bad);
    expect(bad).toBe(33);
  });

  it('se mantiene entre 0 y 100 con valores extremos', () => {
    const s = qualityScore({ rttAvg: 5000, jitter: 1000, failPct: 90 });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });

  it('usa el puntaje de RTT como jitter cuando no hay jitter', () => {
    // RTT 275 ms -> 50 puntos; sin jitter se repite 50; sin fallos -> 100
    expect(qualityScore({ rttAvg: 275, jitter: null, failPct: 0 })).toBe(65);
  });
});
