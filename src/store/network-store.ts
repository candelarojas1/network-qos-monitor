import type { NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

// Estado de red compartido: NetInfo escribe aca y las pantallas lo leen.
export type NetworkSnapshot = {
  type: string;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  cellularGeneration: string | null;
};

type NetworkStore = {
  network: NetworkSnapshot | null;
  setFromNetInfo: (state: NetInfoState) => void;
};

export const useNetworkStore = create<NetworkStore>((set) => ({
  network: null,
  setFromNetInfo: (state) =>
    set({
      network: {
        type: state.type,
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        cellularGeneration:
          state.type === 'cellular' ? (state.details?.cellularGeneration ?? null) : null,
      },
    }),
}));
