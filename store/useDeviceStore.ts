import { create } from 'zustand';

export interface Slot {
  id: string;
  dayName: string;
  timeLabel: string;
  taken: boolean;
}

const DAYS = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];

const initialColA: Slot[] = DAYS.map((day, i) => ({
  id: `A${i + 1}`,
  dayName: day,
  timeLabel: "Ráno",
  taken: i < 3,
}));

const initialColB: Slot[] = DAYS.map((day, i) => ({
  id: `B${i + 1}`,
  dayName: day,
  timeLabel: "Večer",
  taken: i < 2,
}));

interface DeviceState {
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  battery: number | null;
  setBattery: (level: number | null) => void;
  temperature: number | null;
  setTemperature: (temp: number | null) => void;
  slotsA: Slot[];
  slotsB: Slot[];
  toggleSlotB6: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
  battery: 84, // Mock initial
  setBattery: (level) => set({ battery: level }),
  temperature: 21.5, // Mock initial
  setTemperature: (temp) => set({ temperature: temp }),
  slotsA: initialColA,
  slotsB: initialColB,
  toggleSlotB6: () => set((state) => {
    const newB = [...state.slotsB];
    const b6Index = newB.findIndex(s => s.id === "B6");
    if (b6Index !== -1) {
      newB[b6Index] = { ...newB[b6Index], taken: !newB[b6Index].taken };
    }
    return { slotsB: newB };
  })
}));
