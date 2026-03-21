import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
	isConnected: boolean;
	onPress?: () => void;
}

export function BluetoothStatusPill({ isConnected, onPress }: Props) {
	return (
		<TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={!isConnected}>
			<View
			className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
				isConnected
					? "bg-yellow-500/10 border-yellow-500/30"
					: "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
			}`}
		>
			<View className={`w-2 h-2 rounded-full ${isConnected ? "bg-yellow-500" : "bg-zinc-400"}`} />
			<Ionicons name="bluetooth" size={14} color={isConnected ? "#eab308" : "#a1a1aa"} />
			</View>
		</TouchableOpacity>
	);
}
