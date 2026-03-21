import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const SERVER_URL = "http://192.168.31.111:8000";

export interface Schedule {
	id: string;
	device_id: string;
	scheduled_time: string;
	confirmed: boolean;
	confirmed_at: string | null;
	job_id: string | null;
	created_at: string;
}

/** Jeden záznám ve family tabulce — watcher sleduje watched. */
export interface FamilyRelation {
	id: string;
	watcher_device_id: string;
	watched_device_id: string;
	name: string;
	created_at?: string;
}

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${SERVER_URL}${path}`, {
		headers: { "Content-Type": "application/json" },
		...options,
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.detail ?? `Server error ${response.status}`);
	}

	return response.json();
}

export async function registerUser(deviceId: string, expoPushToken: string): Promise<{ ok: boolean }> {
	return request("/users/register", {
		method: "POST",
		body: JSON.stringify({
			device_id: deviceId,
			expo_push_token: expoPushToken,
		}),
	});
}

export async function createSchedule(
	deviceId: string,
	scheduledTime: string,
	graceMinutes: number = 10,
): Promise<{ id: string; check_at: string }> {
	return request("/schedules", {
		method: "POST",
		body: JSON.stringify({
			device_id: deviceId,
			scheduled_time: scheduledTime,
			grace_minutes: graceMinutes,
		}),
	});
}

export async function updateSchedule(
	scheduleId: string,
	scheduledTime: string,
	graceMinutes?: number,
	label?: string,
): Promise<void> {
	await request<unknown>(`/schedules/${scheduleId}`, {
		method: "PATCH",
		body: JSON.stringify({
			scheduled_time: scheduledTime,
			...(graceMinutes !== undefined && { grace_minutes: graceMinutes }),
			...(label !== undefined && { label }),
		}),
	});
}

export async function confirmSchedule(scheduleId: string): Promise<{ ok: boolean }> {
	return request(`/schedules/${scheduleId}/confirm`, { method: "POST" });
}

export async function deleteSchedule(scheduleId: string): Promise<{ ok: boolean }> {
	return request(`/schedules/${scheduleId}`, { method: "DELETE" });
}

/**
 * Kdo sleduje daného uživatele — dostane push když nepotvrdí.
 * GET /family/watchers/{watched_device_id}
 */
export async function getWatchers(watchedDeviceId: string): Promise<FamilyRelation[]> {
	return request(`/family/watchers/${encodeURIComponent(watchedDeviceId)}`);
}

/**
 * Které uživatele daný watcher sleduje.
 * GET /family/watching/{watcher_device_id}
 */
export async function getWatching(watcherDeviceId: string): Promise<FamilyRelation[]> {
	return request(`/family/watching/${encodeURIComponent(watcherDeviceId)}`);
}

/**
 * Přidá vztah: watcher dostává push za watched.
 * POST /family  { watcher_device_id, watched_device_id, name }
 */
export async function addFamilyRelation(
	watcherDeviceId: string,
	watchedDeviceId: string,
	name: string,
): Promise<{ id: string }> {
	return request("/family", {
		method: "POST",
		body: JSON.stringify({
			watcher_device_id: watcherDeviceId,
			watched_device_id: watchedDeviceId,
			name,
		}),
	});
}

/**
 * Smaže family vztah podle jeho ID.
 * DELETE /family/{family_id}
 */
export async function deleteFamilyRelation(familyId: string): Promise<void> {
	await request(`/family/${familyId}`, { method: "DELETE" });
}

export async function registerDevice(): Promise<{
	deviceId: string;
	expoPushToken: string;
}> {
	const [deviceId, expoPushToken] = await Promise.all([getDeviceId(), registerForPushNotifications()]);

	await registerUser(deviceId, expoPushToken);

	return { deviceId, expoPushToken };
}
