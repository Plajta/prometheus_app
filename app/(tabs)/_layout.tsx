import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({
	name,
	outlineName,
	focused,
	color,
}: {
	name: IconName;
	outlineName: IconName;
	focused: boolean;
	color: string;
}) {
	return <Ionicons name={focused ? name : outlineName} size={24} color={color} />;
}

export default function TabsLayout() {
	const isDark = useColorScheme() === "dark";
	const insets = useSafeAreaInsets();

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: isDark ? "#18181b" : "#ffffff",
					borderTopColor: isDark ? "#27272a" : "#e4e4e7",
					borderTopWidth: 1,
					paddingBottom: Platform.OS === "ios" ? 0 : insets.bottom + 8,
					height: Platform.OS === "ios" ? 82 : 65 + insets.bottom,
				},
				tabBarActiveTintColor: "#14b8a6",
				tabBarInactiveTintColor: isDark ? "#52525b" : "#a1a1aa",
				tabBarLabelStyle: {
					fontSize: 10,
					fontWeight: "600",
					marginTop: 2,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Dnes",
					tabBarIcon: ({ focused, color }) => (
						<TabIcon name="calendar" outlineName="calendar-outline" focused={focused} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="medications"
				options={{
					title: "Léky",
					tabBarIcon: ({ focused, color }) => (
						<TabIcon name="medkit" outlineName="medkit-outline" focused={focused} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="device"
				options={{
					title: "Lékovka",
					tabBarIcon: ({ focused, color }) => (
						<TabIcon
							name="hardware-chip"
							outlineName="hardware-chip-outline"
							focused={focused}
							color={color}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="overview"
				options={{
					title: "Přehled",
					tabBarIcon: ({ focused, color }) => (
						<TabIcon name="stats-chart" outlineName="stats-chart-outline" focused={focused} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "Nastavení",
					tabBarIcon: ({ focused, color }) => (
						<TabIcon name="settings" outlineName="settings-outline" focused={focused} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
