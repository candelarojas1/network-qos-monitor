import { toMbps } from '../throughput';

describe('toMbps', () => {
  it('convierte bytes y milisegundos a megabits por segundo', () => {
    // 2.000.000 bytes en 1 s = 16.000.000 bits/s = 16 Mbps
    expect(toMbps(2_000_000, 1000)).toBe(16);
  });

  it('con el doble de tiempo da la mitad', () => {
    expect(toMbps(2_000_000, 2000)).toBe(8);
  });

  it('devuelve 0 si el tiempo no es positivo', () => {
    expect(toMbps(1000, 0)).toBe(0);
    expect(toMbps(1000, -5)).toBe(0);
  });
});
