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
			className="w-10 h-10 rounded-xl items-center justify-center border"
			style={{
				backgroundColor: isConnected ? "#22c55e20" : "#27272a",
				borderColor: isConnected ? "#22c55e50" : "#3f3f46",
			}}
		>
			<Ionicons name="bluetooth" size={16} color={isConnected ? "#22c55e" : "#71717a"} />
		</TouchableOpacity>
	);
}
