import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { setupDatabase, saveDeviceState, getDeviceSettings } from "~/lib/database";
import BleWrapperModule from "~/modules/ble-wrapper/src/BleWrapperModule";
import { useBleDeviceStore } from "~/store/useBleDeviceStore";
import { PermissionsAndroid, Platform } from "react-native";
import { registerDevice } from "~/lib/notifications";
import { useDeviceStore } from "~/store/useDeviceStore";

export default function Layout() {
	useEffect(() => {
		try {
			setupDatabase();

			// Preload store from database state before we listen.
			const s = getDeviceSettings();
			if (s) {
				if (s.cup_state !== null && s.cup_state !== undefined) {
					useBleDeviceStore.getState().setCupState(s.cup_state);
				}
				if (s.last_seen !== null && s.last_seen !== undefined) {
					useBleDeviceStore.getState().setLastSyncTime(new Date(s.last_seen * 1000));
				}
			}
		} catch (error) {
			console.error("Database setup failed:", error);
		}

		const unsub = useBleDeviceStore.subscribe((state) => {
			saveDeviceState(state);
		});

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

		useBleDeviceStore.getState().setIsConnected(BleWrapperModule.isConnected());

		const connSub = BleWrapperModule.addListener("onDeviceConnected", async (event) => {
			useBleDeviceStore.getState().setIsConnected(event.connected);
			if (event.connected) {
				try {
					const batteryStr = await BleWrapperModule.readBattery();
					useBleDeviceStore.getState().setBattery(parseInt(batteryStr, 10));
					useBleDeviceStore.getState().setLastSyncTime(new Date());

					const settings = getDeviceSettings();
					if (settings) {
						if (settings.cup_state !== null && settings.cup_state !== undefined) {
							await BleWrapperModule.writeCupState(settings.cup_state);
						}

						if (settings.alerts_enabled !== null) {
							await BleWrapperModule.setAlertsEnabled(settings.alerts_enabled === 1);
						}
						if (settings.alarm_morning_h !== null && settings.alarm_morning_m !== null) {
							await BleWrapperModule.setAlarmMorning(settings.alarm_morning_h, settings.alarm_morning_m);
						}
						if (settings.alarm_evening_h !== null && settings.alarm_evening_m !== null) {
							await BleWrapperModule.setAlarmEvening(settings.alarm_evening_h, settings.alarm_evening_m);
						}
						if (settings.alarm_interval !== null) {
							await BleWrapperModule.setAlarmInterval(settings.alarm_interval);
						}

						await BleWrapperModule.syncTime();
					}
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
			useBleDeviceStore.getState().setLastSyncTime(new Date());
		});

		const batterySub = BleWrapperModule.addListener("onBatteryLevel", (event) => {
			useBleDeviceStore.getState().setBattery(event.level);
			useBleDeviceStore.getState().setLastSyncTime(new Date());
		});

		const cupSub = BleWrapperModule.addListener("onCupStateChanged", (event) => {
			useBleDeviceStore.getState().setCupState(event.state);
			useBleDeviceStore.getState().setLastSyncTime(new Date());
		});

		return () => {
			connSub.remove();
			disconnSub.remove();
			tempSub.remove();
			batterySub.remove();
			cupSub.remove();
			unsub();
		};
	}, []);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<BottomSheetModalProvider>
					<Stack screenOptions={{ headerShown: false, animation: "none" }}>
						<Stack.Screen name="index" />
						<Stack.Screen
							name="settings"
							options={{
								animation: "slide_from_right",
								gestureEnabled: true,
								gestureDirection: "horizontal",
								fullScreenGestureEnabled: true,
							}}
						/>
					</Stack>
					<StatusBar style="auto" />
				</BottomSheetModalProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
