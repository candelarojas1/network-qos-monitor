import type { NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

import Telephony, { type CellularInfo } from '../../modules/telephony';

// Estado de red compartido: NetInfo y el módulo nativo escriben acá y las pantallas lo leen.
export type NetworkSnapshot = {
  type: string;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  cellular: CellularInfo;
};

type NetworkStore = {
  network: NetworkSnapshot | null;
  setFromNetInfo: (state: NetInfoState) => void;
  refreshCellular: () => void;
};

export const useNetworkStore = create<NetworkStore>((set) => ({
  network: null,
  // La radio celular se lee en cada cambio de NetInfo, aunque la conexión activa sea WiFi.
  setFromNetInfo: (state) =>
    set({
      network: {
        type: state.type,
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        cellular: Telephony.getCellularInfo(),
      },
    }),
  // NetInfo no avisa cuando la radio pasa de 4G a 5G, así que se puede releer a mano.
  refreshCellular: () =>
    set((s) => (s.network ? { network: { ...s.network, cellular: Telephony.getCellularInfo() } } : s)),
}));
