import { View, Text, Switch, Alert, Pressable } from "react-native";
import { useState, useRef, useEffect } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BleWrapperModule from "~/modules/ble-wrapper/src/BleWrapperModule";
import { useBleDeviceStore, Slot } from "~/store/useBleDeviceStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BluetoothStatusPill } from "~/components/BluetoothStatusPill";
import { SettingsBottomSheet } from "~/components/SettingsBottomSheet";
import { getDeviceSettings, updateDeviceSettings } from "~/lib/database";
function SlotCell({ slot }: { slot: Slot }) {
	const bgClass = slot.taken
		? "bg-green-100 border-green-500 dark:bg-green-900/40 dark:border-green-500"
		: "bg-zinc-100 border-zinc-300 dark:bg-zinc-800/40 dark:border-zinc-700";
	const textClass = slot.taken ? "text-green-800 dark:text-green-200" : "text-zinc-500 dark:text-zinc-400";
	const subTextClass = slot.taken ? "text-green-600 dark:text-green-500" : "text-zinc-400 dark:text-zinc-500";
	const dotClass = slot.taken ? "bg-green-500" : "bg-zinc-400 dark:bg-zinc-500";

	return (
		<View className={`flex-1 flex-row items-center gap-2 rounded-xl px-2.5 py-1 opacity-50 ${bgClass} border`}>
			<View className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
			<View className="flex-1 gap-0.5">
				<Text className={`text-[9px] font-bold tracking-widest ${subTextClass}`}>{slot.id}</Text>
				<Text className={`text-[13px] font-bold leading-[15px] ${textClass}`} numberOfLines={1}>
					{slot.dayName}
				</Text>
			</View>
		</View>
	);
}

const LEGEND = [
	{ color: "#22c55e", label: "vybrano" },
	{ color: "#a1a1aa", label: "nevybrano" },
] as const;

export default function DeviceScreen() {
	const [ledOn, setLedOn] = useState(false);
	const [alertsEnabled, setAlertsEnabled] = useState(true);
	const bottomSheetRef = useRef<BottomSheetModal>(null);
	const isConnected = useBleDeviceStore((state) => state.isConnected);
	const battery = useBleDeviceStore((state) => state.battery);
	const temperature = useBleDeviceStore((state) => state.temperature);
	const slotsA = useBleDeviceStore((state) => state.slotsA);
	const slotsB = useBleDeviceStore((state) => state.slotsB);
	const lastSyncTime = useBleDeviceStore((state) => state.lastSyncTime);

	useEffect(() => {
		const s = getDeviceSettings();
		if (s && s.alerts_enabled !== null && s.alerts_enabled !== undefined) {
			setAlertsEnabled(s.alerts_enabled === 1);
		}
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

					<BluetoothStatusPill isConnected={isConnected} onPress={() => bottomSheetRef.current?.present()} />
				</View>
			</View>

			{isConnected ? (
				<>
					<View className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl p-4 gap-[5px] mx-4 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
						<View className="flex-row gap-1.5 pb-2">
							<View className="flex-1 items-center">
								<Text className="text-zinc-900 dark:text-white text-[14px] font-semibold">RÁNO</Text>
							</View>
							<View className="flex-1 items-center">
								<Text className="text-zinc-900 dark:text-white text-[14px] font-semibold">VEČER</Text>
							</View>
						</View>

						{slotsA.map((slotA, i) => (
							<View key={i} className="flex-1 flex-row gap-1.5">
								<SlotCell slot={slotA} />
								<SlotCell slot={slotsB[i]} />
							</View>
						))}
					</View>

					<View className="mt-3.5 flex-row justify-center gap-5">
						{LEGEND.map((item) => (
							<View key={item.label} className="flex-row items-center gap-1.5">
								<View style={{ backgroundColor: item.color }} className="h-2 w-2 rounded-sm opacity-50" />
								<Text className="text-zinc-500 text-[11px]">{item.label}</Text>
							</View>
						))}
					</View>

					<View className="mt-8 flex-row mx-4 gap-3">
						<View className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
							<View className="mb-2 flex-row items-center gap-2">
								<View className="h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
									<Ionicons
										name="battery-half"
										size={20}
										color="#22c55e"
									/>
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
									<Ionicons
										name="thermometer"
										size={20}
										color="#f97316"
									/>
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
							Poslední synchronizace: {lastSyncTime.toLocaleString("cs-CZ", {
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
					<View className="mb-2 h-24 w-24 items-center justify-center rounded-full bg-yellow-500">
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
							<View className="w-10 h-10 rounded-full bg-yellow-500/10 items-center justify-center">
								<Ionicons name="bulb" size={20} color={ledOn ? "#eab308" : "#71717a"} />
							</View>
							<Text className="text-zinc-900 dark:text-white text-[15px] font-medium">
								Světelná indikace
							</Text>
						</View>
					</View>

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
