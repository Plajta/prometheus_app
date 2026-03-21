import { useMemo } from "react";
import { View, Text, ScrollView, Pressable, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type DayStatus = "full" | "partial" | "missed" | "future";

const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

// Deterministic mock data so it doesn't change on re-render
const SEED_DATA: DayStatus[] = [
	"full", "full", "partial", "full", "full", "full", "missed",
	"full", "partial", "full", "full", "missed", "full", "full",
	"full", "full", "full", "partial", "full", "missed", "full",
	"full", "full", "full", "full", "partial", "full", "full",
	"full", "missed", "full", "full", "full", "full", "partial",
	"full", "full", "full", "full", "full", "missed", "full",
	"full", "full", "partial", "full", "full", "full", "full",
	"full", "full", "full", "missed", "full", "full", "partial",
	"full", "full", "full", "full", "full", "partial", "full",
	"full", "full", "full", "missed", "full", "full", "full",
	"full", "partial", "full", "full", "full", "full", "full",
	"full", "partial", "full", "full", "future", "future", "future",
];

function buildHeatmapData(): { date: Date; status: DayStatus }[] {
	const today = new Date();
	const startOffset = 83;
	return SEED_DATA.slice(0, 84).map((status, i) => {
		const date = new Date(today);
		date.setDate(today.getDate() - (startOffset - i));
		return { date, status };
	});
}

function HeatmapCell({ status }: { status: DayStatus }) {
	const isDark = useColorScheme() === "dark";
	const bg = {
		full: "#14b8a6",
		partial: "#f59e0b",
		missed: "#ef4444",
		future: isDark ? "#27272a" : "#f4f4f5", // zinc-800 / zinc-100
	}[status];

	return <View style={{ backgroundColor: bg, width: 32, height: 32, borderRadius: 6 }} />;
}

function Heatmap() {
	const data = useMemo(() => buildHeatmapData(), []);

	// Group by ISO week rows (7 days each)
	const weeks: typeof data[] = [];
	for (let i = 0; i < data.length; i += 7) {
		weeks.push(data.slice(i, i + 7));
	}

	return (
		<View>
			{/* Day headers */}
			<View className="flex-row gap-1 mb-1.5">
				{DAY_LABELS.map((d) => (
					<View key={d} style={{ width: 32 }} className="items-center">
						<Text className="text-zinc-400 dark:text-zinc-600 text-xs">{d}</Text>
					</View>
				))}
			</View>

			{/* Grid */}
			{weeks.map((week, wi) => (
				<View key={wi} className="flex-row gap-1 mb-1">
					{week.map((day, di) => (
						<HeatmapCell key={di} status={day.status} />
					))}
				</View>
			))}

			{/* Legend */}
			<View className="flex-row gap-4 mt-4">
				{[
					{ color: "#14b8a6", label: "Vše vzato" },
					{ color: "#f59e0b", label: "Část" },
					{ color: "#ef4444", label: "Zmeškáno" },
				].map((item) => (
					<View key={item.label} className="flex-row items-center gap-1.5">
						<View
							style={{ backgroundColor: item.color, width: 10, height: 10, borderRadius: 3 }}
						/>
						<Text className="text-zinc-500 text-xs">{item.label}</Text>
					</View>
				))}
			</View>
		</View>
	);
}

function StatCard({
	label,
	value,
	subtitle,
}: {
	label: string;
	value: number;
	subtitle: string;
}) {
	const textColor =
		value >= 80 ? "#14b8a6" : value >= 60 ? "#f59e0b" : "#ef4444";

	return (
		<View className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
			<Text className="text-zinc-500 text-xs font-bold tracking-widest uppercase">
				{label}
			</Text>
			<Text style={{ color: textColor }} className="text-4xl font-black mt-1">
				{value}%
			</Text>
			<Text className="text-zinc-500 dark:text-zinc-600 text-xs mt-1">{subtitle}</Text>
		</View>
	);
}

function WeeklyBar({ day, percent }: { day: string; percent: number }) {
	const color = percent >= 80 ? "#14b8a6" : percent >= 60 ? "#f59e0b" : "#ef4444";
	return (
		<View className="items-center gap-1.5" style={{ flex: 1 }}>
			<Text className="text-zinc-500 text-xs">{percent}%</Text>
			<View className="w-6 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden" style={{ height: 60 }}>
				<View
					style={{
						height: `${percent}%`,
						backgroundColor: color,
						position: "absolute",
						bottom: 0,
						left: 0,
						right: 0,
						borderRadius: 9999,
					}}
				/>
			</View>
			<Text className="text-zinc-400 dark:text-zinc-600 text-xs">{day}</Text>
		</View>
	);
}

const WEEKLY_DATA = [
	{ day: "Po", percent: 100 },
	{ day: "Út", percent: 67 },
	{ day: "St", percent: 100 },
	{ day: "Čt", percent: 100 },
	{ day: "Pá", percent: 33 },
	{ day: "So", percent: 100 },
	{ day: "Ne", percent: 67 },
];

export default function OverviewScreen() {
	return (
		<SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 40 }}
			>
				{/* Header */}
				<View className="px-4 pt-2 pb-4">
					<Text className="text-zinc-900 dark:text-white text-2xl font-bold">Přehled</Text>
				</View>

				{/* Stat cards */}
				<View className="flex-row gap-3 px-4 mb-4">
					<StatCard label="Tento týden" value={87} subtitle="6 z 7 dnů kompletní" />
					<StatCard label="Tento měsíc" value={76} subtitle="23 z 30 dnů kompletní" />
				</View>

				{/* This week bar chart */}
				<View className="mx-4 mb-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
					<Text className="text-zinc-900 dark:text-white font-semibold text-base mb-4">
						Tento týden
					</Text>
					<View className="flex-row justify-between items-end">
						{WEEKLY_DATA.map((d) => (
							<WeeklyBar key={d.day} day={d.day} percent={d.percent} />
						))}
					</View>
				</View>

				{/* Heatmap */}
				<View className="mx-4 mb-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
					<View className="flex-row items-center justify-between mb-4">
						<Text className="text-zinc-900 dark:text-white font-semibold text-base">
							Docházka — 12 týdnů
						</Text>
					</View>
					<Heatmap />
				</View>

				{/* Export */}
				<Pressable className="mx-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 flex-row items-center gap-3 active:border-teal-500/40">
					<View className="w-10 h-10 bg-teal-50 dark:bg-teal-500/15 rounded-xl items-center justify-center">
						<Ionicons name="document-text" size={20} color="#14b8a6" />
					</View>
					<View className="flex-1">
						<Text className="text-zinc-900 dark:text-white font-semibold">Exportovat pro lékaře</Text>
						<Text className="text-zinc-500 text-sm">PDF za poslední 3 měsíce</Text>
					</View>
					<Ionicons name="chevron-forward" size={16} color="#52525b" />
				</Pressable>
			</ScrollView>
		</SafeAreaView>
	);
}
