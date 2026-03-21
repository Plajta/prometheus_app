import { TouchableOpacity, View } from "react-native";
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
			style={{
				width: 36,
				height: 36,
				borderRadius: 12,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: isConnected ? "#22c55e20" : "#27272a",
				borderWidth: 1,
				borderColor: isConnected ? "#22c55e50" : "#3f3f46",
			}}
		>
			<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
				<View
					style={{
						width: 6,
						height: 6,
						borderRadius: 99,
						backgroundColor: isConnected ? "#22c55e" : "#71717a",
					}}
				/>
				<Ionicons name="bluetooth" size={13} color={isConnected ? "#22c55e" : "#71717a"} />
			</View>
		</TouchableOpacity>
	);
}
