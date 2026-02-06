import { EventEmitter, NativeModulesProxy, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to ExpoGamepad.web.ts
// and on native platforms to ExpoGamepad.ts
import ExpoGamepadModule from './src/ExpoGamepadModule';

export interface GamepadButtonEvent {
  deviceId: number;
  buttonIndex: number;
  buttonName: string;
  action: 'pressed' | 'released';
  timestamp: number;
}

export interface GamepadDevice {
  deviceId: number;
  name: string;
  vendorId: number;
  productId: number;
}

export interface AnalogStick {
  x: number;
  y: number;
  angle: number;
  magnitude: number;
}

export interface GamepadAnalogStickEvent {
  deviceId: number;
  leftStick: AnalogStick;
  rightStick: AnalogStick;
  timestamp: number;
}

const emitter = new EventEmitter(ExpoGamepadModule ?? NativeModulesProxy.ExpoGamepad);

export function addButtonListener(listener: (event: GamepadButtonEvent) => void): Subscription {
  return emitter.addListener<GamepadButtonEvent>('onGamepadButton', listener);
}

export function addAnalogStickListener(listener: (event: GamepadAnalogStickEvent) => void): Subscription {
  return emitter.addListener<GamepadAnalogStickEvent>('onGamepadAnalogStick', listener);
}

export function addConnectedListener(listener: (device: GamepadDevice) => void): Subscription {
  return emitter.addListener<GamepadDevice>('onGamepadConnected', listener);
}

export function addDisconnectedListener(listener: (device: GamepadDevice) => void): Subscription {
  return emitter.addListener<GamepadDevice>('onGamepadDisconnected', listener);
}

export function getConnectedDevices(): GamepadDevice[] {
  return ExpoGamepadModule.getConnectedDevices();
}

export { ExpoGamepadModule };
