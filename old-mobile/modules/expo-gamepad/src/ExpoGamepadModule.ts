import { requireNativeModule } from 'expo-modules-core';

// It loads the native module object from the JSI or falls back to
// the bridge module (from NativeModulesProxy) if the remote debugger is on.
let ExpoGamepadModule: any;
try {
  ExpoGamepadModule = requireNativeModule('ExpoGamepad');
} catch (e) {
  // Fallback for environments where the native module is not available (e.g. Expo Go)
  console.warn('ExpoGamepad native module not found. Gamepad functionality will be disabled.');
  ExpoGamepadModule = {
    getConnectedDevices: () => [],
    addListener: () => {},
    removeListeners: () => {},
    startObserving: () => {},
    stopObserving: () => {},
  };
}

export default ExpoGamepadModule;
