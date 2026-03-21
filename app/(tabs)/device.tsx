import { View, Text, Switch } from "react-native";
import { useState, useRef } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BleWrapperModule from "~/modules/ble-wrapper/src/BleWrapperModule";
import { useDeviceStore } from "~/store/useDeviceStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BluetoothStatusPill } from "~/components/BluetoothStatusPill";
import { SettingsBottomSheet } from "~/components/SettingsBottomSheet";

interface Slot {
	id: string;
	dayName: string;
	timeLabel: string;
	taken: boolean;
}

const DAYS = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];

const COL_A: Slot[] = DAYS.map((day, i) => ({
	id: `A${i + 1}`,
	dayName: day,
	timeLabel: "Ráno",
	taken: i < 3,
}));

const COL_B: Slot[] = DAYS.map((day, i) => ({
	id: `B${i + 1}`,
	dayName: day,
	timeLabel: "Večer",
	taken: i < 2,
}));

const H_MARGIN = 16;
const INNER_PAD = 12;
const COL_GAP = 6;
const ROW_GAP = 5;

function SlotCell({ slot }: { slot: Slot }) {
	const bgClass = slot.taken
		? "bg-green-100 border-green-500 dark:bg-green-900/40 dark:border-green-500"
		: "bg-red-100 border-red-500 dark:bg-red-900/40 dark:border-red-500";
	const textClass = slot.taken ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200";
	const subTextClass = slot.taken ? "text-green-600 dark:text-green-500" : "text-red-500 dark:text-red-400";
	const dotClass = slot.taken ? "bg-green-500" : "bg-red-500";
	const borderW = slot.taken ? "border-[1.5px]" : "border";

	return (
		<View className={`flex-1 flex-row items-center gap-2 rounded-xl px-2.5 py-1 ${bgClass} ${borderW}`}>
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
	{ color: "#22c55e", label: "vyzvednuto" },
	{ color: "#ef4444", label: "nevyzvednuto" },
] as const;

const takenCount = [...COL_A, ...COL_B].filter((s) => s.taken).length;

export default function DeviceScreen() {
	const [ledOn, setLedOn] = useState(false);
	const bottomSheetRef = useRef<BottomSheetModal>(null);
	const isConnected = useDeviceStore((state) => state.isConnected);
	const battery = useDeviceStore((state) => state.battery);
	const temperature = useDeviceStore((state) => state.temperature);

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
					<View
						style={{ marginHorizontal: H_MARGIN, padding: INNER_PAD }}
						className="flex-1 border-zinc-300 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 rounded-[24px] border-[1.5px] shadow-sm"
					>
						<View className="mb-3 flex-row" style={{ gap: COL_GAP }}>
							<View className="flex-1 items-center">
								<Text className="text-zinc-900 dark:text-white text-[14px] font-semibold">RÁNO</Text>
							</View>
							<View className="flex-1 items-center">
								<Text className="text-zinc-900 dark:text-white text-[14px] font-semibold">VEČER</Text>
							</View>
						</View>

						{COL_A.map((slotA, i) => (
							<View
								key={i}
								className="flex-1 flex-row"
								style={{
									gap: COL_GAP,
									marginBottom: i < COL_A.length - 1 ? ROW_GAP : 0,
								}}
							>
								<SlotCell slot={slotA} />
								<SlotCell slot={COL_B[i]} />
							</View>
						))}
					</View>

					<View className="mt-3.5 flex-row justify-center gap-5">
						{LEGEND.map((item) => (
							<View key={item.label} className="flex-row items-center gap-1.5">
								<View style={{ backgroundColor: item.color }} className="h-2 w-2 rounded-sm" />
								<Text className="text-zinc-500 text-[11px]">{item.label}</Text>
							</View>
						))}
					</View>

					<View className="mt-8 flex-row gap-4 px-1">
						<View className="flex-1 rounded-[24px] border-[1.5px] border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
							<View className="mb-2 flex-row items-center gap-2">
								<View className="h-8 w-8 items-center justify-center rounded-full bg-green-500/15">
									<Ionicons
										name="battery-half"
										size={16}
										className="text-green-600 dark:text-green-500"
									/>
								</View>
								<Text className="text-zinc-500 text-[13px] font-semibold tracking-wide">BATERIE</Text>
							</View>
							<Text className="text-zinc-900 dark:text-white text-[22px] font-bold">
								{battery !== null ? `${battery} %` : "--"}
							</Text>
						</View>

						<View className="flex-1 rounded-[24px] border-[1.5px] border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
							<View className="mb-2 flex-row items-center gap-2">
								<View className="h-8 w-8 items-center justify-center rounded-full bg-orange-500/15">
									<Ionicons
										name="thermometer"
										size={16}
										className="text-orange-600 dark:text-orange-500"
									/>
								</View>
								<Text className="text-zinc-500 text-[13px] font-semibold tracking-wide">TEPLOTA</Text>
							</View>
							<Text className="text-zinc-900 dark:text-white text-[22px] font-bold">
								{temperature !== null ? `${temperature} °C` : "--"}
							</Text>
						</View>
					</View>
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

				<View className="flex-row items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-800/60 rounded-[18px] border border-zinc-200 dark:border-zinc-800/80">
					<View className="flex-row items-center gap-4">
						<View className="w-10 h-10 rounded-full bg-yellow-500/10 items-center justify-center">
							<Ionicons name="bulb" size={20} color={ledOn ? "#eab308" : "#71717a"} />
						</View>
						<Text className="text-zinc-900 dark:text-white text-[15px] font-medium">Světelná indikace</Text>
					</View>

					<Switch
						value={ledOn}
						onValueChange={async (val) => {
							try {
								await BleWrapperModule.setLed(val);
								setLedOn(val);
							} catch (e) {
								console.error(e);
							}
						}}
						trackColor={{ false: "#3f3f46", true: "#eab308" }}
						thumbColor="#ffffff"
					/>
				</View>
			</SettingsBottomSheet>
		</SafeAreaView>
	);
}
