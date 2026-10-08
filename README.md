# Network QoS Monitor

App iOS (React Native + Expo) que mide la calidad de la red del dispositivo, guarda cada medición con su ubicación y la muestra en un mapa y en gráficos. Trabajo práctico 5 de Desarrollo de Aplicaciones Móviles. La consigna está en `docs/tp5.pdf`.

## Requisitos

- macOS con Xcode y un simulador de iOS
- Node 22 LTS (o `^20.19.4`, `^24.3`)
- CocoaPods
- Para las pruebas reales: un iPhone con el Modo desarrollador activado

## Cómo correrla

```bash
git clone https://github.com/candelarojas1/network-qos-monitor.git
cd network-qos-monitor
npm install
npm run ios
```

`npm run ios` genera la carpeta `ios/`, instala los pods, compila la app con el dev client y la abre en el simulador. La app no funciona en Expo Go porque usa módulos nativos.

## Estado

Etapa 1: detección de red con NetInfo, permiso de ubicación y prueba de conexión TCP.
