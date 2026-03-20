import { requireNativeView } from 'expo';
import * as React from 'react';

import { BleWrapperViewProps } from './BleWrapper.types';

const NativeView: React.ComponentType<BleWrapperViewProps> =
  requireNativeView('BleWrapper');

export default function BleWrapperView(props: BleWrapperViewProps) {
  return <NativeView {...props} />;
}
