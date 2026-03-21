import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

type ScanStep = "scan" | "configure";
type FoodRelation = "fasting" | "before" | "with" | "after" | "any";

const FOOD_OPTIONS: { id: FoodRelation; label: string; icon: string }[] = [
	{ id: "fasting", label: "Nalačno", icon: "🌙" },
	{ id: "before", label: "Před jídlem", icon: "⏱️" },
	{ id: "with", label: "S jídlem", icon: "🍽️" },
	{ id: "after", label: "Po jídle", icon: "✅" },
	{ id: "any", label: "Nezáleží", icon: "🔄" },
];

const COMPARTMENTS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2"];

const MOCK_DRUG = {
	name: "Metformin",
	strength: "500 mg",
	form: "tablety",
	count: 60,
	sukl: "0083455",
};

function StepDots({ current }: { current: number }) {
	return (
		<View className="flex-row gap-2 px-6 pt-4">
			{[0, 1, 2].map((i) => (
				<View
					key={i}
					className={`h-1 flex-1 rounded-full ${i <= current ? "bg-teal-500" : "bg-zinc-800"}`}
				/>
			))}
		</View>
	);
}

export default function AddMedication() {
	const router = useRouter();
	const [step, setStep] = useState<ScanStep>("scan");
	const [foodRelation, setFoodRelation] = useState<FoodRelation>("with");
	const [compartment, setCompartment] = useState("A1");
	const [times] = useState(["08:00", "13:00", "21:00"]);

	if (step === "scan") {
		return (
			<SafeAreaView className="flex-1 bg-zinc-950">
				<StatusBar style="light" />
				<StepDots current={1} />

				<View className="flex-1 px-6 justify-center items-center">
					<View className="w-32 h-32 rounded-3xl bg-zinc-900 border border-zinc-800 items-center justify-center mb-8">
						<Ionicons name="scan" size={50} color="#52525b" />
					</View>
					<Text className="text-white text-3xl font-black text-center">
						Přidat lék
					</Text>
					<Text className="text-zinc-500 text-base text-center mt-3 leading-relaxed">
						Naskenujte čárový kód na krabičce léku nebo ho vyhledejte ručně.
					</Text>
				</View>

				<View className="px-6 pb-8 gap-3">
					<Pressable
						onPress={() => setStep("configure")}
						className="bg-teal-500 rounded-2xl py-4 items-center flex-row justify-center gap-2 active:bg-teal-600"
					>
						<Ionicons name="barcode" size={20} color="white" />
						<Text className="text-white font-bold text-base">Skenovat kód</Text>
					</Pressable>
					<Pressable
						onPress={() => setStep("configure")}
						className="bg-zinc-900 border border-zinc-800 rounded-2xl py-4 items-center active:border-zinc-700"
					>
						<Text className="text-zinc-300 font-semibold text-base">
							Zadat ručně
						</Text>
					</Pressable>
					<Pressable
						onPress={() => router.push("/(onboarding)/done")}
						className="py-3 items-center"
					>
						<Text className="text-zinc-600 text-sm">Přeskočit</Text>
					</Pressable>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-zinc-950">
			<StatusBar style="light" />
			<StepDots current={1} />

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 20 }}
			>
				{/* SUKL result */}
				<View className="px-6 pt-5 pb-4">
					<Text className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-3">
						SÚKL databáze
					</Text>
					<View className="bg-zinc-900 border border-teal-500/30 rounded-2xl p-4">
						<View className="flex-row items-center gap-2 mb-2">
							<Ionicons name="checkmark-circle" size={15} color="#14b8a6" />
							<Text className="text-teal-400 text-xs font-semibold">
								Lék nalezen · kód {MOCK_DRUG.sukl}
							</Text>
						</View>
						<Text className="text-white text-xl font-bold">{MOCK_DRUG.name}</Text>
						<Text className="text-zinc-400 text-sm mt-0.5">
							{MOCK_DRUG.strength} · {MOCK_DRUG.form} · {MOCK_DRUG.count} ks
						</Text>
					</View>
				</View>

				{/* Times */}
				<View className="px-6 mb-4">
					<Text className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-3">
						Časy užívání
					</Text>
					<View className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
						{times.map((time, i) => (
							<View key={i}>
								{i > 0 && <View className="h-px bg-zinc-800" />}
								<View className="flex-row items-center px-4 py-3.5">
									<Ionicons name="time" size={16} color="#14b8a6" />
									<Text className="text-white font-semibold ml-3 flex-1 text-base">
										{time}
									</Text>
									<Ionicons name="chevron-forward" size={15} color="#52525b" />
								</View>
							</View>
						))}
						<View className="h-px bg-zinc-800" />
						<Pressable className="flex-row items-center px-4 py-3.5 gap-3 active:bg-zinc-800/40">
							<Ionicons name="add-circle" size={18} color="#14b8a6" />
							<Text className="text-teal-400 font-semibold">Přidat čas</Text>
						</Pressable>
					</View>
				</View>

				{/* Compartment */}
				<View className="px-6 mb-4">
					<Text className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-3">
						Přihrádka
					</Text>
					<View className="flex-row flex-wrap gap-2">
						{COMPARTMENTS.map((c) => (
							<Pressable
								key={c}
								onPress={() => setCompartment(c)}
								className="px-5 py-3 rounded-xl border"
								style={{
									backgroundColor: compartment === c ? "#0d2d29" : "#18181b",
									borderColor: compartment === c ? "#14b8a6" : "#27272a",
								}}
							>
								<Text
									className="font-mono font-bold text-base"
									style={{ color: compartment === c ? "#2dd4bf" : "#71717a" }}
								>
									{c}
								</Text>
							</Pressable>
						))}
					</View>
				</View>

				{/* Food relation */}
				<View className="px-6 mb-6">
					<Text className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-3">
						Vztah k jídlu
					</Text>
					<View className="flex-row flex-wrap gap-2">
						{FOOD_OPTIONS.map((opt) => (
							<Pressable
								key={opt.id}
								onPress={() => setFoodRelation(opt.id)}
								className="px-4 py-2.5 rounded-xl border flex-row items-center gap-1.5"
								style={{
									backgroundColor: foodRelation === opt.id ? "#0d2d29" : "#18181b",
									borderColor: foodRelation === opt.id ? "#14b8a6" : "#27272a",
								}}
							>
								<Text style={{ fontSize: 13 }}>{opt.icon}</Text>
								<Text
									className="text-sm font-semibold"
									style={{
										color: foodRelation === opt.id ? "#2dd4bf" : "#71717a",
									}}
								>
									{opt.label}
								</Text>
							</Pressable>
						))}
					</View>
				</View>
			</ScrollView>

			<View className="px-6 pb-8">
				<Pressable
					onPress={() => router.push("/(onboarding)/done")}
					className="bg-teal-500 rounded-2xl py-4 items-center active:bg-teal-600"
				>
					<Text className="text-white font-bold text-base">Pokračovat</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
}
