import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const SUMMARY: { icon: IoniconsName; label: string; value: string }[] = [
	{ icon: "bluetooth", label: "Lékovka spárována", value: "Lékovka Alpha" },
	{ icon: "medkit", label: "Lék přidán", value: "Metformin 500 mg" },
	{ icon: "time", label: "Časy dávek", value: "08:00 · 13:00 · 21:00" },
	{ icon: "grid", label: "Přihrádka", value: "A1" },
	{ icon: "restaurant", label: "Vztah k jídlu", value: "S jídlem" },
];

function StepDots() {
	return (
		<View className="flex-row gap-2 px-6 pt-4">
			{[0, 1, 2].map((i) => (
				<View key={i} className="h-1 flex-1 rounded-full bg-teal-500" />
			))}
		</View>
	);
}

export default function OnboardingDone() {
	const router = useRouter();

	return (
		<SafeAreaView className="flex-1 bg-zinc-950">
			<StatusBar style="light" />
			<StepDots />

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ flexGrow: 1 }}
			>
				{/* Hero */}
				<View className="items-center pt-12 pb-8 px-6">
					<View
						className="w-32 h-32 rounded-full items-center justify-center mb-6"
						style={{
							backgroundColor: "#0d2d29",
							borderWidth: 2,
							borderColor: "#14b8a655",
						}}
					>
						<Ionicons name="checkmark-circle" size={64} color="#14b8a6" />
					</View>
					<Text className="text-white text-3xl font-black text-center">
						Vše připraveno!
					</Text>
					<Text className="text-zinc-500 text-base text-center mt-3 leading-relaxed">
						Vaše lékovka je nastavena a připravena k použití. Připomínky začnou
						fungovat od první naplánované dávky.
					</Text>
				</View>

				{/* Summary card */}
				<View className="px-6 mb-8">
					<Text className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-3">
						Shrnutí nastavení
					</Text>
					<View className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
						{SUMMARY.map((item, i) => (
							<View key={i}>
								{i > 0 && <View className="h-px bg-zinc-800" />}
								<View className="flex-row items-center px-4 py-3.5">
									<View className="w-9 h-9 rounded-xl bg-zinc-800 items-center justify-center mr-3">
										<Ionicons name={item.icon} size={16} color="#14b8a6" />
									</View>
									<Text className="text-zinc-400 flex-1 text-sm">{item.label}</Text>
									<Text className="text-white text-sm font-semibold">
										{item.value}
									</Text>
								</View>
							</View>
						))}
					</View>
				</View>
			</ScrollView>

			<View className="px-6 pb-8">
				<Pressable
					onPress={() => router.replace("/(tabs)")}
					className="bg-teal-500 rounded-2xl py-4 items-center active:bg-teal-600"
				>
					<Text className="text-white font-black text-lg tracking-wide">
						Začít
					</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
}
