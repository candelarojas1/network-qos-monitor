const pad = (n: number) => String(n).padStart(2, '0');

// Ej.: "07/10 21:35"
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Ej.: "21:35:12"
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Ej.: "3 min 20 s"
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return min > 0 ? `${min} min ${sec} s` : `${sec} s`;
}
