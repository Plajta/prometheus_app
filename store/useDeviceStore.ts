import { create } from 'zustand';

interface DeviceState {
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
}));
