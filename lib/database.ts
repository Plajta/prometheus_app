import * as SQLite from "expo-sqlite";

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS sukl_drugs (
    kod_sukl TEXT PRIMARY KEY,
    nazev TEXT NOT NULL,
    sila TEXT,
    forma TEXT,
    baleni TEXT,
    baleni_pocet INTEGER,
    cesta TEXT,
    atc TEXT,
    vydej TEXT,
    zav INTEGER DEFAULT 0,
    ll TEXT
);
CREATE TABLE IF NOT EXISTS device (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ble_id TEXT NOT NULL UNIQUE,
    name TEXT,
    battery INTEGER,
    last_seen INTEGER,
    compartment_count INTEGER DEFAULT 14,
    temperature_c REAL,
    temperature_updated_at INTEGER
);
CREATE TABLE IF NOT EXISTS temperature_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL REFERENCES device(id),
    measured_at INTEGER NOT NULL,
    temperature_c REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kod_sukl TEXT REFERENCES sukl_drugs(kod_sukl),
    custom_name TEXT,
    tablet_count INTEGER NOT NULL,
    tablet_total INTEGER NOT NULL,
    compartments TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_id INTEGER NOT NULL REFERENCES medications(id),
    time_of_day TEXT NOT NULL,
    days_mask INTEGER DEFAULT 127,
    dose_count INTEGER DEFAULT 1,
    food_relation TEXT
);
CREATE TABLE IF NOT EXISTS dose_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL REFERENCES schedules(id),
    taken_at INTEGER,
    expected_at INTEGER NOT NULL,
    status TEXT NOT NULL,
    device_confirmed INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS refill_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_id INTEGER NOT NULL REFERENCES medications(id),
    refilled_at INTEGER NOT NULL,
    count_added INTEGER NOT NULL,
    count_before INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dose_events_expected ON dose_events(expected_at);
CREATE INDEX IF NOT EXISTS idx_dose_events_status ON dose_events(status);
CREATE INDEX IF NOT EXISTS idx_temp_log_device ON temperature_log(device_id, measured_at);
CREATE INDEX IF NOT EXISTS idx_schedules_medication ON schedules(medication_id);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(active);
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
				`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='sukl_drugs'`,
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
