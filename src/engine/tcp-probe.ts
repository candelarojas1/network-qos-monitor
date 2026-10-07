import TcpSocket from 'react-native-tcp-socket';

// En iOS la libreria pasa el timeout a segundos con division entera,
// asi que valores menores a 1000 ms quedan en 0 y fallan al instante (issue #231).
export const CONNECT_TIMEOUT_MS = 2000;

/**
 * Mide el tiempo que tarda en abrirse una conexion TCP (handshake SYN / SYN-ACK).
 * Devuelve el RTT en ms, o null si no conecto antes del timeout.
 */
export function probeTcp(host: string, port = 443, timeoutMs = CONNECT_TIMEOUT_MS): Promise<number | null> {
  return new Promise((resolve) => {
    let done = false;
    const start = performance.now();

    const finish = (rtt: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      socket.destroy();
      resolve(rtt);
    };

    const socket = TcpSocket.createConnection({ host, port, connectTimeout: timeoutMs }, () =>
      finish(performance.now() - start),
    );
    socket.on('error', () => finish(null));
    socket.on('timeout', () => finish(null));

    // Respaldo por si el nativo nunca emite connect ni error.
    const guard = setTimeout(() => finish(null), timeoutMs + 500);
  });
}
