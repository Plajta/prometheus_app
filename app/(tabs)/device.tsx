import { View, Text, Dimensions, useColorScheme, TouchableOpacity, PermissionsAndroid, Platform } from "react-native";
import { useState, useEffect } from "react";
import BleWrapperModule from "~/modules/ble-wrapper/src/BleWrapperModule";
import { useDeviceStore } from "~/store/useDeviceStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width: SW } = Dimensions.get("window");

type CStatus = "active" | "low" | "paused" | "empty";

interface Slot {
	id: string;
	name?: string;
	strength?: string;
	status: CStatus;
}

const COL_A: Slot[] = [
	{ id: "A1", name: "Metformin", strength: "500 mg", status: "active" },
	{ id: "A2", name: "Atorvastatin", strength: "20 mg", status: "active" },
	{ id: "A3", status: "empty" },
	{ id: "A4", status: "empty" },
	{ id: "A5", status: "empty" },
	{ id: "A6", status: "empty" },
	{ id: "A7", status: "empty" },
];

const COL_B: Slot[] = [
	{ id: "B1", name: "Ramipril", strength: "5 mg", status: "active" },
	{ id: "B2", name: "Metformin", strength: "500 mg", status: "low" },
	{ id: "B3", status: "empty" },
	{ id: "B4", status: "empty" },
	{ id: "B5", status: "empty" },
	{ id: "B6", status: "empty" },
	{ id: "B7", name: "Amlodipine", strength: "10 mg", status: "paused" },
];

const H_MARGIN = 16;
const INNER_PAD = 12;
const COL_GAP = 6; // gap between the two columns
const ROW_GAP = 5; // gap between rows

const CELL_W = (SW - H_MARGIN * 2 - INNER_PAD * 2 - COL_GAP) / 2;
const CELL_H = 58;

const DARK: Record<CStatus, { bg: string; border: string; text: string; sub: string; dot: string }> = {
	active: { bg: "#422006", border: "#eab308", text: "#fef9c3", sub: "#facc15", dot: "#eab308" },
	low: { bg: "#241a07", border: "#f59e0b", text: "#fef3c7", sub: "#f59e0b", dot: "#f59e0b" },
	paused: { bg: "#141414", border: "#3f3f46", text: "#a1a1aa", sub: "#52525b", dot: "#52525b" },
	empty: { bg: "#111113", border: "#1e1e21", text: "#3f3f46", sub: "#252528", dot: "transparent" },
};

const LIGHT: Record<CStatus, { bg: string; border: string; text: string; sub: string; dot: string }> = {
	active: { bg: "#fefce8", border: "#eab308", text: "#713f12", sub: "#ca8a04", dot: "#eab308" },
	low: { bg: "#fffbeb", border: "#f59e0b", text: "#713f12", sub: "#d97706", dot: "#f59e0b" },
	paused: { bg: "#f4f4f5", border: "#d4d4d8", text: "#71717a", sub: "#a1a1aa", dot: "#a1a1aa" },
	empty: { bg: "#f0f0f1", border: "#e4e4e7", text: "#c4c4c6", sub: "#e0e0e2", dot: "transparent" },
};

function SlotCell({ slot, isDark }: { slot: Slot; isDark: boolean }) {
	const c = (isDark ? DARK : LIGHT)[slot.status];
	const filled = slot.status !== "empty";

	return (
		<View
			style={{
				width: CELL_W,
				height: CELL_H,
				backgroundColor: c.bg,
				borderColor: c.border,
				borderWidth: filled ? 1.5 : 1,
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
					backgroundColor: filled ? c.dot : c.sub,
					flexShrink: 0,
				}}
			/>

			<View style={{ flex: 1, gap: 2 }}>
				<Text style={{ color: c.sub, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 }}>{slot.id}</Text>
				{filled ? (
					<Text style={{ color: c.text, fontSize: 12, fontWeight: "600", lineHeight: 15 }} numberOfLines={1}>
						{slot.name}
					</Text>
				) : (
					<Text style={{ color: c.sub, fontSize: 11 }}>—</Text>
				)}
				{filled && slot.strength && (
					<Text style={{ color: c.sub, fontSize: 10, fontWeight: "500" }}>{slot.strength}</Text>
				)}
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
	{ color: "#eab308", label: "aktivní" },
	{ color: "#f59e0b", label: "dochází" },
	{ color: "#71717a", label: "pauza" },
] as const;

const filledCount = [...COL_A, ...COL_B].filter((s) => s.status !== "empty").length;

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
							{filledCount} z 14 přihrádek obsazeno
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
						<View style={{ flexDirection: "row", gap: COL_GAP, marginBottom: 8 }}>
							{["A", "B"].map((label) => (
								<View key={label} style={{ width: CELL_W, alignItems: "center" }}>
									<Text
										style={{
											color: isDark ? "#3f3f46" : "#a1a1aa",
											fontSize: 9,
											fontWeight: "700",
											letterSpacing: 1.5,
										}}
									>
										ŘADA {label}
									</Text>
								</View>
							))}
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
