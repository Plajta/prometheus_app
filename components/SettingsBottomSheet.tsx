import { forwardRef, useCallback, useMemo } from "react";
import { useColorScheme } from "react-native";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";

interface Props {
	children: React.ReactNode;
}

export const SettingsBottomSheet = forwardRef<BottomSheetModal, Props>(({ children }, ref) => {
	const isDark = useColorScheme() === "dark";
	const snapPoints = useMemo(() => ["70%"], []);

	const renderBackdrop = useCallback(
		(props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />,
		[],
	);

	return (
		<BottomSheetModal
			ref={ref}
			snapPoints={snapPoints}
			enablePanDownToClose={true}
			enableDynamicSizing={false}
			backdropComponent={renderBackdrop}
			backgroundStyle={{ backgroundColor: isDark ? "#18181b" : "#ffffff" }}
			handleIndicatorStyle={{ backgroundColor: isDark ? "#52525b" : "#d4d4d8" }}
		>
			<BottomSheetView className="px-6 py-2">{children}</BottomSheetView>
		</BottomSheetModal>
	);
});
