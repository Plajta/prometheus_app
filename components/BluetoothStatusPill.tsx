import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
	isConnected: boolean;
	onPress?: () => void;
}

export function BluetoothStatusPill({ isConnected, onPress }: Props) {
	return (
		<TouchableOpacity
			activeOpacity={0.7}
			onPress={onPress}
			disabled={!isConnected}
			className={`w-10 h-10 rounded-xl items-center justify-center border ${
				isConnected ? "bg-green-100 border-green-500" : "bg-zinc-100 border-zinc-300"
			}`}
		>
			<Ionicons name="bluetooth" size={16} color={isConnected ? "#22c55e" : "#71717a"} />
		</TouchableOpacity>
	);
}
