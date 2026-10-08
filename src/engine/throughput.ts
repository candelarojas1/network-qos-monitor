import { File, Paths } from 'expo-file-system';

export type ThroughputResult = {
  downMbps: number;
  upMbps: number;
  downBytes: number;
  upBytes: number;
};

const WARMUP_TIMEOUT_MS = 90_000;
const WARMUP_RETRY_MS = 3_000;

// Mbps = bits transferidos / segundos transcurridos / 1.000.000.
// El tiempo incluye conexión, TLS y arranque de TCP: con payloads chicos subestima la velocidad real.
export function toMbps(bytes: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return (bytes * 8) / (elapsedMs / 1000) / 1_000_000;
}

// Render apaga el servicio gratis tras 15 min sin tráfico y tarda ~1 min en volver.
// Esta espera no entra en la medición.
export async function warmUp(baseUrl: string): Promise<void> {
  const deadline = Date.now() + WARMUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`, { cache: 'no-store' });
      if (res.ok) return;
    } catch {
      // servidor todavía dormido o sin red: se reintenta
    }
    await new Promise((r) => setTimeout(r, WARMUP_RETRY_MS));
  }
  throw new Error('el servidor no respondió en 90 s. Revisá la URL del backend en Ajustes.');
}

// Bajada y subida de archivos con expo-file-system: los bytes van de la red al disco
// del lado nativo y no pasan por el hilo de JavaScript.
export async function measureThroughput(
  baseUrl: string,
  downBytes: number,
  upBytes: number,
): Promise<ThroughputResult> {
  const downFile = new File(Paths.cache, 'qos-download.bin');
  let start = performance.now();
  await File.downloadFileAsync(`${baseUrl}/download?size=${downBytes}`, downFile, { idempotent: true });
  const downMs = performance.now() - start;
  const received = downFile.size;

  // Para subir se usa un archivo bajado del mismo servidor, así no se generan datos en JS.
  // Queda en caché y solo se vuelve a bajar si cambia el tamaño configurado.
  const upFile = new File(Paths.cache, 'qos-upload.bin');
  if (!upFile.exists || upFile.size !== upBytes) {
    await File.downloadFileAsync(`${baseUrl}/download?size=${upBytes}`, upFile, { idempotent: true });
  }

  start = performance.now();
  const res = await upFile.upload(`${baseUrl}/upload`, {
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  const upMs = performance.now() - start;
  if (res.status !== 200) throw new Error(`la subida falló (HTTP ${res.status})`);
  const sent = JSON.parse(res.body).bytes as number;

  return {
    downMbps: toMbps(received, downMs),
    upMbps: toMbps(sent, upMs),
    downBytes: received,
    upBytes: sent,
  };
}
