import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { setupDatabase } from "~/lib/database";
import BleWrapperModule from "~/modules/ble-wrapper/src/BleWrapperModule";
import { useBleDeviceStore } from "~/store/useBleDeviceStore";
import { PermissionsAndroid, Platform } from "react-native";
import { registerDevice } from "~/lib/notifications";
import { useDeviceStore } from "~/store/useDeviceStore";

export default function Layout() {
	useEffect(() => {
		try {
			setupDatabase();
		} catch (error) {
			console.error("Database setup failed:", error);
		}

		registerDevice()
			.then(({ deviceId }) => useDeviceStore.setState(() => ({ deviceId })))
			.catch(console.error);

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

				await BleWrapperModule.connectToXiao();
			} catch (e) {
				console.error(e);
			}
		})();

		// if (Platform.OS === "android") {
		useBleDeviceStore.getState().setIsConnected(BleWrapperModule.isConnected());

		const connSub = BleWrapperModule.addListener("onDeviceConnected", async (event) => {
			useBleDeviceStore.getState().setIsConnected(event.connected);
			if (event.connected) {
				try {
					const stateStr = await BleWrapperModule.readCupState();
					useBleDeviceStore.getState().setCupState(parseInt(stateStr, 10));
					const batteryStr = await BleWrapperModule.readBattery();
					useBleDeviceStore.getState().setBattery(parseInt(batteryStr, 10));
				} catch (e) {
					console.error("Failed to read initial state on connect:", e);
				}
			}
		});

		const disconnSub = BleWrapperModule.addListener("onDeviceDisconnected", (event) => {
			useBleDeviceStore.getState().setIsConnected(event.connected);
		});

		const tempSub = BleWrapperModule.addListener("onTemperatureData", (event) => {
			useBleDeviceStore.getState().setTemperature(event.temperature);
		});

		const batterySub = BleWrapperModule.addListener("onBatteryLevel", (event) => {
			useBleDeviceStore.getState().setBattery(event.level);
		});

		const cupSub = BleWrapperModule.addListener("onCupStateChanged", (event) => {
			useBleDeviceStore.getState().setCupState(event.state);
		});

		return () => {
			connSub.remove();
			disconnSub.remove();
			tempSub.remove();
			batterySub.remove();
			cupSub.remove();
		};
		// } else {
		// 	useBleDeviceStore.getState().setIsConnected(true);
		// }
	}, []);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<BottomSheetModalProvider>
					<Stack screenOptions={{ headerShown: false, animation: "none" }} />
					<StatusBar style="auto" />
				</BottomSheetModalProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
