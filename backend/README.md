# Backend de referencia (throughput)

Servidor mínimo con Express que usa la app para medir velocidad de bajada y subida.

| Endpoint | Qué hace |
|---|---|
| `GET /health` | Responde `{ "ok": true }`. La app lo llama antes de medir para "despertar" el servicio. |
| `GET /download?size=N` | Envía `N` bytes (máximo 50 MB). |
| `POST /upload` | Recibe el cuerpo y responde `{ "bytes": N }` con lo recibido. |

## Correrlo en la Mac

```bash
cd backend
npm install
npm start
```

Queda en `http://127.0.0.1:3000`. Desde el simulador se usa esa URL. Desde el iPhone en el mismo WiFi, `http://<IP-de-la-Mac>:3000`.

## Con Docker

```bash
cd backend
docker build -t network-qos-backend .
docker run --rm -p 3000:3000 network-qos-backend
```

## Despliegue en Render (plan gratis)

1. Subir el repositorio a GitHub.
2. En render.com: New > Web Service > conectar el repositorio.
3. Root Directory: `backend`. Runtime: Docker. Plan: Free.
4. Cuando termina el deploy, Render da una URL `https://<nombre>.onrender.com`.
5. En la app, en Ajustes > URL del backend, pegar esa URL.

Limitaciones:
- El servicio gratis se apaga después de 15 minutos sin tráfico y tarda alrededor de un minuto en volver. La app espera hasta 90 segundos con `/health` antes de medir, y esa espera no cuenta en la medición.
- Render no tiene servidores en Sudamérica. Cuanto más lejos está el servidor, mayor es el RTT y menor la velocidad que se puede medir con TCP, así que el resultado es menor que la velocidad real de la conexión.
