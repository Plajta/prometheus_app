import {
	View,
	Text,
	Switch,
	Alert,
	Pressable,
	LayoutAnimation,
	Platform,
	UIManager,
	useColorScheme,
} from "react-native";
import { useState, useRef, useEffect, useCallback } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BleWrapperModule from "~/modules/ble-wrapper/src/BleWrapperModule";
import { useBleDeviceStore, Slot } from "~/store/useBleDeviceStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { BluetoothStatusPill } from "~/components/BluetoothStatusPill";
import { SettingsBottomSheet } from "~/components/SettingsBottomSheet";
import { getDeviceSettings, updateDeviceSettings } from "~/lib/database";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SlotStatus = "past" | "present" | "future";

function getThisMonday(): Date {
	const d = new Date();
	const day = d.getDay(); // 0=Ne
	d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
	d.setHours(0, 0, 0, 0);
	return d;
}

function computeStatuses(
	morningH: number,
	morningM: number,
	eveningH: number,
	eveningM: number,
): { statusA: SlotStatus[]; statusB: SlotStatus[] } {
	const now = new Date();
	const monday = getThisMonday();

	// Seřazená sekvence 14 eventů (pondělí ráno → neděle večer)
	const events: { col: "A" | "B"; dayIdx: number; time: Date }[] = [];
	for (let d = 0; d < 7; d++) {
		const base = new Date(monday);
		base.setDate(monday.getDate() + d);

		const morning = new Date(base);
		morning.setHours(morningH, morningM, 0, 0);
		events.push({ col: "A", dayIdx: d, time: morning });

		const evening = new Date(base);
		evening.setHours(eveningH, eveningM, 0, 0);
		events.push({ col: "B", dayIdx: d, time: evening });
	}

	// Present = nejbližší budoucí event; pokud jsou všechny minulé → poslední
	const upcoming = events.filter((e) => e.time >= now);
	const presentEvent = upcoming.length > 0 ? upcoming[0] : events[events.length - 1];

	const classify = (col: "A" | "B", dayIdx: number): SlotStatus => {
		const ev = events.find((e) => e.col === col && e.dayIdx === dayIdx)!;
		if (ev === presentEvent) return "present";
		return ev.time < now ? "past" : "future";
	};

	return {
		statusA: Array.from({ length: 7 }, (_, i) => classify("A", i)),
		statusB: Array.from({ length: 7 }, (_, i) => classify("B", i)),
	};
}

type StyleKey = SlotStatus | "overdue";

const STATUS_STYLE: Record<StyleKey, { bg: string; border: string; text: string; sub: string; dot: string }> = {
	past: { bg: "#dcfce7", border: "#22c55e", text: "#166534", sub: "#16a34a", dot: "#22c55e" },
	present: { bg: "#fef9c3", border: "#eab308", text: "#713f12", sub: "#ca8a04", dot: "#eab308" },
	future: { bg: "#e0f2fe", border: "#38bdf8", text: "#075985", sub: "#0284c7", dot: "#38bdf8" },
	overdue: { bg: "#fee2e2", border: "#ef4444", text: "#7f1d1d", sub: "#dc2626", dot: "#ef4444" },
};

const STATUS_STYLE_DARK: Record<StyleKey, { bg: string; border: string; text: string; sub: string; dot: string }> = {
	past: { bg: "#052e16", border: "#22c55e", text: "#bbf7d0", sub: "#4ade80", dot: "#22c55e" },
	present: { bg: "#1a1200", border: "#eab308", text: "#fef08a", sub: "#facc15", dot: "#eab308" },
	future: { bg: "#082f49", border: "#38bdf8", text: "#bae6fd", sub: "#7dd3fc", dot: "#38bdf8" },
	overdue: { bg: "#2d0a0a", border: "#ef4444", text: "#fecaca", sub: "#f87171", dot: "#ef4444" },
};

const SPLIT_ANIM = {
	duration: 220,
	create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
	update: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.scaleXY },
	delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
};

function SlotCell({
	slot,
	status,
	onSetTaken,
}: {
	slot: Slot;
	status: SlotStatus;
	onSetTaken: (taken: boolean) => void;
}) {
	const isDark = useColorScheme() === "dark";
	const key: StyleKey = status === "past" && !slot.taken ? "overdue" : status;
	const s = (isDark ? STATUS_STYLE_DARK : STATUS_STYLE)[key];
	const [split, setSplit] = useState(false);
	const canInteract = status === "past";
	const suppressPress = useRef(false);

	const handleLongPress = () => {
		if (!canInteract) return;
		suppressPress.current = true;
		LayoutAnimation.configureNext(SPLIT_ANIM);
		setSplit(true);
	};

	const handleChoose = (taken: boolean) => {
		LayoutAnimation.configureNext(SPLIT_ANIM);
		setSplit(false);
		onSetTaken(taken);
	};

	return (
		<View className="flex-1 flex-row gap-0.5">
			{split ? (
				<>
					<Pressable
						onPress={() => {
							if (suppressPress.current) {
								suppressPress.current = false;
								return;
							}
							handleChoose(true);
						}}
						className="flex-1 items-center justify-center py-2 rounded-xl border-[1.5px]"
						style={{ backgroundColor: isDark ? "#052e16" : "#dcfce7", borderColor: "#22c55e" }}
					>
						<Ionicons name="checkmark" size={18} color="#22c55e" />
						<Text className="text-[9px] font-bold mt-0.5" style={{ color: "#22c55e" }}>
							Vzato
						</Text>
					</Pressable>
					<Pressable
						onPress={() => {
							if (suppressPress.current) {
								suppressPress.current = false;
								return;
							}
							handleChoose(false);
						}}
						className="flex-1 items-center justify-center py-2 rounded-xl border-[1.5px]"
						style={{ backgroundColor: isDark ? "#2d0a0a" : "#fee2e2", borderColor: "#ef4444" }}
					>
						<Ionicons name="close" size={18} color="#ef4444" />
						<Text className="text-[9px] font-bold mt-0.5" style={{ color: "#ef4444" }}>
							Přeskočit
						</Text>
					</Pressable>
				</>
			) : (
				<Pressable
					onLongPress={handleLongPress}
					delayLongPress={400}
					onPress={() => {
						if (suppressPress.current) {
							suppressPress.current = false;
							return;
						}
					}}
					className="flex-1 flex-row items-center gap-2 rounded-xl px-2.5 py-1.5 border-[1.5px]"
					style={{ backgroundColor: s.bg, borderColor: s.border }}
				>
					<View className="w-[7px] h-[7px] shrink-0 rounded-full" style={{ backgroundColor: s.dot }} />
					<View className="flex-1 gap-0.5">
						<Text className="text-[9px] font-bold tracking-wide" style={{ color: s.sub }}>
							{slot.id}
						</Text>
						<Text
							className="text-[13px] font-bold leading-[15px]"
							style={{ color: s.text }}
							numberOfLines={1}
						>
							{slot.dayName}
						</Text>
					</View>
					{canInteract && (
						<View className="absolute top-1 right-1.5">
							<Ionicons name="ellipsis-horizontal" size={12} color={s.sub} style={{ opacity: 0.6 }} />
						</View>
					)}
				</Pressable>
			)}
		</View>
	);
}

const LEGEND: { key: StyleKey; label: string }[] = [
	{ key: "past", label: "Vyzvednuto" },
	{ key: "present", label: "Nyní" },
	{ key: "future", label: "Nadcházející" },
	{ key: "overdue", label: "Zmeškáno" },
];

export default function DeviceScreen() {
	const [alertsEnabled, setAlertsEnabled] = useState(true);
	const [slotStatuses, setSlotStatuses] = useState(() => computeStatuses(8, 0, 20, 0));
	const [alarmLabels, setAlarmLabels] = useState({ morning: "08:00", evening: "20:00" });
	const alarmTimes = useRef({ mh: 8, mm: 0, eh: 20, em: 0 });
	const bottomSheetRef = useRef<BottomSheetModal>(null);
	const router = useRouter();
	const isConnected = useBleDeviceStore((state) => state.isConnected);
	const battery = useBleDeviceStore((state) => state.battery);
	const temperature = useBleDeviceStore((state) => state.temperature);
	const slotsA = useBleDeviceStore((state) => state.slotsA);
	const slotsB = useBleDeviceStore((state) => state.slotsB);
	const setSlotTaken = useBleDeviceStore((state) => state.setSlotTaken);
	const lastSyncTime = useBleDeviceStore((state) => state.lastSyncTime);

	const handleSetTaken = useCallback(
		(col: "A" | "B", id: string, taken: boolean) => {
			setSlotTaken(col, id, taken);
			// Rebuild the 14-bit integer and write to board
			const { slotsA: a, slotsB: b } = useBleDeviceStore.getState();
			let cupState = 0;
			a.forEach((s, i) => {
				if (s.taken) cupState |= 1 << i;
			});
			b.forEach((s, i) => {
				if (s.taken) cupState |= 1 << (i + 7);
			});
			BleWrapperModule.writeCupState(cupState).catch(console.error);
			updateDeviceSettings({ cup_state: cupState });
		},
		[setSlotTaken],
	);

	const loadSettings = useCallback(() => {
		const s = getDeviceSettings();
		if (s) {
			if (s.alerts_enabled !== null && s.alerts_enabled !== undefined) {
				setAlertsEnabled(s.alerts_enabled === 1);
			}
			const mh = s.alarm_morning_h ?? 8;
			const mm = s.alarm_morning_m ?? 0;
			const eh = s.alarm_evening_h ?? 20;
			const em = s.alarm_evening_m ?? 0;
			alarmTimes.current = { mh, mm, eh, em };
			setAlarmLabels({
				morning: `${String(mh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
				evening: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`,
			});
			setSlotStatuses(computeStatuses(mh, mm, eh, em));
		}
	}, []);

	useFocusEffect(loadSettings);

	useEffect(() => {
		const recalc = () => {
			const { mh, mm, eh, em } = alarmTimes.current;
			setSlotStatuses(computeStatuses(mh, mm, eh, em));
		};
		const interval = setInterval(recalc, 60_000);
		return () => clearInterval(interval);
	}, []);

	const takenCount = [...slotsA, ...slotsB].filter((s) => s.taken).length;

	return (
		<SafeAreaView className="bg-zinc-50 dark:bg-zinc-950 flex-1">
			<View className="px-5 pb-4 pt-2">
				<View className="flex-row items-center justify-between">
					<View className={!isConnected ? "invisible" : ""}>
						<Text className="text-zinc-900 dark:text-white text-[22px] font-bold">Lékovka Alpha</Text>
						<Text className="text-zinc-500 mt-0.5 text-[13px]">{takenCount} ze 14 léků vyzvednuto</Text>
					</View>

					<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
						<BluetoothStatusPill
							isConnected={isConnected}
							onPress={() => bottomSheetRef.current?.present()}
						/>
						{isConnected && (
							<Pressable
								onPress={() => router.push("/settings")}
								className="active:opacity-60"
								style={{
									width: 36,
									height: 36,
									borderRadius: 12,
									alignItems: "center",
									justifyContent: "center",
									backgroundColor: "#eab30820",
									borderWidth: 1,
									borderColor: "#eab30850",
								}}
							>
								<Ionicons name="settings" size={18} color="#eab308" />
							</Pressable>
						)}
					</View>
				</View>
			</View>

			{isConnected ? (
				<>
					<View className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl p-4 gap-[5px] mx-4 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
						<View className="flex-row gap-1.5 pb-2">
							<View className="flex-1 items-center gap-0.5">
								<Text className="text-zinc-900 dark:text-white text-[14px] font-semibold">RÁNO</Text>
								<Text className="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium">
									{alarmLabels.morning}
								</Text>
							</View>
							<View className="flex-1 items-center gap-0.5">
								<Text className="text-zinc-900 dark:text-white text-[14px] font-semibold">VEČER</Text>
								<Text className="text-zinc-400 dark:text-zinc-500 text-[11px] font-medium">
									{alarmLabels.evening}
								</Text>
							</View>
						</View>

						{slotsA.map((slotA, i) => (
							<View key={i} className="flex-1 flex-row gap-1.5">
								<SlotCell
									slot={slotA}
									status={slotStatuses.statusA[i]}
									onSetTaken={(t) => handleSetTaken("A", slotA.id, t)}
								/>
								<SlotCell
									slot={slotsB[i]}
									status={slotStatuses.statusB[i]}
									onSetTaken={(t) => handleSetTaken("B", slotsB[i].id, t)}
								/>
							</View>
						))}
					</View>

					<View className="mt-3.5 flex-row justify-center gap-5">
						{LEGEND.map((item) => (
							<View key={item.label} className="flex-row items-center gap-1.5">
								<View
									style={{
										width: 8,
										height: 8,
										borderRadius: 2,
										backgroundColor: STATUS_STYLE[item.key].dot,
									}}
								/>
								<Text className="text-zinc-500 text-[11px]">{item.label}</Text>
							</View>
						))}
					</View>

					<View className="mt-8 flex-row mx-4 gap-3">
						<View className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
							<View className="mb-2 flex-row items-center gap-2">
								<View className="h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
									<Ionicons name="battery-half" size={20} color="#22c55e" />
								</View>
								<Text className="text-zinc-500 text-[13px] font-semibold tracking-wide">BATERIE</Text>
							</View>
							<Text className="text-zinc-900 dark:text-white text-[22px] font-bold">
								{battery !== null ? `${battery} %` : "--"}
							</Text>
						</View>

						<View className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
							<View className="mb-2 flex-row items-center gap-2">
								<View className="h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
									<Ionicons name="thermometer" size={20} color="#f97316" />
								</View>
								<Text className="text-zinc-500 text-[13px] font-semibold tracking-wide">TEPLOTA</Text>
							</View>
							<Text className="text-zinc-900 dark:text-white text-[22px] font-bold">
								{temperature !== null ? `${temperature} °C` : "--"}
							</Text>
						</View>
					</View>

					{lastSyncTime && (
						<Text className="mt-4 text-center text-[10px] font-medium tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
							Poslední synchronizace:{" "}
							{lastSyncTime.toLocaleString("cs-CZ", {
								day: "numeric",
								month: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})}
						</Text>
					)}
				</>
			) : (
				<View className="flex-1 items-center justify-center gap-4 px-10 pb-[60px]">
					<View
						style={{
							marginBottom: 8,
							width: 96,
							height: 96,
							borderRadius: 48,
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: "#eab30880",
						}}
					>
						<Ionicons name="bluetooth" size={40} color="#713f12" />
					</View>

					<Text className="text-zinc-900 dark:text-white text-center text-[22px] font-semibold">
						Lékovka mimo dosah
					</Text>

					<Text className="text-zinc-500 text-center text-[15px] leading-[22px]">
						Pro konfiguraci lékovky se k ní prosím přibližte.
					</Text>
				</View>
			)}

			<SettingsBottomSheet ref={bottomSheetRef}>
				<Text className="text-zinc-900 dark:text-white text-[18px] font-bold mb-4">Nastavení lékovky</Text>

				<View className="gap-3">
					<View className="flex-row items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
						<View className="flex-row items-center gap-4">
							<View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center">
								<Ionicons name="volume-high" size={20} color={alertsEnabled ? "#3b82f6" : "#71717a"} />
							</View>
							<Text className="text-zinc-900 dark:text-white text-[15px] font-medium">
								Zvukové upozornění
							</Text>
						</View>

						<Switch
							value={alertsEnabled}
							onValueChange={async (val) => {
								try {
									await BleWrapperModule.setAlertsEnabled(val);
									setAlertsEnabled(val);
									updateDeviceSettings({ alerts_enabled: val });
								} catch (e) {
									console.error(e);
								}
							}}
							trackColor={{ false: "#3f3f46", true: "#3b82f6" }}
							thumbColor="#ffffff"
						/>
					</View>

					<Pressable
						onPress={async () => {
							try {
								await BleWrapperModule.findMy();
							} catch (e) {
								console.error(e);
							}
						}}
						className="flex-row items-center p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 active:opacity-70"
					>
						<View className="w-10 h-10 rounded-full bg-red-500/10 items-center justify-center mr-4">
							<Ionicons name="location" size={20} color="#ef4444" />
						</View>
						<Text className="text-zinc-900 dark:text-white text-[15px] font-medium flex-1">
							Najít lékovku
						</Text>
						<Ionicons name="chevron-forward" size={18} color="#71717a" />
					</Pressable>

					<Pressable
						onPress={async () => {
							try {
								await BleWrapperModule.syncTime();
								Alert.alert("Úspěch", "Čas byl synchronizován s telefonem.");
							} catch (e) {
								console.error(e);
								Alert.alert("Chyba", "Nepodařilo se synchronizovat čas.");
							}
						}}
						className="flex-row items-center p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 active:opacity-70"
					>
						<View className="w-10 h-10 rounded-full bg-indigo-500/10 items-center justify-center mr-4">
							<Ionicons name="time" size={20} color="#6366f1" />
						</View>
						<Text className="text-zinc-900 dark:text-white text-[15px] font-medium flex-1">
							Synchronizovat čas
						</Text>
						<Ionicons name="chevron-forward" size={18} color="#71717a" />
					</Pressable>
				</View>
			</SettingsBottomSheet>
		</SafeAreaView>
	);
}
