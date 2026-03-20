// Reexport the native module. On web, it will be resolved to BleWrapperModule.web.ts
// and on native platforms to BleWrapperModule.ts
export { default } from './src/BleWrapperModule';
export { default as BleWrapperView } from './src/BleWrapperView';
export * from  './src/BleWrapper.types';
