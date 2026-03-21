import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

interface Medication {
	id: string;
	name: string;
	strength: string;
	compartments: string[];
	stockPercent: number;
	stockDays: number;
	active: boolean;
}

const MOCK_MEDICATIONS: Medication[] = [
	{
		id: "1",
		name: "Metformin",
		strength: "500 mg",
		compartments: ["A1"],
		stockPercent: 28,
		stockDays: 5,
		active: true,
	},
	{
		id: "2",
		name: "Atorvastatin",
		strength: "20 mg",
		compartments: ["A2"],
		stockPercent: 74,
		stockDays: 22,
		active: true,
	},
	{
		id: "3",
		name: "Ramipril",
		strength: "5 mg",
		compartments: ["B1"],
		stockPercent: 58,
		stockDays: 18,
		active: true,
	},
	{
		id: "4",
		name: "Amlodipine",
		strength: "10 mg",
		compartments: ["B2", "B3"],
		stockPercent: 8,
		stockDays: 2,
		active: false,
	},
];

function stockColor(percent: number): string {
	if (percent > 40) return "#14b8a6";
	if (percent > 15) return "#f59e0b";
	return "#ef4444";
}

function stockTextClass(percent: number): string {
	if (percent > 40) return "text-teal-400";
	if (percent > 15) return "text-amber-400";
	return "text-red-400";
}

function MedicationCard({ medication }: { medication: Medication }) {
	return (
		<Pressable className="mx-4 mb-3 bg-zinc-900 rounded-2xl p-4 border border-zinc-800 active:border-zinc-700">
			<View className="flex-row items-start justify-between">
				<View className="flex-1 mr-3">
					<Text className="text-white font-bold text-lg leading-tight">
						{medication.name}
					</Text>
					<Text className="text-zinc-500 text-sm mt-0.5">{medication.strength}</Text>

					{/* Compartment chips */}
					<View className="flex-row gap-1.5 mt-2.5">
						{medication.compartments.map((c) => (
							<View key={c} className="bg-zinc-800 px-2 py-1 rounded-lg">
								<Text className="text-zinc-400 text-xs font-mono font-semibold">
									{c}
								</Text>
							</View>
						))}
					</View>
				</View>

				{/* Status badge */}
				<View
					className={`px-3 py-1.5 rounded-full ${medication.active ? "bg-teal-500/15" : "bg-zinc-800"}`}
				>
					<Text
						className={`text-xs font-semibold ${medication.active ? "text-teal-400" : "text-zinc-500"}`}
					>
						{medication.active ? "aktivní" : "pauza"}
					</Text>
				</View>
			</View>

			{/* Stock progress */}
			<View className="mt-4">
				<View className="flex-row justify-between items-center mb-1.5">
					<Text className="text-zinc-600 text-xs">Zásoba</Text>
					<Text className={`text-xs font-bold ${stockTextClass(medication.stockPercent)}`}>
						{medication.stockDays} dní zbývá
					</Text>
				</View>
				<View className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
					<View
						style={{
							width: `${medication.stockPercent}%`,
							backgroundColor: stockColor(medication.stockPercent),
						}}
						className="h-full rounded-full"
					/>
				</View>
			</View>
		</Pressable>
	);
}

export default function MedicationsScreen() {
	const router = useRouter();

	return (
		<SafeAreaView className="flex-1 bg-zinc-950">
			<StatusBar style="light" />

			{/* Header */}
			<View className="px-4 pt-2 pb-4 flex-row items-center justify-between">
				<Text className="text-white text-2xl font-bold">Léky</Text>
				<Pressable
					onPress={() => router.push("/(onboarding)/add-medication")}
					className="flex-row items-center gap-1.5 bg-teal-500 px-4 py-2.5 rounded-xl active:bg-teal-600"
				>
					<Ionicons name="add" size={18} color="white" />
					<Text className="text-white font-bold text-sm">Přidat</Text>
				</Pressable>
			</View>

			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
				{/* Active medications */}
				<Text className="text-zinc-600 text-xs font-bold tracking-widest uppercase px-4 mb-3">
					Aktivní · {MOCK_MEDICATIONS.filter((m) => m.active).length}
				</Text>
				{MOCK_MEDICATIONS.filter((m) => m.active).map((med) => (
					<MedicationCard key={med.id} medication={med} />
				))}

				{/* Paused medications */}
				{MOCK_MEDICATIONS.some((m) => !m.active) && (
					<>
						<Text className="text-zinc-600 text-xs font-bold tracking-widest uppercase px-4 mt-4 mb-3">
							Pozastavené · {MOCK_MEDICATIONS.filter((m) => !m.active).length}
						</Text>
						{MOCK_MEDICATIONS.filter((m) => !m.active).map((med) => (
							<MedicationCard key={med.id} medication={med} />
						))}
					</>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}
