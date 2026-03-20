import { NativeModule, requireNativeModule } from 'expo';

import { BleWrapperModuleEvents } from './BleWrapper.types';

declare class BleWrapperModule extends NativeModule<BleWrapperModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<BleWrapperModule>('BleWrapper');
