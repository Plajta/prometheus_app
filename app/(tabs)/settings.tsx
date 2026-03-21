import { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface RowProps {
	icon: IoniconsName;
	iconBg?: string;
	iconColor?: string;
	label: string;
	value?: string;
	toggle?: boolean;
	onToggle?: (v: boolean) => void;
	chevron?: boolean;
	danger?: boolean;
	onPress?: () => void;
}

function SettingRow({
	icon,
	iconBg = "#27272a",
	iconColor = "#14b8a6",
	label,
	value,
	toggle,
	onToggle,
	chevron = false,
	danger = false,
	onPress,
}: RowProps) {
	return (
		<Pressable
			onPress={onPress}
			className="flex-row items-center px-4 py-3.5 active:bg-zinc-800/40"
		>
			<View
				style={{ backgroundColor: iconBg }}
				className="w-9 h-9 rounded-xl items-center justify-center mr-3"
			>
				<Ionicons name={icon} size={17} color={iconColor} />
			</View>
			<Text
				className={`flex-1 text-base ${danger ? "text-red-400" : "text-white"}`}
			>
				{label}
			</Text>
			{value !== undefined && (
				<Text className="text-zinc-500 text-sm mr-1.5">{value}</Text>
			)}
			{toggle !== undefined && onToggle && (
				<Switch
					value={toggle}
					onValueChange={onToggle}
					trackColor={{ false: "#3f3f46", true: "#0d9488" }}
					thumbColor={toggle ? "#5eead4" : "#a1a1aa"}
				/>
			)}
			{chevron && <Ionicons name="chevron-forward" size={15} color="#52525b" />}
		</Pressable>
	);
}

function Divider() {
	return <View className="h-px bg-zinc-800 mx-4" />;
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<View className="mb-5">
			<Text className="text-zinc-500 text-xs font-bold tracking-widest uppercase px-4 mb-2">
				{title}
			</Text>
			<View className="bg-zinc-900 rounded-2xl overflow-hidden mx-4 border border-zinc-800">
				{children}
			</View>
		</View>
	);
}

export default function SettingsScreen() {
	const [caregiverNotif, setCaregiverNotif] = useState(false);
	const router = useRouter();

	return (
		<SafeAreaView className="flex-1 bg-zinc-950">
			<StatusBar style="light" />
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 40 }}
			>
				<View className="px-4 pt-2 pb-5">
					<Text className="text-white text-2xl font-bold">Nastavení</Text>
				</View>

				{/* Device */}
				<Section title="Lékovka">
					<SettingRow
						icon="bluetooth"
						iconBg="#0d2d29"
						iconColor="#2dd4bf"
						label="Lékovka Alpha"
						value="připojeno"
						chevron
					/>
					<Divider />
					<SettingRow
						icon="battery-half"
						iconBg="#0d2d16"
						iconColor="#4ade80"
						label="Baterie"
						value="78 %"
					/>
					<Divider />
					<SettingRow
						icon="thermometer"
						iconBg="#0d2d29"
						iconColor="#14b8a6"
						label="Teplota uvnitř"
						value="21.3 °C"
					/>
					<Divider />
					<SettingRow
						icon="sync"
						iconBg="#1e1b2e"
						iconColor="#a78bfa"
						label="Poslední synchronizace"
						value="dnes 08:42"
					/>
				</Section>

				{/* Notifications */}
				<Section title="Upozornění">
					<SettingRow
						icon="notifications"
						iconBg="#27272a"
						iconColor="#a1a1aa"
						label="Čas připomenutí"
						value="z plánu"
						chevron
					/>
					<Divider />
					<SettingRow
						icon="time"
						iconBg="#2d1e0d"
						iconColor="#f59e0b"
						label="Eskalace po"
						value="15 min"
						chevron
					/>
					<Divider />
					<SettingRow
						icon="person"
						iconBg="#0d1a2d"
						iconColor="#60a5fa"
						label="Notifikace pečovateli"
						toggle={caregiverNotif}
						onToggle={setCaregiverNotif}
					/>
				</Section>

				{/* Sharing */}
				<Section title="Sdílení">
					<SettingRow
						icon="person-add"
						iconBg="#0d2d1a"
						iconColor="#34d399"
						label="Přidat pečovatele"
						chevron
					/>
				</Section>

				{/* Supply */}
				<Section title="Zásoba">
					<SettingRow
						icon="alert-circle"
						iconBg="#2d1e0d"
						iconColor="#f59e0b"
						label="Upozornit předem"
						value="7 dní"
						chevron
					/>
				</Section>

				{/* Data */}
				<Section title="Data">
					<SettingRow
						icon="cloud-download"
						iconBg="#1e1b2e"
						iconColor="#818cf8"
						label="Exportovat zálohu"
						chevron
					/>
					<Divider />
					<SettingRow
						icon="trash"
						iconBg="#2d0d0d"
						iconColor="#f87171"
						label="Smazat všechna data"
						danger
						chevron
					/>
				</Section>

				{/* Onboarding shortcut */}
				<Section title="Nastavení">
					<SettingRow
						icon="refresh-circle"
						iconBg="#0d2d29"
						iconColor="#2dd4bf"
						label="Spustit průvodce znovu"
						chevron
						onPress={() => router.push("/(onboarding)")}
					/>
				</Section>

				<Text className="text-center text-zinc-700 text-xs mt-2 mb-4">
					Lékovka v1.0.0 · Prometheus
				</Text>
			</ScrollView>
		</SafeAreaView>
	);
}
