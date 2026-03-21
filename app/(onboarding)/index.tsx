import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

type PairingState = "idle" | "scanning" | "found" | "connected";

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

export default function OnboardingPairing() {
	const router = useRouter();
	const [state, setState] = useState<PairingState>("idle");

	function handleScan() {
		setState("scanning");
		setTimeout(() => setState("found"), 2200);
	}

	function handleConnect() {
		setState("connected");
		setTimeout(() => router.push("/(onboarding)/add-medication"), 900);
	}

	const isConnected = state === "connected";
	const isFound = state === "found";
	const isScanning = state === "scanning";

	return (
		<SafeAreaView className="flex-1 bg-zinc-950">
			<StatusBar style="light" />
			<StepDots current={0} />

			<View className="flex-1 px-6 justify-center items-center">
				{/* Icon bubble */}
				<View
					className="w-32 h-32 rounded-3xl items-center justify-center mb-8"
					style={{
						backgroundColor: isConnected ? "#0d2d29" : "#18181b",
						borderWidth: 1.5,
						borderColor: isConnected ? "#eab308" : isFound ? "#2dd4bf55" : "#27272a",
					}}
				>
					{isScanning ? (
						<ActivityIndicator size="large" color="#eab308" />
					) : (
						<Ionicons
							name={isConnected ? "checkmark-circle" : "bluetooth"}
							size={54}
							color={isConnected ? "#eab308" : isFound ? "#facc15" : "#52525b"}
						/>
					)}
				</View>

				{/* Found device card */}
				{isFound && (
					<View className="mb-6 bg-zinc-900 border border-teal-500/30 rounded-2xl px-5 py-4 flex-row items-center gap-3 self-stretch">
						<View className="w-2.5 h-2.5 rounded-full bg-teal-400" />
						<View>
							<Text className="text-white font-bold">Lékovka Alpha</Text>
							<Text className="text-zinc-500 text-xs mt-0.5">
								BLE · AA:BB:CC:DD:EE:FF
							</Text>
						</View>
						<View className="ml-auto bg-teal-500/15 px-2.5 py-1 rounded-full">
							<Text className="text-teal-400 text-xs font-semibold">nalezeno</Text>
						</View>
					</View>
				)}

				<Text className="text-white text-3xl font-black text-center">
					{isConnected ? "Připojeno!" : "Párování lékovky"}
				</Text>
				<Text className="text-zinc-500 text-base text-center mt-3 leading-relaxed">
					{state === "idle" &&
						"Přibližte lékovku k telefonu a stiskněte tlačítko skenování."}
					{isScanning && "Hledám lékovku v okolí\u2026"}
					{isFound && "Lékovka nalezena. Potvrďte připojení."}
					{isConnected && "Lékovka je úspěšně spárována a připravena."}
				</Text>
			</View>

			{/* CTA */}
			<View className="px-6 pb-8 gap-3">
				{state === "idle" && (
					<Pressable
						onPress={handleScan}
						className="bg-teal-500 rounded-2xl py-4 items-center flex-row justify-center gap-2 active:bg-teal-600"
					>
						<Ionicons name="search" size={18} color="white" />
						<Text className="text-white font-bold text-base">Skenovat</Text>
					</Pressable>
				)}
				{isFound && (
					<Pressable
						onPress={handleConnect}
						className="bg-teal-500 rounded-2xl py-4 items-center active:bg-teal-600"
					>
						<Text className="text-white font-bold text-base">Připojit lékovku</Text>
					</Pressable>
				)}
				{(isScanning || isConnected) && (
					<View className="bg-zinc-800 rounded-2xl py-4 items-center opacity-60">
						<Text className="text-white font-bold text-base">
							{isScanning ? "Skenuji…" : "Přecházím…"}
						</Text>
					</View>
				)}

				<Pressable
					onPress={() => router.push("/(onboarding)/add-medication")}
					className="py-3 items-center"
				>
					<Text className="text-zinc-600 text-sm">Přeskočit</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
}
