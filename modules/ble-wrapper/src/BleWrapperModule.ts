import { NativeModule, requireNativeModule } from 'expo';

import { BleWrapperModuleEvents } from './BleWrapper.types';

declare class BleWrapperModule extends NativeModule<BleWrapperModuleEvents> {
  /** Scan for XIAO_Sense_Accel device. Returns its MAC address. */
  scanForXiao(): Promise<string>;
  /** Stop any active BLE scan. */
  stopScan(): Promise<void>;
  /** Connect to device and stay connected. Subscribes to accel notifications. */
  connect(address: string): Promise<void>;
  /** Gracefully disconnect from connected device. */
  disconnect(): Promise<void>;
  /** One-shot read of accelerometer. Returns "X,Y,Z". Must be connected. */
  readAccelerometer(): Promise<string>;
  /** Turn the green LED on (true) or off (false). Must be connected. */
  setLed(on: boolean): Promise<void>;
  /** Check if currently connected (synchronous). */
  isConnected(): boolean;
}

export default requireNativeModule<BleWrapperModule>('BleWrapper');
