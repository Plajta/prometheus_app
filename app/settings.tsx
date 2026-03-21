import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
	View,
	Text,
	ScrollView,
	Pressable,
	Switch,
	useColorScheme,
	useWindowDimensions,
	Alert,
	Platform,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { CameraView, useCameraPermissions } from "expo-camera";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useDeviceStore } from "~/store/useDeviceStore";
import { useBleDeviceStore } from "~/store/useBleDeviceStore";
import { getWatching, addFamilyRelation, deleteFamilyRelation, type FamilyRelation } from "~/lib/notifications";
import { getDeviceSettings, updateDeviceSettings } from "~/lib/database";
import { syncSchedule } from "~/lib/scheduleSync";
import BleWrapperModule from "~/modules/ble-wrapper/src/BleWrapperModule";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── SettingRow ───────────────────────────────────────────────────────────────

interface RowProps {
	icon: IoniconsName;
	iconContainerClassName?: string;
	iconColor?: string;
	label: string;
	value?: string;
	toggle?: boolean;
	onToggle?: (v: boolean) => void;
	chevron?: boolean;
	danger?: boolean;
	onPress?: () => void;
}

function SettingRow({
	icon,
	iconContainerClassName = "bg-zinc-100 dark:bg-zinc-800",
	iconColor = "#eab308",
	label,
	value,
	toggle,
	onToggle,
	chevron = false,
	danger = false,
	onPress,
}: RowProps) {
	const isDark = useColorScheme() === "dark";
	return (
		<Pressable
			onPress={onPress}
			className="flex-row items-center px-4 py-3.5 active:bg-zinc-100 dark:active:bg-zinc-800/40"
		>
			<View className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${iconContainerClassName}`}>
				<Ionicons name={icon} size={17} color={iconColor} />
			</View>
			<Text
				className={`flex-1 text-base ${danger ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white"}`}
			>
				{label}
			</Text>
			{value !== undefined && <Text className="text-zinc-500 text-sm mr-1.5">{value}</Text>}
			{toggle !== undefined && onToggle && (
				<Switch
					value={toggle}
					onValueChange={onToggle}
					trackColor={{ false: isDark ? "#3f3f46" : "#e4e4e7", true: "#ca8a04" }}
					thumbColor={toggle ? "#5eead4" : isDark ? "#a1a1aa" : "#ffffff"}
				/>
			)}
			{chevron && <Ionicons name="chevron-forward" size={15} color="#a1a1aa" />}
		</Pressable>
	);
}

function Divider() {
	return <View className="h-px bg-zinc-200 dark:bg-zinc-800 mx-4" />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<View className="mb-5">
			<Text className="text-zinc-500 text-xs font-bold tracking-widest uppercase px-4 mb-2">{title}</Text>
			<View className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden mx-4 border border-zinc-200 dark:border-zinc-800">
				{children}
			</View>
		</View>
	);
}

function CaregiverNotifSheet({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
	const isDark = useColorScheme() === "dark";
	const { deviceId } = useDeviceStore();
	const insets = useSafeAreaInsets();
	const bottomPad = Platform.OS === "android" ? Math.max(insets.bottom, 16) : 24;

	return (
		<View className="flex-1 gap-5 pt-2" style={{ paddingBottom: bottomPad }}>
			<Text className="text-zinc-500 text-[11px] font-bold tracking-widest uppercase text-center">
				Notifikace příbuzným
			</Text>

			<View className="flex-1 items-center justify-center gap-5">
				{deviceId ? (
					<View
						className="rounded-[24px] p-5 bg-white"
						style={{
							shadowColor: "#000",
							shadowOffset: { width: 0, height: 4 },
							shadowOpacity: isDark ? 0.5 : 0.1,
							shadowRadius: 16,
							elevation: 8,
						}}
					>
						<QRCode value={deviceId} size={200} color="#09090b" backgroundColor="#ffffff" quietZone={0} />
					</View>
				) : (
					<View className="rounded-[24px] items-center justify-center w-[230px] h-[230px] bg-zinc-100 dark:bg-zinc-800">
						<Text className="text-zinc-500 text-[13px]">Načítám…</Text>
					</View>
				)}

				<Text className="text-zinc-500 text-[13px] text-center leading-5 px-6">
					Nechte příbuzné naskenovat tento kód, aby mohli dostávat upozornění o vašem užívání léků.
				</Text>
			</View>
		</View>
	);
}

const ITEM_H = 44;
const VISIBLE = 3;

function timeStrToDate(t: string): Date {
	const [h, m] = t.split(":").map(Number);
	const d = new Date();
	d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
	return d;
}

function dateToTimeStr(d: Date): string {
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type ActivePicker = "morning" | "evening" | "escalation" | null;

function PickerRow({
	id,
	label,
	valueLabel,
	active,
	onToggle,
	isDark,
	alwaysCollapse = false,
	children,
}: {
	id: ActivePicker;
	label: string;
	valueLabel: string;
	active: ActivePicker;
	onToggle: (id: ActivePicker) => void;
	isDark: boolean;
	alwaysCollapse?: boolean;
	children: React.ReactNode;
}) {
	const isOpen = active === id;
	const useDialog = Platform.OS === "android" && !alwaysCollapse;
	const rowBg = isDark ? "#27272a" : "#f4f4f5";
	const borderC = isDark ? "#3f3f46" : "#e4e4e7";
	const activeBg = isDark ? "#18181b" : "#f0f0f1";

	return (
		<View style={{ borderRadius: 16, borderWidth: 1, borderColor: borderC, overflow: "hidden" }}>
			<Pressable
				onPress={() => onToggle(isOpen ? null : id)}
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					paddingHorizontal: 16,
					paddingVertical: 14,
					backgroundColor: rowBg,
				}}
			>
				<Text style={{ color: isDark ? "#a1a1aa" : "#71717a", fontSize: 13, fontWeight: "600" }}>{label}</Text>
				<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
					<Text
						style={{
							color: isDark ? "#ffffff" : "#18181b",
							fontSize: 17,
							fontWeight: "700",
							fontVariant: ["tabular-nums"],
						}}
					>
						{valueLabel}
					</Text>
					{useDialog ? (
						<Ionicons name="pencil" size={15} color="#71717a" />
					) : (
						<Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#71717a" />
					)}
				</View>
			</Pressable>
			{isOpen && !useDialog && (
				<View
					style={{
						backgroundColor: activeBg,
						borderTopWidth: 1,
						borderTopColor: borderC,
						alignItems: "center",
					}}
				>
					{children}
				</View>
			)}
		</View>
	);
}

function AlarmsSheet({
	onClose,
	onSaved,
}: {
	onClose: () => void;
	onSaved?: (morning: string, evening: string) => void;
}) {
	const isDark = useColorScheme() === "dark";
	const insets = useSafeAreaInsets();
	const bottomPad = Platform.OS === "android" ? Math.max(insets.bottom, 16) : 24;

	const [morningDate, setMorningDate] = useState(() => timeStrToDate("08:00"));
	const [eveningDate, setEveningDate] = useState(() => timeStrToDate("20:00"));
	const [active, setActive] = useState<ActivePicker>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const s = getDeviceSettings();
		if (!s) return;
		if (s.alarm_morning_h !== null && s.alarm_morning_m !== null)
			setMorningDate(
				timeStrToDate(
					`${String(s.alarm_morning_h).padStart(2, "0")}:${String(s.alarm_morning_m).padStart(2, "0")}`,
				),
			);
		if (s.alarm_evening_h !== null && s.alarm_evening_m !== null)
			setEveningDate(
				timeStrToDate(
					`${String(s.alarm_evening_h).padStart(2, "0")}:${String(s.alarm_evening_m).padStart(2, "0")}`,
				),
			);
	}, []);

	const handleSave = async () => {
		setLoading(true);
		try {
			const mH = morningDate.getHours(),
				mM = morningDate.getMinutes();
			await BleWrapperModule.setAlarmMorning(mH, mM);
			updateDeviceSettings({ alarm_morning_h: mH, alarm_morning_m: mM });

			const eH = eveningDate.getHours(),
				eM = eveningDate.getMinutes();
			await BleWrapperModule.setAlarmEvening(eH, eM);
			updateDeviceSettings({ alarm_evening_h: eH, alarm_evening_m: eM });
			syncSchedule(mH, mM, eH, eM).catch(console.error);
			onSaved?.(dateToTimeStr(morningDate), dateToTimeStr(eveningDate));
			onClose();
		} catch (e) {
			console.error("Save alarms failed", e);
			Alert.alert("Chyba", "Nepodařilo se uložit nastavení.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<View className="flex-1 pt-2 gap-5" style={{ paddingBottom: bottomPad }}>
			<View className="flex-row items-center justify-between px-1">
				<Text className="text-zinc-500 text-[11px] font-bold tracking-widest uppercase">Časy upozornění</Text>
				<Pressable onPress={onClose} className="active:opacity-60">
					<Ionicons name="close" size={22} color="#71717a" />
				</Pressable>
			</View>

			<View className="flex-1 gap-3 px-1">
				<PickerRow
					id="morning"
					label="Ranní léky"
					valueLabel={dateToTimeStr(morningDate)}
					active={active}
					onToggle={setActive}
					isDark={isDark}
				>
					<DateTimePicker
						value={morningDate}
						mode="time"
						display="spinner"
						onChange={(_, d) => {
							if (d) setMorningDate(d);
						}}
						textColor={isDark ? "#ffffff" : "#18181b"}
						style={{ height: ITEM_H * VISIBLE }}
					/>
				</PickerRow>

				<PickerRow
					id="evening"
					label="Večerní léky"
					valueLabel={dateToTimeStr(eveningDate)}
					active={active}
					onToggle={setActive}
					isDark={isDark}
				>
					<DateTimePicker
						value={eveningDate}
						mode="time"
						display="spinner"
						onChange={(_, d) => {
							if (d) setEveningDate(d);
						}}
						textColor={isDark ? "#ffffff" : "#18181b"}
						style={{ height: ITEM_H * VISIBLE }}
					/>
				</PickerRow>

				{Platform.OS === "android" && active === "morning" && (
					<DateTimePicker
						value={morningDate}
						mode="time"
						display="default"
						onChange={(_, d) => {
							if (d) setMorningDate(d);
							setActive(null);
						}}
					/>
				)}
				{Platform.OS === "android" && active === "evening" && (
					<DateTimePicker
						value={eveningDate}
						mode="time"
						display="default"
						onChange={(_, d) => {
							if (d) setEveningDate(d);
							setActive(null);
						}}
					/>
				)}
			</View>

			<Pressable
				onPress={handleSave}
				disabled={loading}
				className="rounded-2xl py-4 items-center active:opacity-80"
				style={{ backgroundColor: "#2563eb" }}
			>
				<Text className="font-semibold text-[15px] text-white">
					{loading ? "Ukládám…" : "Uložit do lékovky"}
				</Text>
			</Pressable>
		</View>
	);
}

function EscalationSheet({ onClose, onSaved }: { onClose: () => void; onSaved?: (minutes: number) => void }) {
	const isDark = useColorScheme() === "dark";
	const insets = useSafeAreaInsets();
	const bottomPad = Platform.OS === "android" ? Math.max(insets.bottom, 16) : 24;

	const [escalation, setEscalation] = useState(15);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const s = getDeviceSettings();
		if (s?.alarm_interval != null) setEscalation(Math.floor(s.alarm_interval / 60));
	}, []);

	const handleSave = async () => {
		setLoading(true);
		try {
			await BleWrapperModule.setAlarmInterval(escalation * 60);
			updateDeviceSettings({ alarm_interval: escalation * 60 });
			onSaved?.(escalation);
			onClose();
		} catch (e) {
			console.error("Save escalation failed", e);
			Alert.alert("Chyba", "Nepodařilo se uložit nastavení.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<View className="flex-1 pt-2 gap-5" style={{ paddingBottom: bottomPad }}>
			<View className="flex-row items-center justify-between px-1">
				<Text className="text-zinc-500 text-[11px] font-bold tracking-widest uppercase">Eskalace po</Text>
				<Pressable onPress={onClose} className="active:opacity-60">
					<Ionicons name="close" size={22} color="#71717a" />
				</Pressable>
			</View>

			<View className="flex-1 justify-center px-1">
				<View style={{ flexDirection: "row", gap: 10 }}>
					{[1, 2, 5, 10, 15].map((v) => (
						<Pressable
							key={v}
							onPress={() => setEscalation(v)}
							style={{
								flex: 1,
								paddingVertical: 18,
								borderRadius: 16,
								alignItems: "center",
								backgroundColor: escalation === v ? "#2563eb" : isDark ? "#27272a" : "#f4f4f5",
								borderWidth: 1.5,
								borderColor: escalation === v ? "#2563eb" : isDark ? "#3f3f46" : "#e4e4e7",
							}}
						>
							<Text
								style={{
									fontSize: 20,
									fontWeight: "700",
									color: escalation === v ? "#ffffff" : isDark ? "#a1a1aa" : "#71717a",
								}}
							>
								{v}
							</Text>
							<Text
								style={{
									fontSize: 10,
									fontWeight: "500",
									marginTop: 2,
									color: escalation === v ? "#bfdbfe" : isDark ? "#52525b" : "#a1a1aa",
								}}
							>
								min
							</Text>
						</Pressable>
					))}
				</View>
			</View>

			<Pressable
				onPress={handleSave}
				disabled={loading}
				className="rounded-2xl py-4 items-center active:opacity-80"
				style={{ backgroundColor: "#2563eb" }}
			>
				<Text className="font-semibold text-[15px] text-white">
					{loading ? "Ukládám…" : "Uložit do lékovky"}
				</Text>
			</Pressable>
		</View>
	);
}

type FamilyView = "list" | "camera" | "nameInput";

interface FamilySheetProps {
	relations: FamilyRelation[];
	setRelations: React.Dispatch<React.SetStateAction<FamilyRelation[]>>;
	onAfterAdd: () => void;
}

function FamilySheet({ relations, setRelations, onAfterAdd }: FamilySheetProps) {
	const isDark = useColorScheme() === "dark";
	const { deviceId } = useDeviceStore();
	const { height } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const bottomPad = Platform.OS === "android" ? Math.max(insets.bottom, 16) : 24;
	const cameraHeight = Math.round(height * 0.7 - 140);

	const [view, setView] = useState<FamilyView>("list");
	const [scannedDeviceId, setScannedDeviceId] = useState("");
	const [newName, setNewName] = useState("");
	const [loading, setLoading] = useState(false);
	const scannedRef = useRef(false);

	const [permission, requestPermission] = useCameraPermissions();

	const handleOpenCamera = async () => {
		if (!permission?.granted) {
			const result = await requestPermission();
			if (!result.granted) return;
		}
		scannedRef.current = false;
		setView("camera");
	};

	const handleBarcodeScanned = ({ data }: { data: string }) => {
		if (scannedRef.current) return;
		scannedRef.current = true;
		setScannedDeviceId(data);
		setNewName("");
		setView("nameInput");
	};

	const handleAdd = async () => {
		if (!deviceId || !scannedDeviceId || !newName.trim()) return;
		setLoading(true);
		try {
			const { id } = await addFamilyRelation(deviceId, scannedDeviceId, newName.trim());
			const newRelation: FamilyRelation = {
				id,
				watcher_device_id: deviceId,
				watched_device_id: scannedDeviceId,
				name: newName.trim(),
				created_at: new Date().toISOString(),
			};
			setRelations((prev) => (Array.isArray(prev) ? prev : []).concat(newRelation));
			setView("list");
			setScannedDeviceId("");
			setNewName("");
			onAfterAdd();
		} catch {
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (relation: FamilyRelation) => {
		try {
			await deleteFamilyRelation(relation.id);
			setRelations((prev) => (Array.isArray(prev) ? prev : []).filter((r) => r.id !== relation.id));
		} catch {}
	};

	if (view === "camera") {
		return (
			<View className="flex-1 pt-2 gap-4" style={{ paddingBottom: bottomPad }}>
				<View className="flex-row items-center justify-between px-1">
					<Text className="text-zinc-500 text-[11px] font-bold tracking-widest uppercase">
						Přidat příbuzného
					</Text>
					<Pressable onPress={() => setView("list")} className="active:opacity-60">
						<Ionicons name="close" size={22} color="#71717a" />
					</Pressable>
				</View>

				<View style={{ height: cameraHeight }} className="rounded-[20px] overflow-hidden">
					<CameraView
						style={{ width: "100%", height: "100%" }}
						facing="back"
						barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
						onBarcodeScanned={handleBarcodeScanned}
					/>
					<View className="absolute inset-0 items-center justify-center" pointerEvents="none">
						<View style={{ width: 200, height: 200 }}>
							{[
								"top-0 left-0 border-t-[3px] border-l-[3px]",
								"top-0 right-0 border-t-[3px] border-r-[3px]",
								"bottom-0 left-0 border-b-[3px] border-l-[3px]",
								"bottom-0 right-0 border-b-[3px] border-r-[3px]",
							].map((cls, i) => (
								<View key={i} className={`absolute w-8 h-8 border-white rounded-sm ${cls}`} />
							))}
						</View>
					</View>
				</View>

				<Text className="text-zinc-500 text-[13px] text-center leading-5 px-4">
					Naskenujte QR kód příbuzného z jeho telefonu
				</Text>
			</View>
		);
	}

	if (view === "nameInput") {
		return (
			<View className="flex-1 pt-2 gap-5" style={{ paddingBottom: bottomPad }}>
				<View className="flex-row items-center justify-between px-1">
					<Text className="text-zinc-500 text-[11px] font-bold tracking-widest uppercase">
						Přidat příbuzného
					</Text>
					<Pressable onPress={() => setView("list")} className="active:opacity-60">
						<Ionicons name="close" size={22} color="#71717a" />
					</Pressable>
				</View>

				<View className="flex-1 justify-center gap-6 px-1">
					<View className="items-center gap-2">
						<View className="w-14 h-14 rounded-full bg-emerald-500/15 items-center justify-center">
							<Ionicons name="checkmark-circle" size={28} color="#10b981" />
						</View>
						<Text className="text-zinc-900 dark:text-white text-[15px] font-semibold">
							QR kód naskenován
						</Text>
					</View>

					<View className="gap-2">
						<Text className="text-zinc-500 text-[11px] font-bold tracking-widest uppercase">
							Jméno příbuzného
						</Text>
						<BottomSheetTextInput
							value={newName}
							onChangeText={setNewName}
							placeholder="např. Maminka"
							placeholderTextColor="#71717a"
							autoFocus
							className="text-zinc-900 dark:text-white text-[16px] px-4 py-3.5 rounded-2xl"
							style={{
								backgroundColor: isDark ? "#27272a" : "#f4f4f5",
								borderWidth: 1,
								borderColor: isDark ? "#3f3f46" : "#e4e4e7",
							}}
						/>
					</View>
				</View>

				<Pressable
					onPress={handleAdd}
					disabled={!newName.trim() || loading}
					className="rounded-2xl py-4 items-center active:opacity-80"
					style={{ backgroundColor: newName.trim() ? "#2563eb" : isDark ? "#27272a" : "#e4e4e7" }}
				>
					<Text
						className="font-semibold text-[15px]"
						style={{ color: newName.trim() ? "#ffffff" : "#71717a" }}
					>
						{loading ? "Přidávám…" : "Přidat příbuzného"}
					</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View className="flex-1 pt-2 gap-4" style={{ paddingBottom: bottomPad }}>
			<Text className="text-zinc-500 text-[11px] font-bold tracking-widest uppercase text-center">Příbuzní</Text>

			<View className="flex-1">
				{relations.length === 0 ? (
					<View className="flex-1 items-center justify-center gap-3 pb-8">
						<View className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
							<Ionicons name="people-outline" size={28} color="#71717a" />
						</View>
						<Text className="text-zinc-900 dark:text-white text-[15px] font-semibold">
							Zatím žádní příbuzní
						</Text>
						<Text className="text-zinc-500 text-[13px] text-center leading-5 px-8">
							Naskenujte QR kód příbuzného a budete dostávat upozornění o jeho lécích.
						</Text>
					</View>
				) : (
					<View>
						{relations.map((item, index) => (
							<View key={item.id}>
								{index > 0 && <View className="h-px bg-zinc-100 dark:bg-zinc-800 mx-1" />}
								<View className="flex-row items-center gap-3 py-3 px-1">
									<View className="w-10 h-10 rounded-full bg-blue-500/15 items-center justify-center">
										<Ionicons name="person" size={18} color="#3b82f6" />
									</View>
									<View className="flex-1 gap-0.5">
										<Text className="text-zinc-900 dark:text-white text-[15px] font-medium">
											{item.name}
										</Text>
									</View>
									<Pressable
										onPress={() => handleDelete(item)}
										className="w-8 h-8 items-center justify-center active:opacity-60"
									>
										<Ionicons name="trash-outline" size={17} color="#ef4444" />
									</Pressable>
								</View>
							</View>
						))}
					</View>
				)}
			</View>

			<Pressable
				onPress={handleOpenCamera}
				className="flex-row items-center justify-center gap-2 rounded-2xl py-4 active:opacity-80"
				style={{ backgroundColor: "#2563eb" }}
			>
				<Ionicons name="qr-code-outline" size={18} color="#ffffff" />
				<Text className="text-white font-semibold text-[15px]">Přidat příbuzného</Text>
			</Pressable>
		</View>
	);
}

export default function SettingsScreen() {
	const [caregiverNotif, setCaregiverNotif] = useState(false);
	const [escalationLabel, setEscalationLabel] = useState("15 min");
	const [alarmsLabel, setAlarmsLabel] = useState("z plánu");
	const insets = useSafeAreaInsets();
	const isDark = useColorScheme() === "dark";
	const router = useRouter();

	useEffect(() => {
		const s = getDeviceSettings();
		if (s?.alarm_interval != null) setEscalationLabel(`${Math.floor(s.alarm_interval / 60)} min`);
		if (
			s?.alarm_morning_h != null &&
			s?.alarm_morning_m != null &&
			s?.alarm_evening_h != null &&
			s?.alarm_evening_m != null
		) {
			const m = `${String(s.alarm_morning_h).padStart(2, "0")}:${String(s.alarm_morning_m).padStart(2, "0")}`;
			const e = `${String(s.alarm_evening_h).padStart(2, "0")}:${String(s.alarm_evening_m).padStart(2, "0")}`;
			setAlarmsLabel(`${m} — ${e}`);
		}
	}, []);

	const caregiverSheetRef = useRef<BottomSheetModal>(null);
	const familySheetRef = useRef<BottomSheetModal>(null);
	const alarmsSheetRef = useRef<BottomSheetModal>(null);
	const escalationSheetRef = useRef<BottomSheetModal>(null);
	const snapPoints = useMemo(() => ["70%"], []);

	const { deviceId } = useDeviceStore();
	const { isConnected } = useBleDeviceStore();
	const [relations, setRelations] = useState<FamilyRelation[]>([]);

	useEffect(() => {
		if (!deviceId) return;
		getWatching(deviceId)
			.then((data) => setRelations(Array.isArray(data) ? data : []))
			.catch(() => {});
	}, [deviceId]);

	const renderBackdrop = useCallback(
		(props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />,
		[],
	);

	const sheetProps = {
		snapPoints,
		enablePanDownToClose: true,
		enableDynamicSizing: false,
		backdropComponent: renderBackdrop,
		backgroundStyle: { backgroundColor: isDark ? "#18181b" : "#ffffff" },
		handleIndicatorStyle: { backgroundColor: isDark ? "#52525b" : "#d4d4d8" },
		animationConfigs: { duration: 280 },
	} as const;

	return (
		<View className="flex-1 bg-zinc-50 dark:bg-zinc-950" style={{ paddingTop: insets.top }}>
			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
				<View className="px-4 pt-2 pb-5 flex-row items-center gap-2">
					<Pressable onPress={() => router.back()} className="active:opacity-60 mr-1">
						<Ionicons name="chevron-back" size={28} color={isDark ? "#ffffff" : "#18181b"} />
					</Pressable>
					<Text className="text-zinc-900 dark:text-white text-2xl font-bold">Nastavení</Text>
				</View>

				<Section title="Sdílení">
					<SettingRow
						icon="person-add"
						iconContainerClassName="bg-[#d1fae5] dark:bg-[#0d2d1a]"
						iconColor="#059669"
						label="Správa příbuzných"
						chevron
						onPress={() => familySheetRef.current?.present()}
					/>

					<Divider />

					<SettingRow
						icon="person"
						iconContainerClassName="bg-[#dbeafe] dark:bg-[#0d1a2d]"
						iconColor="#2563eb"
						label="Sdílet notifikace příbuzným"
						chevron
						onPress={() => caregiverSheetRef.current?.present()}
					/>
				</Section>

				{isConnected && (
					<>
						<Section title="Upozornění">
							<SettingRow
								icon="notifications"
								iconContainerClassName="bg-zinc-100 dark:bg-zinc-800"
								iconColor="#52525b"
								label="Čas připomenutí"
								value={alarmsLabel}
								chevron
								onPress={() => alarmsSheetRef.current?.present()}
							/>
							<Divider />

							<SettingRow
								icon="time"
								iconContainerClassName="bg-[#fef3c7] dark:bg-[#2d1e0d]"
								iconColor="#d97706"
								label="Eskalace po"
								value={escalationLabel}
								onPress={() => escalationSheetRef.current?.present()}
								chevron
							/>
						</Section>

						<Section title="Zásoba">
							<SettingRow
								icon="alert-circle"
								iconContainerClassName="bg-[#fef3c7] dark:bg-[#2d1e0d]"
								iconColor="#d97706"
								label="Upozornit předem"
								value="7 dní"
								chevron
							/>
						</Section>
					</>
				)}

				<Text className="text-center text-zinc-500 text-xs mt-2 mb-4">Prometheus v1.0.0 · Plajta 2026</Text>
			</ScrollView>

			<BottomSheetModal ref={caregiverSheetRef} {...sheetProps}>
				<BottomSheetView className="flex-1 px-6 py-2">
					<CaregiverNotifSheet enabled={caregiverNotif} onToggle={setCaregiverNotif} />
				</BottomSheetView>
			</BottomSheetModal>

			<BottomSheetModal ref={familySheetRef} {...sheetProps}>
				<BottomSheetView className="flex-1 h-full px-6 py-2">
					<FamilySheet
						relations={relations}
						setRelations={setRelations}
						onAfterAdd={() => familySheetRef.current?.snapToIndex(0)}
					/>
				</BottomSheetView>
			</BottomSheetModal>

			<BottomSheetModal ref={alarmsSheetRef} {...sheetProps}>
				<BottomSheetView className="flex-1 h-full px-6 py-2">
					<AlarmsSheet
						onClose={() => alarmsSheetRef.current?.dismiss()}
						onSaved={(m, e) => setAlarmsLabel(`${m} — ${e}`)}
					/>
				</BottomSheetView>
			</BottomSheetModal>

			<BottomSheetModal ref={escalationSheetRef} {...sheetProps} snapPoints={["30%"]}>
				<BottomSheetView className="flex-1 h-full px-6 py-2">
					<EscalationSheet
						onClose={() => escalationSheetRef.current?.dismiss()}
						onSaved={(minutes) => setEscalationLabel(`${minutes} min`)}
					/>
				</BottomSheetView>
			</BottomSheetModal>
		</View>
	);
}
