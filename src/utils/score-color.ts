// Color del puntaje: rojo (0) -> amarillo (50) -> verde (100).
const RED = [220, 38, 38];
const YELLOW = [234, 179, 8];
const GREEN = [22, 163, 74];

function mix(a: number[], b: number[], t: number) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

export function scoreColor(score: number, alpha = 1): string {
  const s = Math.max(0, Math.min(100, score));
  const [r, g, b] = s < 50 ? mix(RED, YELLOW, s / 50) : mix(YELLOW, GREEN, (s - 50) / 50);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
