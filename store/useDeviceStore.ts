import { create } from 'zustand';

interface DeviceState {
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  battery: number | null;
  setBattery: (level: number | null) => void;
  temperature: number | null;
  setTemperature: (temp: number | null) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
  battery: 84, // Mock initial
  setBattery: (level) => set({ battery: level }),
  temperature: 21.5, // Mock initial
  setTemperature: (temp) => set({ temperature: temp }),
}));
