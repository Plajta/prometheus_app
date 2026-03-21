import { create } from 'zustand';

interface DeviceState {
  deviceId: string | null;
  setDeviceId: (id: string) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  deviceId: null,
  setDeviceId: (id) => set({ deviceId: id }),
}));
