// Backend de referencia para el test de throughput.
// GET /health            -> responde 200 (sirve para "despertar" el servicio en Render)
// GET /download?size=N   -> envía N bytes
// POST /upload           -> recibe el cuerpo y responde cuántos bytes llegaron
const express = require('express');

const PORT = process.env.PORT || 3000;
const MAX_BYTES = 50 * 1024 * 1024; // límite para no abusar del plan gratis
const CHUNK = Buffer.alloc(64 * 1024); // bloque de ceros que se reutiliza

const app = express();

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/download', (req, res) => {
  const size = Number(req.query.size);
  if (!Number.isInteger(size) || size <= 0 || size > MAX_BYTES) {
    return res.status(400).json({ error: `size debe ser un entero entre 1 y ${MAX_BYTES}` });
  }

  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Length': String(size),
    'Cache-Control': 'no-store',
  });

  // Se escribe por bloques respetando el control de flujo del socket.
  let remaining = size;
  const writeMore = () => {
    while (remaining > 0) {
      const n = Math.min(remaining, CHUNK.length);
      remaining -= n;
      const ok = res.write(n === CHUNK.length ? CHUNK : CHUNK.subarray(0, n));
      if (!ok) return res.once('drain', writeMore);
    }
    res.end();
  };
  writeMore();
});

app.post('/upload', (req, res) => {
  let bytes = 0;
  req.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes > MAX_BYTES) req.destroy();
  });
  req.on('end', () => res.json({ bytes }));
});

app.listen(PORT, () => {
  console.log(`Backend escuchando en el puerto ${PORT}`);
});
