import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

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
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: "#18181b",
					borderTopColor: "#27272a",
					borderTopWidth: 1,
					paddingBottom: Platform.OS === "ios" ? 0 : 8,
					height: Platform.OS === "ios" ? 82 : 65,
				},
				tabBarActiveTintColor: "#14b8a6",
				tabBarInactiveTintColor: "#52525b",
				tabBarLabelStyle: {
					fontSize: 11,
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
						<TabIcon
							name="calendar"
							outlineName="calendar-outline"
							focused={focused}
							color={color}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="medications"
				options={{
					title: "Léky",
					tabBarIcon: ({ focused, color }) => (
						<TabIcon
							name="medkit"
							outlineName="medkit-outline"
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
						<TabIcon
							name="stats-chart"
							outlineName="stats-chart-outline"
							focused={focused}
							color={color}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "Nastavení",
					tabBarIcon: ({ focused, color }) => (
						<TabIcon
							name="settings"
							outlineName="settings-outline"
							focused={focused}
							color={color}
						/>
					),
				}}
			/>
		</Tabs>
	);
}
