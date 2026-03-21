import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type DoseStatus = "waiting" | "taken" | "missed" | "skipped";

interface Dose {
	id: string;
	medicationName: string;
	strength: string;
	compartment: string;
	status: DoseStatus;
	foodRelation?: string;
}

interface TimeGroup {
	id: string;
	label: string;
	time: string;
	doses: Dose[];
}

const INITIAL_DATA: TimeGroup[] = [
	{
		id: "morning",
		label: "Ráno",
		time: "08:00",
		doses: [
			{
				id: "1",
				medicationName: "Metformin",
				strength: "500 mg",
				compartment: "A1",
				status: "taken",
				foodRelation: "s jídlem",
			},
			{
				id: "2",
				medicationName: "Atorvastatin",
				strength: "20 mg",
				compartment: "A2",
				status: "taken",
			},
		],
	},
	{
		id: "noon",
		label: "Poledne",
		time: "13:00",
		doses: [
			{
				id: "3",
				medicationName: "Metformin",
				strength: "500 mg",
				compartment: "A1",
				status: "waiting",
				foodRelation: "s jídlem",
			},
		],
	},
	{
		id: "evening",
		label: "Večer",
		time: "21:00",
		doses: [
			{
				id: "4",
				medicationName: "Metformin",
				strength: "500 mg",
				compartment: "A1",
				status: "waiting",
			},
			{
				id: "5",
				medicationName: "Ramipril",
				strength: "5 mg",
				compartment: "B1",
				status: "waiting",
			},
		],
	},
];

function formatDate(date: Date): string {
	return date.toLocaleDateString("cs-CZ", {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
}

function StatusPill({ status }: { status: DoseStatus }) {
	const map = {
		waiting: { container: "bg-zinc-200 dark:bg-zinc-800", text: "text-zinc-600 dark:text-zinc-400", label: "čeká" },
		taken: { container: "bg-teal-100 dark:bg-teal-950", text: "text-teal-700 dark:text-teal-400", label: "vzato" },
		missed: { container: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-400", label: "zmeškáno" },
		skipped: { container: "bg-zinc-100 dark:bg-zinc-900", text: "text-zinc-500 dark:text-zinc-500", label: "přeskočeno" },
	};
	const c = map[status];
	return (
		<View className={`px-2.5 py-1 rounded-full ${c.container}`}>
			<Text className={`text-xs font-semibold ${c.text}`}>
				{c.label}
			</Text>
		</View>
	);
}

function DoseRow({
	dose,
	onPress,
	onLongPress,
}: {
	dose: Dose;
	onPress: () => void;
	onLongPress: () => void;
}) {
	const dotClass =
		dose.status === "taken"
			? "bg-teal-400"
			: dose.status === "missed"
				? "bg-red-400"
				: "bg-zinc-300 dark:bg-zinc-700";

	return (
		<Pressable
			onPress={onPress}
			onLongPress={onLongPress}
			className="flex-row items-center px-4 py-3.5 active:bg-zinc-200/50 dark:active:bg-zinc-800/40"
		>
			<View className={`w-2 h-2 rounded-full mr-3 ${dotClass}`} />
			<View className="flex-1">
				<View className="flex-row items-center gap-2">
					<Text className="text-zinc-900 dark:text-white font-semibold text-base">
						{dose.medicationName}
					</Text>
					<Text className="text-zinc-500 dark:text-zinc-400 text-sm">{dose.strength}</Text>
				</View>
				<View className="flex-row items-center gap-2 mt-0.5">
					<Text className="text-zinc-500 dark:text-zinc-600 text-xs">
						Přihrádka {dose.compartment}
					</Text>
					{dose.foodRelation && (
						<>
							<Text className="text-zinc-300 dark:text-zinc-700">·</Text>
							<Text className="text-zinc-500 dark:text-zinc-600 text-xs">{dose.foodRelation}</Text>
						</>
					)}
				</View>
			</View>
			<StatusPill status={dose.status} />
		</Pressable>
	);
}

function TimeSection({
	group,
	onDosePress,
	onDoseLongPress,
}: {
	group: TimeGroup;
	onDosePress: (id: string) => void;
	onDoseLongPress: (id: string) => void;
}) {
	const allTaken = group.doses.every((d) => d.status === "taken");

	return (
		<View className="mb-5">
			<View className="flex-row items-center px-4 mb-2">
				<Text className="text-zinc-500 text-xs font-bold tracking-widest uppercase">
					{group.label}
				</Text>
				<Text className="text-zinc-900 dark:text-zinc-300 font-medium text-xs ml-2">{group.time}</Text>
				{allTaken && (
					<View className="ml-auto">
						<Ionicons name="checkmark-circle" size={16} color="#14b8a6" />
					</View>
				)}
			</View>
			<View className="mx-4 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
				{group.doses.map((dose, index) => (
					<View key={dose.id}>
						{index > 0 && <View className="h-px bg-zinc-100 dark:bg-zinc-800 mx-4" />}
						<DoseRow
							dose={dose}
							onPress={() => onDosePress(dose.id)}
							onLongPress={() => onDoseLongPress(dose.id)}
						/>
					</View>
				))}
			</View>
		</View>
	);
}

export default function TodayScreen() {
	const [groups, setGroups] = useState<TimeGroup[]>(INITIAL_DATA);
	const bleConnected = true;
	const lowStockMed = "Metformin";
	const lowStockDays = 5;

	const allDoses = groups.flatMap((g) => g.doses);
	const takenCount = allDoses.filter((d) => d.status === "taken").length;
	const totalCount = allDoses.length;
	const progress = totalCount > 0 ? takenCount / totalCount : 0;

	function toggleDose(doseId: string) {
		setGroups((prev) =>
			prev.map((group) => ({
				...group,
				doses: group.doses.map((dose) =>
					dose.id === doseId
						? { ...dose, status: dose.status === "taken" ? "waiting" : "taken" }
						: dose,
				),
			})),
		);
	}

	function handleLongPress(doseId: string) {
		Alert.alert("Možnosti dávky", undefined, [
			{
				text: "Přeskočit",
				onPress: () =>
					setGroups((prev) =>
						prev.map((group) => ({
							...group,
							doses: group.doses.map((dose) =>
								dose.id === doseId ? { ...dose, status: "skipped" } : dose,
							),
						})),
					),
			},
			{ text: "Odložit o 15 min", style: "default" },
			{ text: "Zrušit", style: "cancel" },
		]);
	}

	return (
		<SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* Header */}
				<View className="px-4 pt-2 pb-5">
					<View className="flex-row items-start justify-between">
						<View>
							<Text className="text-zinc-500 text-sm capitalize">
								{formatDate(new Date())}
							</Text>
							<Text className="text-zinc-900 dark:text-white text-2xl font-bold mt-0.5">
								Dnešní dávky
							</Text>
						</View>

						{/* BLE badge */}
						<Pressable className="flex-row items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 mt-1 active:border-zinc-300 dark:active:border-zinc-700">
							<View
								className={`w-1.5 h-1.5 rounded-full ${bleConnected ? "bg-teal-400" : "bg-zinc-400 dark:bg-zinc-500"}`}
							/>
							<Ionicons
								name="bluetooth"
								size={15}
								color={bleConnected ? "#2dd4bf" : "#71717a"}
							/>
						</Pressable>
					</View>

					{/* Progress bar */}
					<View className="mt-4">
						<View className="flex-row justify-between mb-1.5">
							<Text className="text-zinc-500 text-xs font-medium">
								Dnešní pokrok
							</Text>
							<Text className="text-teal-600 dark:text-teal-400 text-xs font-bold">
								{takenCount}/{totalCount} dávek
							</Text>
						</View>
						<View className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
							<View
								className="h-full bg-teal-500 rounded-full"
								style={{ width: `${progress * 100}%` }}
							/>
						</View>
					</View>
				</View>

				{/* Low stock banner */}
				{lowStockMed && (
					<View className="mx-4 mb-5 flex-row items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 rounded-2xl px-4 py-3">
						<Ionicons name="warning" size={18} color="#f59e0b" />
						<Text className="text-amber-800 dark:text-amber-400 text-sm flex-1">
							<Text className="font-bold">{lowStockMed}</Text> dojde za{" "}
							<Text className="font-bold">{lowStockDays} dní</Text>
						</Text>
					</View>
				)}

				{/* Time groups */}
				<View className="pb-8">
					{groups.map((group) => (
						<TimeSection
							key={group.id}
							group={group}
							onDosePress={toggleDose}
							onDoseLongPress={handleLongPress}
						/>
					))}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
