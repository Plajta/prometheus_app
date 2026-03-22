import { create } from "zustand";

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

export interface DeviceState {
	isConnected: boolean;
	setIsConnected: (connected: boolean) => void;
	battery: number | null;
	setBattery: (level: number | null) => void;
	temperature: number | null;
	setTemperature: (temp: number | null) => void;
	slotsA: Slot[];
	slotsB: Slot[];
	setCupState: (state: number) => void;
	setSlotTaken: (col: "A" | "B", id: string, taken: boolean) => void;
	lastSyncTime: Date | null;
	setLastSyncTime: (date: Date | null) => void;
}

export const useBleDeviceStore = create<DeviceState>((set) => ({
	isConnected: false,
	setIsConnected: (connected) => set({ isConnected: connected }),
	battery: 84, // Mock initial
	setBattery: (level) => set({ battery: level }),
	temperature: 21.5, // Mock initial
	setTemperature: (temp) => set({ temperature: temp }),
	slotsA: initialColA,
	slotsB: initialColB,
	setCupState: (stateNum) =>
		set((state) => {
			const newA = state.slotsA.map((slot, i) => ({
				...slot,
				taken: ((stateNum >> (i * 2)) & 1) === 1,
			}));
			const newB = state.slotsB.map((slot, i) => ({
				...slot,
				taken: ((stateNum >> (i * 2 + 1)) & 1) === 1,
			}));
			return { slotsA: newA, slotsB: newB };
		}),
	setSlotTaken: (col, id, taken) =>
		set((state) => {
			if (col === "A") {
				return { slotsA: state.slotsA.map((s) => s.id === id ? { ...s, taken } : s) };
			} else {
				return { slotsB: state.slotsB.map((s) => s.id === id ? { ...s, taken } : s) };
			}
		}),
	lastSyncTime: null,
	setLastSyncTime: (date) => set({ lastSyncTime: date }),
}));
