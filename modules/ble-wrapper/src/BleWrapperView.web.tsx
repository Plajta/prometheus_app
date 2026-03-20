import * as React from 'react';

import { BleWrapperViewProps } from './BleWrapper.types';

export default function BleWrapperView(props: BleWrapperViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
