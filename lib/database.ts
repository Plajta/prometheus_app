import * as SQLite from "expo-sqlite";
import type { DeviceState } from "~/store/useBleDeviceStore";

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS device (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ble_id TEXT NOT NULL UNIQUE,
    name TEXT,
    battery INTEGER,
    temperature_c REAL,
    cup_state INTEGER DEFAULT 0,
    alerts_enabled INTEGER DEFAULT 1,
    alarm_morning_h INTEGER,
    alarm_morning_m INTEGER,
    alarm_evening_h INTEGER,
    alarm_evening_m INTEGER,
    alarm_interval INTEGER,
    last_seen INTEGER
);

CREATE TABLE IF NOT EXISTS temperature_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL REFERENCES device(id),
    measured_at INTEGER NOT NULL,
    temperature_c REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_temp_log_device ON temperature_log(device_id, measured_at);
`;

export const db = SQLite.openDatabaseSync("pillbox.db");

export function setupDatabase(forceWipe: boolean = false) {
	console.log("[DB] Starting database setup...");

	try {
		if (forceWipe) {
			console.log("[DB] Force wiping database...");
			const tables = db.getAllSync<{ name: string }>(
				`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
			);
			for (const table of tables) {
				db.execSync(`DROP TABLE IF EXISTS ${table.name};`);
			}
			console.log("[DB] Database wiped.");
		} else {
			const { count } = db.getFirstSync<{ count: number }>(
				`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='device'`,
			)!;
			if (count > 0) {
				console.log("[DB] Database already initialized. Skipping setup.");
				return;
			}
		}

		db.execSync(SCHEMA);
		const tables = db.getAllSync<{ name: string }>(
			`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
		);
		const indexes = db.getAllSync<{ name: string }>(
			`SELECT name FROM sqlite_master WHERE type='index' ORDER BY name`,
		);
		const { journal_mode } = db.getFirstSync<{ journal_mode: string }>(`PRAGMA journal_mode`)!;
		const { foreign_keys } = db.getFirstSync<{ foreign_keys: number }>(`PRAGMA foreign_keys`)!;

		console.log("[DB] Setup complete.");
		console.log("[DB] Tables:", tables.map((t) => t.name).join(", "));
		console.log("[DB] Indexes:", indexes.map((i) => i.name).join(", "));
		console.log(`[DB] journal_mode=${journal_mode} foreign_keys=${foreign_keys}`);
	} catch (error) {
		console.error("[DB] Setup failed:", error);
		throw error;
	}
}

export function saveDeviceState(state: DeviceState) {
	try {
		let cupState = 0;
		state.slotsA.forEach((slot, i) => {
			if (slot.taken) cupState |= 1 << i;
		});
		state.slotsB.forEach((slot, i) => {
			if (slot.taken) cupState |= 1 << (i + 7);
		});

		db.runSync(
			`INSERT INTO device (id, ble_id, battery, temperature_c, cup_state, last_seen)
             VALUES (1, 'default', ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
             battery=excluded.battery,
             temperature_c=excluded.temperature_c,
             cup_state=excluded.cup_state,
             last_seen=excluded.last_seen`,
			[state.battery ?? null, state.temperature ?? null, cupState, Math.floor(Date.now() / 1000)],
		);
	} catch (e) {
		console.error("[DB] saveDeviceState error:", e);
	}
}

export function getDeviceSettings() {
	try {
		return db.getFirstSync<{
			alerts_enabled: number | null;
			alarm_morning_h: number | null;
			alarm_morning_m: number | null;
			alarm_evening_h: number | null;
			alarm_evening_m: number | null;
			alarm_interval: number | null;
			cup_state: number | null;
		}>(
			`SELECT alerts_enabled, alarm_morning_h, alarm_morning_m, alarm_evening_h, alarm_evening_m, alarm_interval, cup_state FROM device WHERE id=1`,
		);
	} catch (e) {
		console.error("[DB] getDeviceSettings error:", e);
		return null;
	}
}

export function updateDeviceSettings(
	settings: Partial<{
		alerts_enabled: boolean;
		alarm_morning_h: number;
		alarm_morning_m: number;
		alarm_evening_h: number;
		alarm_evening_m: number;
		alarm_interval: number;
		cup_state: number;
	}>,
) {
	try {
		db.runSync(`INSERT OR IGNORE INTO device (id, ble_id) VALUES (1, 'default')`);

		const fields = [];
		const values = [];
		if (settings.alerts_enabled !== undefined) {
			fields.push("alerts_enabled=?");
			values.push(settings.alerts_enabled ? 1 : 0);
		}
		if (settings.alarm_morning_h !== undefined) {
			fields.push("alarm_morning_h=?");
			values.push(settings.alarm_morning_h);
		}
		if (settings.alarm_morning_m !== undefined) {
			fields.push("alarm_morning_m=?");
			values.push(settings.alarm_morning_m);
		}
		if (settings.alarm_evening_h !== undefined) {
			fields.push("alarm_evening_h=?");
			values.push(settings.alarm_evening_h);
		}
		if (settings.alarm_evening_m !== undefined) {
			fields.push("alarm_evening_m=?");
			values.push(settings.alarm_evening_m);
		}
		if (settings.alarm_interval !== undefined) {
			fields.push("alarm_interval=?");
			values.push(settings.alarm_interval);
		}
		if (settings.cup_state !== undefined) {
			fields.push("cup_state=?");
			values.push(settings.cup_state);
		}

		if (fields.length === 0) return;
		values.push(1);
		db.runSync(`UPDATE device SET ${fields.join(", ")} WHERE id=?`, values);
	} catch (e) {
		console.error("[DB] updateDeviceSettings error:", e);
	}
}
