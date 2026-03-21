import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const SERVER_URL = "http://192.168.31.111:8000";

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
});

export async function getDeviceId(): Promise<string> {
	if (Platform.OS === "ios") {
		const id = await Application.getIosIdForVendorAsync();
		if (!id) throw new Error("Nepodařilo se získat IDFV");
		return id;
	} else {
		const id = Application.getAndroidId();
		if (!id) throw new Error("Nepodařilo se získat Android ID");
		return id;
	}
}

export async function registerForPushNotifications(): Promise<string> {
	if (!Device.isDevice) {
		throw new Error("Push notifikace vyžadují fyzické zařízení");
	}

	const { status: existingStatus } = await Notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== "granted") {
		const { status } = await Notifications.requestPermissionsAsync();
		finalStatus = status;
	}

	if (finalStatus !== "granted") {
		throw new Error("Oprávnění pro notifikace nebylo uděleno");
	}

	const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
	return expoPushToken;
}

export async function registerDevice(): Promise<{
	deviceId: string;
	expoPushToken: string;
}> {
	const [deviceId, expoPushToken] = await Promise.all([getDeviceId(), registerForPushNotifications()]);

	const response = await fetch(`${SERVER_URL}/users/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ device_id: deviceId, expo_push_token: expoPushToken }),
	});

	if (!response.ok) {
		throw new Error("Registrace zařízení selhala");
	}

	return { deviceId, expoPushToken };
}
