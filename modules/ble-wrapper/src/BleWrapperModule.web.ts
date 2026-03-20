import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './BleWrapper.types';

type BleWrapperModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class BleWrapperModule extends NativeModule<BleWrapperModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(BleWrapperModule, 'BleWrapperModule');
