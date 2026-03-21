import { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface RowProps {
	icon: IoniconsName;
	iconBgDark?: string;
	iconBgLight?: string;
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
	iconBgDark = "#27272a",
	iconBgLight = "#f4f4f5", // zinc-100
	iconColor = "#eab308",
	label,
	value,
	toggle,
	onToggle,
	chevron = false,
	danger = false,
	onPress,
}: RowProps) {
	const isDark = useColorScheme() === "dark";
	return (
		<Pressable
			onPress={onPress}
			className="flex-row items-center px-4 py-3.5 active:bg-zinc-100 dark:active:bg-zinc-800/40"
		>
			<View
				style={{ backgroundColor: isDark ? iconBgDark : iconBgLight }}
				className="w-9 h-9 rounded-xl items-center justify-center mr-3"
			>
				<Ionicons name={icon} size={17} color={iconColor} />
			</View>
			<Text
				className={`flex-1 text-base ${danger ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white"}`}
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
					trackColor={{ false: isDark ? "#3f3f46" : "#e4e4e7", true: "#ca8a04" }}
					thumbColor={toggle ? "#5eead4" : (isDark ? "#a1a1aa" : "#ffffff")}
				/>
			)}
			{chevron && <Ionicons name="chevron-forward" size={15} color="#a1a1aa" />}
		</Pressable>
	);
}

function Divider() {
	return <View className="h-px bg-zinc-200 dark:bg-zinc-800 mx-4" />;
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
			<View className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden mx-4 border border-zinc-200 dark:border-zinc-800">
				{children}
			</View>
		</View>
	);
}

export default function SettingsScreen() {
	const [caregiverNotif, setCaregiverNotif] = useState(false);
	const router = useRouter();
	const insets = useSafeAreaInsets();

	return (
		<View className="flex-1 bg-zinc-50 dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 40 }}
			>
				<View className="px-4 pt-2 pb-5">
					<Text className="text-zinc-900 dark:text-white text-2xl font-bold">Nastavení</Text>
				</View>

				{/* Device */}
				<Section title="Lékovka">
					<SettingRow
						icon="bluetooth"
						iconBgDark="#0d2d29"
						iconBgLight="#fef9c3"
						iconColor="#ca8a04"
						label="Lékovka Alpha"
						value="připojeno"
						chevron
					/>
					<Divider />
					<SettingRow
						icon="battery-half"
						iconBgDark="#0d2d16"
						iconBgLight="#dcfce7"
						iconColor="#16a34a"
						label="Baterie"
						value="78 %"
					/>
					<Divider />
					<SettingRow
						icon="thermometer"
						iconBgDark="#0d2d29"
						iconBgLight="#fef9c3"
						iconColor="#ca8a04"
						label="Teplota uvnitř"
						value="21.3 °C"
					/>
					<Divider />
					<SettingRow
						icon="sync"
						iconBgDark="#1e1b2e"
						iconBgLight="#e0e7ff"
						iconColor="#6366f1"
						label="Poslední synchronizace"
						value="dnes 08:42"
					/>
				</Section>

				{/* Notifications */}
				<Section title="Upozornění">
					<SettingRow
						icon="notifications"
						iconBgDark="#27272a"
						iconBgLight="#f4f4f5"
						iconColor="#52525b"
						label="Čas připomenutí"
						value="z plánu"
						chevron
					/>
					<Divider />
					<SettingRow
						icon="time"
						iconBgDark="#2d1e0d"
						iconBgLight="#fef3c7"
						iconColor="#d97706"
						label="Eskalace po"
						value="15 min"
						chevron
					/>
					<Divider />
					<SettingRow
						icon="person"
						iconBgDark="#0d1a2d"
						iconBgLight="#dbeafe"
						iconColor="#2563eb"
						label="Notifikace pečovateli"
						toggle={caregiverNotif}
						onToggle={setCaregiverNotif}
					/>
				</Section>

				{/* Sharing */}
				<Section title="Sdílení">
					<SettingRow
						icon="person-add"
						iconBgDark="#0d2d1a"
						iconBgLight="#d1fae5"
						iconColor="#059669"
						label="Přidat pečovatele"
						chevron
					/>
				</Section>

				{/* Supply */}
				<Section title="Zásoba">
					<SettingRow
						icon="alert-circle"
						iconBgDark="#2d1e0d"
						iconBgLight="#fef3c7"
						iconColor="#d97706"
						label="Upozornit předem"
						value="7 dní"
						chevron
					/>
				</Section>

				{/* Data */}
				<Section title="Data">
					<SettingRow
						icon="cloud-download"
						iconBgDark="#1e1b2e"
						iconBgLight="#e0e7ff"
						iconColor="#6366f1"
						label="Exportovat zálohu"
						chevron
					/>
					<Divider />
					<SettingRow
						icon="trash"
						iconBgDark="#2d0d0d"
						iconBgLight="#fee2e2"
						iconColor="#ef4444"
						label="Smazat všechna data"
						danger
						chevron
					/>
				</Section>

				{/* Onboarding shortcut */}
				<Section title="Základní">
					<SettingRow
						icon="refresh-circle"
						iconBgDark="#0d2d29"
						iconBgLight="#fef9c3"
						iconColor="#ca8a04"
						label="Spustit průvodce znovu"
						chevron
						onPress={() => router.push("/(onboarding)")}
					/>
				</Section>

				<Text className="text-center text-zinc-500 text-xs mt-2 mb-4">
					Lékovka v1.0.0 · Prometheus
				</Text>
			</ScrollView>
		</View>
	);
}
