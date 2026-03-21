import { getStoredSchedule, saveSchedule } from "~/lib/database";
import { createSchedule, updateSchedule, getDeviceId } from "~/lib/notifications";
import { useDeviceStore } from "~/store/useDeviceStore";

function getNextAlarmTime(mH: number, mM: number, eH: number, eM: number): Date {
	const now = new Date();
	const monday = new Date();
	const day = monday.getDay();
	monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
	monday.setHours(0, 0, 0, 0);

	const events: Date[] = [];
	for (let d = 0; d < 7; d++) {
		const base = new Date(monday);
		base.setDate(monday.getDate() + d);
		const morning = new Date(base);
		morning.setHours(mH, mM, 0, 0);
		events.push(morning);
		const evening = new Date(base);
		evening.setHours(eH, eM, 0, 0);
		events.push(evening);
	}

	const upcoming = events.filter((e) => e >= now);
	return upcoming.length > 0 ? upcoming[0] : events[events.length - 1];
}

export async function syncSchedule(mH: number, mM: number, eH: number, eM: number) {
	const deviceId = useDeviceStore.getState().deviceId ?? (await getDeviceId().catch(() => null));
	if (!deviceId) return;

	const presentTime = getNextAlarmTime(mH, mM, eH, eM);
	const isoTime = new Date(presentTime.getTime() + 60 * 60 * 1000).toISOString().replace("Z", "+01:00");

	const stored = getStoredSchedule();

	if (stored != null) {
		const timesMatch =
			stored.alarm_morning_h === mH &&
			stored.alarm_morning_m === mM &&
			stored.alarm_evening_h === eH &&
			stored.alarm_evening_m === eM;

		if (timesMatch) return;

		// Times changed — PATCH, fallback to CREATE if server doesn't know the ID
		try {
			await updateSchedule(stored.schedule_id, isoTime, 2);
			saveSchedule(stored.schedule_id, mH, mM, eH, eM);
		} catch {
			const { id } = await createSchedule(deviceId, isoTime, 2);
			saveSchedule(id, mH, mM, eH, eM);
		}
	} else {
		const { id } = await createSchedule(deviceId, isoTime, 2);
		saveSchedule(id, mH, mM, eH, eM);
	}
}
