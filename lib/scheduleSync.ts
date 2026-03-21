import { getStoredSchedule, saveSchedule, getDeviceSettings } from "~/lib/database";
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

let syncing = false;

export async function syncSchedule(
	mH: number,
	mM: number,
	eH: number,
	eM: number,
	graceMinutesOverride?: number,
) {
	if (syncing) return;
	syncing = true;
	try {
	const deviceId = useDeviceStore.getState().deviceId ?? (await getDeviceId().catch(() => null));
	if (!deviceId) { syncing = false; return; }

	const presentTime = getNextAlarmTime(mH, mM, eH, eM);
	const isoTime = new Date(presentTime.getTime() + 60 * 60 * 1000).toISOString().replace("Z", "+01:00");

	const settings = getDeviceSettings();
	const graceMinutes =
		graceMinutesOverride ??
		(settings?.alarm_interval ? Math.floor(settings.alarm_interval / 60) : null);

	if (graceMinutes === null) return;

	const stored = getStoredSchedule();

	if (stored != null && stored.scheduled_time === isoTime && graceMinutesOverride === undefined) {
		// Already have a valid schedule for this exact slot — skip
		return;
	}

	if (stored != null) {
		// If stored schedule is in the past, it has expired — always CREATE new
		const storedTime = new Date(stored.scheduled_time);
		const isExpired = storedTime < new Date();

		if (isExpired) {
			const { id } = await createSchedule(deviceId, isoTime, graceMinutes);
			saveSchedule(id, isoTime, mH, mM, eH, eM);
		} else {
			// Future schedule exists but for a different slot/grace — PATCH, fallback to CREATE
			try {
				await updateSchedule(stored.schedule_id, isoTime, graceMinutes);
				saveSchedule(stored.schedule_id, isoTime, mH, mM, eH, eM);
			} catch {
				const { id } = await createSchedule(deviceId, isoTime, graceMinutes);
				saveSchedule(id, isoTime, mH, mM, eH, eM);
			}
		}
	} else {
		const { id } = await createSchedule(deviceId, isoTime, graceMinutes);
		saveSchedule(id, isoTime, mH, mM, eH, eM);
	}
	} finally {
		syncing = false;
	}
}
