import type { StyleProp, ViewStyle } from 'react-native';

export type BleWrapperModuleEvents = {
  onAccelData: (params: AccelDataPayload) => void;
  onDeviceConnected: (params: ConnectionPayload) => void;
  onDeviceDisconnected: (params: ConnectionPayload) => void;
};

export type AccelDataPayload = {
  /** Accelerometer data as "X,Y,Z" string */
  value: string;
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
