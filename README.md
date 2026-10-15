# Network QoS Monitor

App para iPhone hecha con React Native y Expo. Mide la calidad de la conexión a internet del celular, guarda cada medición con su ubicación y la muestra en un mapa y en gráficos. También puede medir en segundo plano y avisa con una notificación si la red empeora mucho.

## Entrega

En la carpeta `entrega/`:

- **`video-demo.mp4`:** video de la app funcionando en un iPhone 16 con datos móviles 4G. Muestra la detección de red, la latencia contra los 3 servidores, la prueba de velocidad, una sesión en curso, el mapa de calor y el historial con 2 sesiones reales.
- **`NetworkQoSMonitor-simulator.zip`:** la app ya compilada para el simulador de iPhone, para probarla sin compilar el código (ver "Probar la app ya compilada").

Sin la cuenta paga de Apple no se puede generar el instalador para iPhone (IPA) ni usar TestFlight, por eso se entrega el video desde un iPhone real y la versión para el simulador.

## Qué mide

- **Tipo de red:** WiFi o datos móviles, y si es 3G, 4G o 5G.
- **Latencia:** cuánto tarda en responder un servidor, contra 3 servidores configurables. Muestra el mínimo, el promedio, el máximo y el jitter (cuánto varía la latencia).
- **Fallos de conexión:** porcentaje de intentos que no lograron conectarse (es una estimación de la pérdida de paquetes).
- **Velocidad:** bajada y subida en Mbps, contra un servidor propio.
- **Ubicación:** coordenadas GPS de cada medición.

## Requisitos de la consigna

| Requisito | Estado |
|---|---|
| RF-01 Tipo de red y operador | Hecho (iOS no deja ver el operador, ver Limitaciones) |
| RF-02 Latencia contra 3 servidores con mínimo, promedio, máximo y jitter | Hecho |
| RF-03 Velocidad de bajada y subida | Hecho |
| RF-04 Cada medición con fecha, hora y GPS | Hecho |
| RF-05 Mapa de calor | Hecho |
| RF-06 Gráficos de latencia y velocidad por sesión | Hecho |
| RF-07 Mediciones en segundo plano y aviso de degradación | Hecho |
| RF-08 Exportar a CSV/JSON | No implementado (prioridad baja) |
| RF-09 Filtros del historial | No implementado (prioridad baja) |

## Pantallas

- **Monitor:** iniciar o detener una sesión de medición, ver la red actual y medir la latencia o la velocidad a mano.
- **Mapa:** cada medición es un círculo de color: verde es buena, amarillo regular y rojo mala.
- **Historial:** las sesiones guardadas, cada una con sus gráficos y mediciones. También las mediciones hechas en segundo plano.
- **Ajustes:** los 3 servidores, la dirección del backend, el tamaño de la prueba de velocidad y cada cuánto se mide.

## Probar la app ya compilada

Se necesita una Mac con Xcode.

1. Descomprimir `entrega/NetworkQoSMonitor-simulator.zip`.
2. Abrir un simulador de iPhone (desde Xcode o con `open -a Simulator`).
3. En la Terminal, desde la carpeta donde quedó el archivo:
   ```bash
   xcrun simctl install booted NetworkQoSMonitor.app
   xcrun simctl launch booted com.candelarojas.networkqosmonitor
   ```

El simulador no tiene red celular ni GPS real, así que esas partes se ven en el video.

## Cómo correrla desde el código

Se necesita una Mac con Xcode, Node 22 y CocoaPods. La app no funciona en Expo Go porque usa código nativo propio.

```bash
git clone https://github.com/candelarojas1/network-qos-monitor.git
cd network-qos-monitor
npm install
npm run ios        # compila y abre la app en el simulador
```

**En un iPhone real** (conectado por cable y con el Modo desarrollador activado):

1. Abrir `ios/NetworkQoSMonitor.xcworkspace` en Xcode y elegir el equipo personal en Signing & Capabilities.
2. Correr `npx expo run:ios --device <ID-del-iPhone> --configuration Release`. Esta versión funciona sola, sin la computadora. El ID se obtiene con `xcrun xctrace list devices`.
3. En el iPhone: Ajustes > General > VPN y gestión de dispositivos > confiar en el certificado.

Con un Apple ID gratis la app deja de abrir a los 7 días; se vuelve a instalar con el mismo comando.

**Tests:** `npm test`

**Backend:** la app usa por defecto el servidor publicado en `https://network-qos-monitor.onrender.com`. Cómo correrlo localmente y desplegarlo está en `backend/README.md`.

## Cómo está organizada

El código está separado en partes, y cada una tiene una sola tarea:

| Parte | Qué hace | Carpeta |
|---|---|---|
| Módulo nativo | Le pregunta a iOS qué red celular hay (código en Swift) | `modules/telephony/` |
| Motor de medición | Hace las mediciones de latencia y velocidad, calcula el puntaje y maneja las sesiones | `src/engine/` |
| Base de datos | Guarda las mediciones en el celular (SQLite) | `src/db/` |
| Ubicación | Sigue la ubicación durante una sesión | `src/geo/` |
| Estado compartido | Lugar común donde el motor deja los resultados y las pantallas los leen | `src/store/` |
| Pantallas | Monitor, Mapa, Historial y Ajustes | `src/app/` |
| Segundo plano | Mediciones con la app cerrada y notificaciones | `src/background/` |
| Backend | Servidor para la prueba de velocidad | `backend/` |

**Cómo no se traba la pantalla mientras mide:** React Native ejecuta todo el código de la app en un solo hilo. Las conexiones y las descargas no esperan en ese hilo: se le pasan al sistema (iOS), que avisa cuando terminan. Mientras tanto la pantalla sigue respondiendo. Los archivos de la prueba de velocidad van directo de la red al disco, sin pasar por el código de la app.

## Decisiones principales

- **Expo con código nativo propio:** la consigna pide no usar Expo Go "puro", porque hace falta acceder a la red celular desde código nativo. Se usó Expo con "development build", que permite módulos nativos propios.
- **Algunas librerías se cambiaron por las equivalentes de Expo:**
  - SQLite de Expo en lugar de WatermelonDB.
  - expo-location para la ubicación.
  - expo-notifications para los avisos.
  - expo-background-task para el segundo plano.

  Hacen lo mismo y son las recomendadas para esta versión de Expo.
- **La latencia se mide abriendo una conexión TCP:** iOS no deja usar el "ping" clásico desde una app, así que se mide cuánto tarda en abrirse una conexión con el servidor (puerto 443). Son 10 intentos por servidor.
- **Velocidad = datos transferidos / tiempo que tardó.** Es la cuenta más directa. Con archivos chicos da un poco menos que la velocidad real, porque también cuenta el tiempo de conectarse.
- **Puntaje de calidad de 0 a 100:** combina la latencia (50 %), el jitter (20 %) y los fallos de conexión (30 %). La velocidad no entra porque no se mide en todas las mediciones, solo cada 5.
- **Mapa con círculos de color:** el mapa de calor "real" de la librería solo funciona con Google Maps, que pide una cuenta con tarjeta. Por eso se usaron círculos sobre Apple Maps que se superponen.
- **Sesiones con Iniciar y Detener:** mientras la sesión está activa, la app mide cada cierta cantidad de segundos (30 por defecto), también con la pantalla bloqueada.

## Limitaciones de iOS

- **Intensidad de señal:** iOS no deja leerla. Por eso el mapa muestra la calidad de la conexión y no la señal.
- **Operador:** desde iOS 16 Apple no lo informa; la app muestra "No disponible".
- **Pérdida de paquetes:** no se puede medir de forma exacta desde una app. Se muestra el porcentaje de conexiones que fallaron, que es una estimación y suele ser menor que la pérdida real.
- **Velocidad:** el servidor está en Estados Unidos (no hay opción gratis en Sudamérica), así que la velocidad medida es menor que la real. Además, el servidor gratis se apaga si no se usa por 15 minutos y tarda alrededor de un minuto en volver; la app lo espera antes de medir.
- **Segundo plano:**
  - Durante una sesión, la app sigue midiendo con la pantalla bloqueada, salvo que se la cierre deslizándola.
  - Fuera de una sesión, iOS decide cuándo ejecutar la medición: como mínimo cada 15 minutos, pero sin garantía (puede pasar horas sin hacerlo). En el simulador no funciona.
  - Las mediciones en segundo plano usan la última ubicación conocida; si iOS no tiene una, se guardan sin ubicación y no aparecen en el mapa.
- **Simulador:** no tiene red celular ni GPS real. Para eso hace falta un iPhone.
- **Cuenta gratis de Apple:** no se pueden repartir copias de la app para iPhone (no hay IPA ni TestFlight) ni usar notificaciones push. La app usa notificaciones locales, que no las necesitan.
