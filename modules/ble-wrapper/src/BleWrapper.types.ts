import type { StyleProp, ViewStyle } from 'react-native';

export type BleWrapperModuleEvents = {
  onTemperatureData: (params: TemperaturePayload) => void;
  onBatteryLevel: (params: BatteryPayload) => void;
  onCupStateChanged: (params: CupStatePayload) => void;
  onDeviceConnected: (params: ConnectionPayload) => void;
  onDeviceDisconnected: (params: ConnectionPayload) => void;
};

/** Temperature in °C from the Nordic chip internal sensor */
export type TemperaturePayload = {
  temperature: number;
};

/** Battery level as percentage (0-100) */
export type BatteryPayload = {
  level: number;
};

/** Cup state — 14 bits packed in a uint16 */
export type CupStatePayload = {
  state: number;
};

export type ConnectionPayload = {
  connected: boolean;
};

export type OnLoadEventPayload = {
  url: string;
};

export type BleWrapperViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};
