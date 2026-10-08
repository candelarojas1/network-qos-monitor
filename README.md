# Network QoS Monitor

App iOS hecha con React Native y Expo. Mide la calidad de la red del celular (tipo de red, latencia, jitter, fallos de conexión y velocidad), guarda cada medición con su ubicación y la muestra en un mapa de calor y en gráficos por sesión. También mide en segundo plano y avisa con una notificación si la red se degrada.

Trabajo práctico 5 de Desarrollo de Aplicaciones Móviles (FCyT, 2026). La consigna está en `docs/tp5.pdf`.

## Requisitos cubiertos

| Requisito | Prioridad | Estado |
|---|---|---|
| RF-01 Tipo de red activa y operador | Alta | Hecho. El operador no está disponible en iOS 16 o posterior (ver Limitaciones) |
| RF-02 RTT contra 3 hosts configurables, min/avg/max/jitter | Alta | Hecho, con sondas TCP |
| RF-03 Test de bajada y subida en Mbps | Alta | Hecho, contra el backend propio |
| RF-04 Cada medición con fecha, hora y GPS | Alta | Hecho |
| RF-05 Mapa de calor de calidad | Alta | Hecho, con círculos de color sobre Apple Maps |
| RF-06 Series temporales de latencia y throughput por sesión | Media | Hecho |
| RF-07 Mediciones en segundo plano y aviso de degradación | Media | Hecho, con las limitaciones de iOS |
| RF-08 Exportar a CSV/JSON | Baja | No implementado (opcional) |
| RF-09 Filtros por red, fecha y zona | Baja | No implementado (opcional) |

## Pantallas

- **Monitor:** iniciar o detener una sesión, ver la red activa, la red celular y el permiso de ubicación, y medir la latencia o la velocidad a mano.
- **Mapa:** cada medición con ubicación se dibuja como un círculo de color según su puntaje. Con "Ver detalle de cada punto" aparecen pines con los datos de cada medición.
- **Historial:** lista de sesiones. Cada sesión muestra el gráfico de latencia, el de throughput y la lista de mediciones. Arriba hay una entrada con las mediciones hechas en segundo plano.
- **Ajustes:** los 3 hosts, la URL del backend, el tamaño de los payloads, el intervalo de la sesión y cada cuántas mediciones se corre el throughput.

## Cómo correrla

Requisitos: macOS con Xcode, Node 22 LTS, CocoaPods y, para las pruebas reales, un iPhone con el Modo desarrollador activado. La app no funciona en Expo Go porque usa módulos nativos propios.

```bash
git clone https://github.com/candelarojas1/network-qos-monitor.git
cd network-qos-monitor
npm install
```

**Simulador (desarrollo):**

```bash
npm run ios                     # genera ios/, instala pods, compila y abre el simulador
cd backend && npm install && npm start   # backend local en http://127.0.0.1:3000 (cambiar la URL en Ajustes)
```

**iPhone (desarrollo, necesita Metro y el mismo WiFi):**

```bash
npx expo run:ios --device <UDID>
```

**iPhone (Release, funciona sin Metro, para medir en la calle):**

1. Abrir `ios/NetworkQoSMonitor.xcworkspace` en Xcode. En Signing & Capabilities, elegir el equipo personal (Personal Team).
2. Con el iPhone conectado y desbloqueado:
   ```bash
   npx expo run:ios --device <UDID> --configuration Release
   ```
3. En el iPhone: Ajustes > General > VPN y gestión de dispositivos > confiar en el certificado.

Con un Apple ID gratis la app vence a los 7 días; se reinstala con el mismo comando. El `<UDID>` se obtiene con `xcrun xctrace list devices`.

**Build de simulador ya compilado (sin Xcode ni Metro):**

1. Descargar `NetworkQoSMonitor-simulator.zip` desde la sección Releases del repositorio y descomprimirlo.
2. Con un simulador de iPhone abierto:
   ```bash
   xcrun simctl install booted NetworkQoSMonitor.app
   xcrun simctl launch booted com.candelarojas.networkqosmonitor
   ```
3. La app usa por defecto el backend de Render (`https://network-qos-monitor.onrender.com`). Para usar el backend local, cambiar la URL en Ajustes.

**Tests:**

```bash
npm test
```

**Backend:** ver `backend/README.md` (correrlo local, con Docker y despliegue en Render).

## Arquitectura

La app está separada en capas, como sugiere la consigna. Cada capa es una carpeta y solo habla con la de al lado:

| Capa | Qué hace | Carpeta | Tecnología |
|---|---|---|---|
| Native Bridge | Le pregunta a iOS qué red celular hay | `modules/telephony/` | Swift + Expo Modules API |
| Measurement Engine | Pings, test de velocidad, puntaje, sesiones | `src/engine/` | TypeScript, react-native-tcp-socket, expo-file-system |
| Persistence | Guarda y consulta mediciones | `src/db/` | expo-sqlite |
| Geo | Ubicación durante una sesión, también con la pantalla bloqueada | `src/geo/` | expo-location |
| Store | Estado compartido: el motor escribe y la UI lee | `src/store/` | Zustand |
| Presentation | Pantallas | `src/app/`, `src/components/` | expo-router, react-native-maps, victory-native |
| Background | Tareas en segundo plano y aviso de degradación | `src/background/` | expo-task-manager, expo-background-task, expo-notifications |
| Backend | Servidor de referencia para el throughput | `backend/` | Node + Express + Docker, desplegado en Render |

Recorrido de una medición:

1. El motor (`src/engine/measure.ts`) lanza en paralelo NetInfo, la ubicación y el ping a los 3 hosts. En la primera medición de la sesión y después cada N (5 por defecto) agrega el test de velocidad.
2. Calcula el puntaje (`score.ts`), guarda la fila en SQLite (`src/db/`) y evalúa si hay degradación (`src/background/degradation.ts`).
3. El resultado se escribe en el store de Zustand. La pantalla Monitor está suscrita a ese store y se redibuja sola.

### Cómo se evita bloquear el hilo de JavaScript

En React Native todo el código JS corre en un solo hilo. Si ese hilo se ocupa en una tarea larga, la app se congela. Lo que se evita no es "correr en otro hilo", sino que el hilo de JS espere o procese mucho:

1. **Las esperas de red son asíncronas.** Cuando JS pide abrir un socket o descargar un archivo, le pasa el pedido al código nativo y sigue con lo suyo. iOS hace la conexión (react-native-tcp-socket usa su propia cola de GCD) y la transferencia (NSURLSession). Al terminar, el nativo manda un evento o resuelve una promesa. Mientras tanto, el hilo de JS está libre para la interfaz.
2. **Los datos grandes no pasan por JS.** El test de velocidad descarga y sube archivos con expo-file-system, así que los bytes van de la red al disco del lado nativo. Con `fetch(...).arrayBuffer()` los megabytes se copiarían a la memoria de JS, lo frenarían y ese tiempo se sumaría a la medición.
3. **Lo que corre en JS es chico:** tomar tiempos, calcular estadísticas sobre 10 números y escribir en SQLite con la API asíncrona.
4. **La interfaz se entera por el store:** cada pantalla se suscribe solo a la parte del estado que usa.

Limitación: el RTT se mide con `performance.now()` en JS cuando llega el evento "conectó". Si en ese momento el hilo de JS está ocupado, el valor sale unos milisegundos más alto. Por eso las sondas van de a una.

## Decisiones de diseño

- **Expo con dev client en lugar de React Native CLI.** La consigna pide no usar "Expo Go puro" porque hacen falta módulos nativos. Con dev client y prebuild se pueden usar módulos nativos propios, y la consigna acepta "Expo Dev Client" como entregable.
- **Reemplazos del stack sugerido:**
  - expo-sqlite en lugar de WatermelonDB.
  - expo-location en lugar de react-native-geolocation-service.
  - expo-notifications en lugar de notifee.
  - expo-background-task en lugar de react-native-background-fetch.

  Son los equivalentes oficiales de Expo SDK 57, mantenidos y compatibles con la New Architecture. Se mantuvieron NetInfo, react-native-tcp-socket, react-native-maps y victory-native.
- **Módulo nativo propio en Swift** (`modules/telephony/ios/TelephonyModule.swift`). Se hizo con Expo Modules API, que usa JSI igual que TurboModules. Lee la tecnología de radio con `CTTelephonyNetworkInfo.serviceCurrentRadioAccessTechnology` y la pasa a 2G/3G/4G/5G. Con dos SIM usa la de datos.
- **"Ping" por TCP.** iOS no permite enviar ICMP (el ping clásico) desde una app. Se mide el tiempo que tarda en abrirse una conexión TCP al puerto 443, que equivale a un viaje de ida y vuelta (RTT). Son 10 sondas por host, de a una, con un timeout de 2000 ms.
- **Jitter:** promedio de la diferencia absoluta entre RTT consecutivos.
- **Resumen de los 3 hosts:** mínimo de los mínimos, promedio de los promedios, máximo de los máximos, promedio de los jitter y fallos sobre el total de sondas.
- **Throughput = bytes transferidos / tiempo transcurrido.** Es la definición directa, se puede verificar a mano y no depende de estimar el RTT, que en la subida no se puede separar del resto. La bajada y la subida usan archivos (1 MB = 1.048.576 bytes). El archivo para subir se baja una vez del mismo servidor y queda en caché. El tamaño de los payloads y cada cuántas mediciones se corre el test se configuran, para no gastar datos móviles.
- **Puntaje de calidad de 0 a 100** (`src/engine/score.ts`). Cada métrica se lleva a una escala de 0 a 100 con una recta entre un valor bueno y uno malo:
  - RTT: 100 puntos con 50 ms o menos, 0 con 500 ms o más.
  - Jitter: 100 puntos con 5 ms o menos, 0 con 100 ms o más.
  - Fallos TCP: 100 menos el porcentaje de fallos.

  Pesos: 50 % RTT, 20 % jitter y 30 % fallos. El throughput no entra en el puntaje porque solo se mide cada N mediciones; si entrara, los puntos con y sin test de velocidad no serían comparables en el mapa.
- **Mapa de calor con círculos.** El componente Heatmap de react-native-maps solo funciona con Google Maps, que pide una API key con facturación. En Apple Maps cada medición es un círculo semitransparente de 40 m que va de rojo (0) a amarillo (50) y a verde (100). Donde hay muchas mediciones, los círculos se superponen. Las mediciones sin ubicación no se dibujan y el panel indica cuántas son.
- **Sesión con Iniciar y Detener.** Mide cada N segundos (30 por defecto), contados desde que termina una medición, así nunca se superponen.
- **Segundo plano con dos mecanismos** (ver Limitaciones):
  - Durante una sesión, actualizaciones de ubicación en segundo plano.
  - Fuera de una sesión, una tarea periódica de BGTaskScheduler.
- **Notificación de degradación.** Se dispara con 50 % o más de fallos TCP, con un RTT promedio de más de 500 ms o sin conexión. Avisa solo cuando la red pasa de bien a degradada, para no repetir el aviso. El estado anterior se guarda en SQLite porque la tarea en segundo plano puede correr en un arranque nuevo de la app.

## Limitaciones conocidas

| Tema | Limitación | Qué se hizo |
|---|---|---|
| Intensidad de señal (RSSI) | iOS no tiene una API pública para leerla. Las privadas hacen que Apple rechace la app | El módulo devuelve `rssi: null` y la app muestra "No disponible en iOS". El mapa usa el puntaje de calidad, que la consigna admite ("señal/calidad") |
| Operador | `CTCarrier` está deprecado desde iOS 16 y devuelve `"--"` | Se lee igual y se muestra "No disponible". La consigna dice "cuando esté disponible" |
| Tipo de red celular | Solo se puede leer en un iPhone real | En el simulador figura "No disponible" |
| Permiso de "teléfono" | No existe en iOS | Solo se pide el permiso de ubicación |
| 5G NSA | Sin tráfico de datos la radio queda en LTE, porque el 5G NSA se apoya en LTE | Puede figurar 4G (LTE) con WiFi. Con datos móviles en uso aparece 5G (NRNSA) |
| Pérdida de paquetes | Desde una app no se puede ver cada paquete perdido (haría falta ICMP o UDP con un servidor de eco) | Se muestra como "Fallos de conexión TCP (estimación de pérdida)": el porcentaje de sondas que no conectan antes del timeout. Ver más abajo |
| Throughput | El tiempo incluye la conexión TCP y TLS, la espera de la primera respuesta y el arranque lento de TCP | Con payloads chicos el resultado subestima la velocidad real; con payloads grandes se acerca más, pero gasta más datos. Por eso el tamaño es configurable |
| Distancia al servidor | Render no tiene región en Sudamérica; el servidor está en EE. UU. | Con un RTT de más de 100 ms la velocidad que se puede medir con TCP es menor que la de la conexión |
| Arranque en frío de Render | El plan gratis se apaga después de 15 minutos sin tráfico y tarda alrededor de un minuto en volver | Antes de medir se llama a `/health` hasta 90 s. Esa espera no cuenta en la medición |
| Background en sesión | Funciona mientras la app no se cierre deslizándola. Gasta más batería y muestra el indicador azul de ubicación | Las actualizaciones arrancan al iniciar la sesión, con el permiso "Mientras se usa": iOS lo permite si las inicia el usuario con la app en pantalla. Cada actualización dispara una medición si ya pasó el intervalo |
| Background fuera de sesión | iOS decide cuándo correr la tarea según batería, red y uso. 15 minutos es el mínimo, no la frecuencia; según la documentación de Expo, en iOS los intervalos cortos suelen ignorarse y la tarea corre en ventanas como la noche. No corre en el simulador ni si la app se cerró deslizándola | Solo hace ping y toma la última ubicación conocida, sin throughput. Las ejecuciones reales quedan con fecha y hora en Historial > Mediciones en segundo plano |
| Prueba forzada de la tarea | El botón "Forzar tarea en segundo plano" solo existe en desarrollo | Demuestra que el código de la tarea mide, guarda y notifica. **No demuestra la ejecución periódica**, que la decide iOS |
| Notificaciones push | El equipo personal (Apple ID gratis) no puede firmar apps con el permiso de push | La app solo usa notificaciones locales. El plugin `plugins/with-no-push-entitlement.js` saca el permiso de push que agrega expo-notifications |
| Distribución | Sin la cuenta paga de Apple no hay TestFlight ni IPA para otras personas | Se entrega un build de simulador y el video. En el iPhone se instala con Xcode, y la app vence a los 7 días |
| Timeout de las sondas en iOS | react-native-tcp-socket pasa el timeout a segundos con división entera, así que menos de 1000 ms queda en 0 y falla (issue #231 de la librería) | Se usan 2000 ms |
| react-native-tcp-socket | No tiene soporte oficial para la New Architecture (issue #187) y corre por la capa de compatibilidad | Se probó en un iPhone real con Expo SDK 57 y funciona |

### Sobre la estimación de pérdida

- Se calcula como sondas que no conectaron antes del timeout / sondas enviadas.
- TCP reenvía el paquete de conexión (SYN) por su cuenta cuando se pierde. Por eso un paquete perdido suele verse como un RTT más alto y no como un fallo, y la métrica subestima la pérdida real.
- Un fallo también puede tener otras causas: que el host rechace la conexión, un firewall o un DNS lento. Por eso los hosts por defecto son IPs (`1.1.1.1`, `8.8.8.8`, `9.9.9.9`).
- Son 10 sondas por host, así que la resolución es de a 10 %.

## Estructura del repositorio

```
src/app/          pantallas (expo-router): Monitor, Mapa, Historial, Ajustes
src/engine/       ping, throughput, puntaje, medición, sesión (y tests)
src/db/           SQLite: tablas y consultas
src/geo/          actualizaciones de ubicación durante la sesión
src/background/   tareas en segundo plano y notificación de degradación
src/store/        estado compartido (Zustand)
modules/telephony módulo nativo Swift (CoreTelephony)
plugins/          plugin de configuración (quita el permiso de push)
backend/          servidor Express de referencia para el throughput
docs/             consigna del TP
```

La carpeta `ios/` no se versiona: Expo la genera con `npx expo prebuild` a partir de `app.json` y los plugins.
