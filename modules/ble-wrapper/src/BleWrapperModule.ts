import { NativeModule, requireNativeModule } from 'expo';

import { BleWrapperModuleEvents } from './BleWrapper.types';

declare class BleWrapperModule extends NativeModule<BleWrapperModuleEvents> {
  /** Auto-scan for XIAO and connect. Single call, no address needed. */
  connectToXiao(): Promise<void>;
  /** Gracefully disconnect. */
  disconnect(): Promise<void>;
  /** One-shot read of accelerometer. Returns "X,Y,Z". Must be connected. */
  readAccelerometer(): Promise<string>;
  /** Turn the green LED on (true) or off (false). Must be connected. */
  setLed(on: boolean): Promise<void>;
  /** Check if currently connected (synchronous). */
  isConnected(): boolean;
}

export default requireNativeModule<BleWrapperModule>('BleWrapper');
