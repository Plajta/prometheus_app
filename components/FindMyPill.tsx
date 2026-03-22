import { Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import BleWrapperModule from "~/modules/ble-wrapper/src/BleWrapperModule";

export function FindMyPill() {
    const [loading, setLoading] = useState(false);

    const handlePress = async () => {
        if (loading) return;
        setLoading(true);
        BleWrapperModule.findMy().catch(console.error);
        setTimeout(() => setLoading(false), 5000);
    };

    return (
        <Pressable
            onPress={handlePress}
            className="active:opacity-60 w-10 h-10 rounded-xl items-center justify-center border bg-yellow-100 border-yellow-500"
        >
            {loading ? (
                <ActivityIndicator size="small" color="#eab308" />
            ) : (
                <Ionicons name="navigate-circle-outline" size={18} color="#eab308" />
            )}
        </Pressable>
    );
}
