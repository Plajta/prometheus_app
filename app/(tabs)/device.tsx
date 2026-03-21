import { View, Text, Dimensions, useColorScheme, TouchableOpacity } from "react-native";
import { useState } from "react";
import BleWrapperModule from "~/modules/ble-wrapper/src/BleWrapperModule";
import { useDeviceStore } from "~/store/useDeviceStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width: SW } = Dimensions.get("window");

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

const CELL_W = (SW - H_MARGIN * 2 - INNER_PAD * 2 - COL_GAP) / 2;
const CELL_H = 58;

function SlotCell({ slot, isDark }: { slot: Slot; isDark: boolean }) {
	const bg = slot.taken ? (isDark ? "#14532d" : "#dcfce7") : isDark ? "#7f1d1d" : "#fee2e2";
	const border = slot.taken ? (isDark ? "#22c55e" : "#4ade80") : isDark ? "#ef4444" : "#f87171";
	const text = slot.taken ? (isDark ? "#bbf7d0" : "#166534") : isDark ? "#fecaca" : "#991b1b";
	const subText = slot.taken ? (isDark ? "#4ade80" : "#15803d") : isDark ? "#f87171" : "#b91c1c";
	const dot = slot.taken ? "#22c55e" : "#ef4444";

	return (
		<View
			style={{
				width: CELL_W,
				height: CELL_H,
				backgroundColor: bg,
				borderColor: border,
				borderWidth: slot.taken ? 1.5 : 1,
				borderRadius: 12,
				paddingHorizontal: 10,
				paddingVertical: 8,
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
			}}
		>
			<View
				style={{
					width: 7,
					height: 7,
					borderRadius: 99,
					backgroundColor: dot,
					flexShrink: 0,
				}}
			/>

			<View style={{ flex: 1, gap: 2 }}>
				<Text style={{ color: subText, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 }}>{slot.id}</Text>
				<Text style={{ color: text, fontSize: 13, fontWeight: "700", lineHeight: 15 }} numberOfLines={1}>
					{slot.dayName}
				</Text>
			</View>
		</View>
	);
}

function ActionButton({
	icon,
	iconColor,
	label,
	onPress,
	isDark,
}: {
	icon: React.ComponentProps<typeof Ionicons>["name"];
	iconColor: string;
	label: string;
	onPress: () => void;
	isDark: boolean;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.7}
			style={{
				flex: 1,
				backgroundColor: isDark ? "#18181b" : "#f4f4f5",
				borderWidth: 1,
				borderColor: isDark ? "#27272a" : "#e4e4e7",
				borderRadius: 16,
				padding: 14,
				alignItems: "center",
				gap: 4,
			}}
		>
			<Ionicons name={icon} size={20} color={iconColor} />
			<Text
				style={{ color: isDark ? "#ffffff" : "#18181b", fontSize: 12, fontWeight: "600", textAlign: "center" }}
			>
				{label}
			</Text>
		</TouchableOpacity>
	);
}

const LEGEND = [
	{ color: "#22c55e", label: "vyzvednuto" },
	{ color: "#ef4444", label: "nevyzvednuto" },
] as const;

const takenCount = [...COL_A, ...COL_B].filter((s) => s.taken).length;

export default function DeviceScreen() {
	const isDark = useColorScheme() === "dark";
	const [ledOn, setLedOn] = useState(false);

	const isConnected = useDeviceStore((state) => state.isConnected);

	const deviceBg = isDark ? "#141417" : "#f4f4f5";
	const deviceBorder = isDark ? "#2e2e33" : "#d4d4d8";
	const textPrimary = isDark ? "#ffffff" : "#18181b";

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#09090b" : "#fafafa" }}>
			<View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 }}>
				<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
					<View className={!isConnected ? "invisible" : ""}>
						<Text style={{ color: textPrimary, fontSize: 22, fontWeight: "700" }}>Lékovka Alpha</Text>
						<Text style={{ color: "#71717a", fontSize: 13, marginTop: 2 }}>
							{takenCount} ze 14 léků vyzvednuto
						</Text>
					</View>

					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 6,
							paddingHorizontal: 12,
							paddingVertical: 8,
							borderRadius: 12,
							backgroundColor: isConnected
								? isDark
									? "#422006"
									: "#fefce8"
								: isDark
									? "#18181b"
									: "#f4f4f5",
							borderWidth: 1,
							borderColor: isConnected
								? isDark
									? "#eab30840"
									: "#fef08a"
								: isDark
									? "#27272a"
									: "#e4e4e7",
						}}
					>
						<View
							style={{
								width: 7,
								height: 7,
								borderRadius: 99,
								backgroundColor: isConnected ? "#eab308" : "#a1a1aa",
							}}
						/>
						<Ionicons name="bluetooth" size={14} color={isConnected ? "#eab308" : "#a1a1aa"} />
					</View>
				</View>
			</View>

			{isConnected ? (
				<>
					<View
						style={{
							marginHorizontal: H_MARGIN,
							backgroundColor: deviceBg,
							borderColor: deviceBorder,
							borderWidth: 1.5,
							borderRadius: 24,
							padding: INNER_PAD,
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 2 },
							shadowOpacity: isDark ? 0.4 : 0.08,
							shadowRadius: 12,
							elevation: 4,
						}}
					>
						<View style={{ flexDirection: "row", gap: COL_GAP, marginBottom: 12 }}>
							<View style={{ width: CELL_W, alignItems: "center" }}>
								<Text style={{ color: textPrimary, fontSize: 14, fontWeight: "600" }}>RÁNO</Text>
							</View>
							<View style={{ width: CELL_W, alignItems: "center" }}>
								<Text style={{ color: textPrimary, fontSize: 14, fontWeight: "600" }}>VEČER</Text>
							</View>
						</View>

						{COL_A.map((slotA, i) => (
							<View
								key={i}
								style={{
									flexDirection: "row",
									gap: COL_GAP,
									marginBottom: i < COL_A.length - 1 ? ROW_GAP : 0,
								}}
							>
								<SlotCell slot={slotA} isDark={isDark} />
								<SlotCell slot={COL_B[i]} isDark={isDark} />
							</View>
						))}
					</View>

					<View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 14 }}>
						{LEGEND.map((item) => (
							<View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
								<View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: item.color }} />
								<Text style={{ color: "#71717a", fontSize: 11 }}>{item.label}</Text>
							</View>
						))}
					</View>

					<View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 16 }}>
						<ActionButton
							icon="bulb"
							iconColor={ledOn ? "#eab308" : "#71717a"}
							label="LED"
							onPress={async () => {
								try {
									await BleWrapperModule.setLed(!ledOn);
									setLedOn(!ledOn);
								} catch (e) {
									console.error(e);
								}
							}}
							isDark={isDark}
						/>
					</View>
				</>
			) : (
				<View
					style={{
						flex: 1,
						justifyContent: "center",
						alignItems: "center",
						paddingHorizontal: 40,
						paddingBottom: 60,
						gap: 16,
					}}
				>
					<View
						style={{
							width: 96,
							height: 96,
							borderRadius: 48,
							backgroundColor: "#eab308",
							justifyContent: "center",
							alignItems: "center",
							marginBottom: 8,
						}}
					>
						<Ionicons name="bluetooth" size={40} color="#713f12" />
					</View>

					<Text style={{ color: textPrimary, fontSize: 22, fontWeight: "600", textAlign: "center" }}>
						Lékovka mimo dosah
					</Text>

					<Text style={{ color: "#71717a", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
						Pro konfiguraci lékovky se k ní prosím přibližte.
					</Text>
				</View>
			)}
		</SafeAreaView>
	);
}
