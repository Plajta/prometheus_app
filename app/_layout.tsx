import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { setupDatabase } from "../lib/database";
import BleWrapperModule from "~/modules/ble-wrapper/src/BleWrapperModule";
import { useDeviceStore } from "~/store/useDeviceStore";
import { PermissionsAndroid, Platform } from "react-native";

export default function Layout() {
	useEffect(() => {
		try {
			setupDatabase();
		} catch (error) {
			console.error("Database setup failed:", error);
		}

		(async () => {
			try {
				if (Platform.OS === "android") {
					const granted = await PermissionsAndroid.requestMultiple([
						PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
						PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
						PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
					]);

					if (
						granted["android.permission.BLUETOOTH_SCAN"] !== "granted" ||
						granted["android.permission.BLUETOOTH_CONNECT"] !== "granted" ||
						granted["android.permission.ACCESS_FINE_LOCATION"] !== "granted"
					) {
						console.error("Bluetooth permissions denied");
						return;
					}
				}

				//await BleWrapperModule.connectToXiao();
			} catch (e) {
				console.error(e);
			}
		})();

		// Sync initial state
		// useDeviceStore.getState().setIsConnected(BleWrapperModule.isConnected());

		useDeviceStore.getState().setIsConnected(true);

		// Listen globally
		// const connSub = BleWrapperModule.addListener("onDeviceConnected", (event) => {
		// 	useDeviceStore.getState().setIsConnected(event.connected);
		// });
		// const disconnSub = BleWrapperModule.addListener("onDeviceDisconnected", (event) => {
		// 	useDeviceStore.getState().setIsConnected(event.connected);
		// });

		// return () => {
		// 	connSub.remove();
		// 	disconnSub.remove();
		// };
	}, []);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<BottomSheetModalProvider>
					<Stack screenOptions={{ headerShown: false }} />
					<StatusBar style="auto" />
				</BottomSheetModalProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
