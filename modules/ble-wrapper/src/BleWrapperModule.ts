import { NativeModule, requireNativeModule } from 'expo';

import { BleWrapperModuleEvents } from './BleWrapper.types';

declare class BleWrapperModule extends NativeModule<BleWrapperModuleEvents> {
  /** Auto-scan for XIAO_Pill_Box and connect persistently. */
  connectToXiao(): Promise<void>;
  /** Gracefully disconnect. Disables auto-reconnect. */
  disconnect(): Promise<void>;

  /** Sync current phone time to the XIAO. */
  syncTime(): Promise<void>;

  /** Set alarm repeat interval in seconds (uint32). */
  setAlarmInterval(seconds: number): Promise<void>;
  /** Set morning alarm time (2 bytes: hour, second). */
  setAlarmMorning(hour: number, second: number): Promise<void>;
  /** Set evening alarm time (2 bytes: hour, second). */
  setAlarmEvening(hour: number, second: number): Promise<void>;

  /** Read cup state (14 bits as uint16 string). */
  readCupState(): Promise<string>;
  /** Write cup state (14 bits as uint16). */
  writeCupState(state: number): Promise<void>;

  /** Trigger Find My — blinks red LED on the XIAO for 1 second. */
  findMy(): Promise<void>;

  /** Read battery level (returns percentage as string). */
  readBattery(): Promise<string>;

  /** Check if currently connected (synchronous). */
  isConnected(): boolean;
}

export default requireNativeModule<BleWrapperModule>('BleWrapper');
