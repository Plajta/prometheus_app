import { NativeModule, requireNativeModule } from 'expo';

import { BleWrapperModuleEvents } from './BleWrapper.types';

declare class BleWrapperModule extends NativeModule<BleWrapperModuleEvents> {
  /** Scan for the XIAO_Sense_Accel device. Returns its MAC address. */
  scanForXiao(): Promise<string>;
  /** Stop any active BLE scan. */
  stopScan(): Promise<void>;
  /** Read accelerometer data. Returns a string like "0.15,-0.98,0.05". */
  readAccelerometer(address: string): Promise<string>;
  /** Turn the green LED on (true) or off (false). */
  setLed(address: string, on: boolean): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<BleWrapperModule>('BleWrapper');
