# VCMS Controller Support Documentation

## Overview

This document outlines the plan for adding Nintendo Switch controller support to the VCMS video player app. The goal is to enable full video playback control using Joy-Cons or Pro Controllers connected to Android devices.

---

## Objectives

1. **Controller Detection** - Detect when Nintendo Switch controllers are connected via Bluetooth
2. **Button Mapping** - Map controller buttons to video player actions
3. **Test Interface** - Create a controller test screen to visualize button presses and input
4. **Video Player Integration** - Enable controller navigation and playback control

---

## Technical Approach

### Libraries & APIs

#### React Native Gamepad
- Use `react-native-gamepad` or similar library for gamepad input
- Alternatively, use native Android Gamepad API through a bridge
- Consider `expo-game-controller` if available

#### Web Gamepad API (for web version)
- Standard Gamepad API for web builds
- Fallback for testing in browser

### Controller Detection

Monitor for:
- Controller connection events
- Controller disconnection events
- Multiple controller support (left/right Joy-Con, Pro Controller)

---

## Controller Mapping

### Nintendo Switch Pro Controller Layout

| Button | Video Action | Alternative Action |
|--------|-------------|-------------------|
| **A** | Play/Pause | Confirm/Select |
| **B** | Back/Exit fullscreen | Cancel |
| **X** | Toggle subtitles | - |
| **Y** | Toggle info overlay | - |
| **D-Pad Up** | Volume up | Navigate up in menu |
| **D-Pad Down** | Volume down | Navigate down in menu |
| **D-Pad Left** | Rewind 10s | Navigate left |
| **D-Pad Right** | Fast forward 10s | Navigate right |
| **Left Stick** | Seek (horizontal), Volume (vertical) | Menu navigation |
| **Right Stick** | - | - |
| **L / ZL** | Previous video | - |
| **R / ZR** | Next video | - |
| **Plus (+)** | Options menu | - |
| **Minus (-)** | Back to video list | - |
| **Home** | System home (default behavior) | - |
| **Capture** | Screenshot (future feature) | - |

### Joy-Con Specific

When using individual Joy-Cons:
- **Single Joy-Con**: Simplified controls (play/pause, seek)
- **Dual Joy-Cons**: Full Pro Controller layout
- **Grip Attachment**: Treat as Pro Controller

---

## Implementation Phases

### Phase 1: Controller Test Screen ✓ (Current)
- [x] Create Controller tab in navigation
- [ ] Display connected controllers
- [ ] Show real-time button press visualization
- [ ] Display analog stick positions
- [ ] Show controller battery level (if available)
- [ ] Test button mapping

### Phase 2: Basic Video Control
- [ ] Integrate controller input with video player
- [ ] Implement play/pause functionality
- [ ] Add seek forward/backward
- [ ] Volume control
- [ ] Basic navigation (back button)

### Phase 3: Advanced Controls
- [ ] Subtitle toggle
- [ ] Video info overlay
- [ ] Next/previous video navigation
- [ ] Menu navigation with controller
- [ ] Settings adjustment via controller

### Phase 4: Polish & UX
- [ ] Haptic feedback (if supported)
- [ ] On-screen button prompts
- [ ] Controller configuration screen
- [ ] Custom button mapping
- [ ] Controller sleep/wake detection

---

## Controller Test Screen Design

### Layout

```
┌─────────────────────────────────┐
│     Controller Test             │
├─────────────────────────────────┤
│                                 │
│  Status: Connected ✓            │
│  Type: Switch Pro Controller    │
│  Battery: 85%                   │
│                                 │
├─────────────────────────────────┤
│                                 │
│    [Controller Visualization]   │
│                                 │
│     Buttons:  [A] [B] [X] [Y]  │
│     D-Pad:    ↑ ↓ ← →          │
│     Triggers: [L] [R] [ZL] [ZR]│
│     Sticks:   L(x,y) R(x,y)    │
│                                 │
├─────────────────────────────────┤
│                                 │
│  Last Input: A Button           │
│  Timestamp: 12:34:56            │
│                                 │
└─────────────────────────────────┘
```

### Features
- Visual representation of controller
- Real-time button state (pressed/released)
- Analog stick position indicators
- Input log for debugging
- Connection status indicator

---

## Technical Considerations

### Android Specific
- Bluetooth permissions required
- Gamepad input events through MotionEvent and KeyEvent APIs
- Handle controller disconnection gracefully
- Support for multiple simultaneous controllers

### React Native Implementation
- Use native modules for gamepad access
- Event emitters for controller input
- State management for controller status
- Performance considerations for input polling

### Video Player Integration
- Hook controller events into video player controls
- Prevent default Android TV behavior if needed
- Handle input priority (touch vs controller)
- Smooth seeking with analog sticks

---

## Testing Requirements

### Hardware
- [ ] Nintendo Switch Pro Controller
- [ ] Left Joy-Con
- [ ] Right Joy-Con
- [ ] Dual Joy-Cons (grip mode)
- [ ] Third-party Switch controllers (if compatible)

### Test Cases
- [ ] Controller pairing via Bluetooth
- [ ] Button press detection
- [ ] Analog stick input (dead zones, sensitivity)
- [ ] Trigger input (analog vs digital)
- [ ] Multiple controller handling
- [ ] Controller disconnection handling
- [ ] Re-connection behavior
- [ ] Battery status reporting

### Video Player Tests
- [ ] Play/pause responsiveness
- [ ] Seek accuracy
- [ ] Volume control
- [ ] Navigation between videos
- [ ] Menu navigation
- [ ] Subtitle toggling

---

## Future Enhancements

### Multiplayer/Social Features
- Multiple controller support for collaborative watching
- Controller-based voting on next video
- Shared watch sessions

### Advanced Features
- Motion controls (if Joy-Con gyroscope accessible)
- HD Rumble feedback (if supported)
- IR camera (right Joy-Con) for gesture controls
- NFC reading (for amiibo or custom tags)

### Accessibility
- Configurable button remapping
- Sensitivity adjustments for analog inputs
- One-handed mode configurations
- Alternative controller support (Xbox, PlayStation)

---

## Dependencies

### Required Packages
```json
{
  "react-native-gamepad": "^1.0.0",  // or equivalent
  "expo-haptics": "~15.0.7",         // already installed
  "@react-native-community/hooks": "^3.0.0"  // for useEffect patterns
}
```

### Permissions (Android)
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

---

## Resources

### Documentation
- [Android Gamepad Developer Guide](https://developer.android.com/develop/ui/views/touch-and-input/game-controllers)
- [Web Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)
- [React Native Gamepad Libraries](https://reactnative.directory/?search=gamepad)

### Nintendo Switch Controller Specs
- Switch Pro Controller: Standard Bluetooth HID gamepad
- Joy-Cons: Individual Bluetooth controllers, can pair separately
- Button layout compatible with standard gamepad mappings

---

## Notes

- Nintendo Switch controllers use standard Bluetooth HID protocol
- Most Android devices support generic gamepad input
- No official Nintendo SDK needed for basic button detection
- Advanced features (gyro, rumble, NFC) may require additional work
- Testing on actual Android device required (emulator gamepad support limited)

---

## Getting Started

### Next Steps
1. Install gamepad library for React Native
2. Set up Bluetooth permissions in app.json
3. Create controller detection service
4. Build controller test UI
5. Test with actual Switch controller via Bluetooth
