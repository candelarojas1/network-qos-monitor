export type CellularGeneration = '2G' | '3G' | '4G' | '5G';

export type CellularInfo = {
  // Nombre corto de la tecnología de radio, por ejemplo "LTE" o "NRNSA".
  radioTech: string | null;
  generation: CellularGeneration | null;
  // null cuando iOS no lo informa (desde iOS 16 devuelve "--").
  carrier: string | null;
  // Siempre null en iOS: no hay API pública para leer la intensidad de señal.
  rssi: null;
};
