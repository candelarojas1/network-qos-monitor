import { computeStats } from '../stats';

describe('computeStats', () => {
  it('calcula min, avg, max, jitter y fallos con una sonda fallida', () => {
    const s = computeStats([10, 12, null, 11, 15]);
    expect(s.sent).toBe(5);
    expect(s.received).toBe(4);
    expect(s.min).toBe(10);
    expect(s.avg).toBe(12);
    expect(s.max).toBe(15);
    // |12-10| + |11-12| + |15-11| = 7, sobre 3 diferencias
    expect(s.jitter).toBeCloseTo(7 / 3);
    expect(s.failPct).toBe(20);
  });

  it('devuelve nulls y 100 % de fallos si ninguna sonda conecta', () => {
    const s = computeStats([null, null, null]);
    expect(s.received).toBe(0);
    expect(s.min).toBeNull();
    expect(s.avg).toBeNull();
    expect(s.max).toBeNull();
    expect(s.jitter).toBeNull();
    expect(s.failPct).toBe(100);
  });

  it('no calcula jitter con una sola sonda exitosa', () => {
    const s = computeStats([20]);
    expect(s.avg).toBe(20);
    expect(s.jitter).toBeNull();
    expect(s.failPct).toBe(0);
  });

  it('no divide por cero con una lista vacía', () => {
    expect(computeStats([]).failPct).toBe(0);
  });
});
