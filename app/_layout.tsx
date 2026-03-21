import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { setupDatabase } from "../lib/database";

export default function Layout() {
	useEffect(() => {
		try {
			setupDatabase();
		} catch (error) {
			console.error("Database setup failed:", error);
		}
	}, []);

	return (
		<SafeAreaProvider>
			<Stack screenOptions={{ headerShown: false }} />
			<StatusBar style="auto" />
		</SafeAreaProvider>
	);
}
