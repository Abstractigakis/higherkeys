import { addAnalogStickListener, addButtonListener, GamepadAnalogStickEvent, GamepadButtonEvent } from '@/mobile/modules/expo-gamepad';
import { useEffect, useRef, useState } from 'react';

export interface GamepadNavigationOptions {
  itemCount: number;
  onSelect?: (index: number) => void;
  onAction?: (index: number) => void;
  onHome?: () => void;
  columns?: number;
  debug?: boolean;
  enabled?: boolean;
}

export interface GamepadNavigationState {
  focusedIndex: number;
  lastButtonPressed: string | null;
  debugLog: { button: string; action: string; timestamp: number }[];
}

export function useGamepadNavigation({
  itemCount,
  onSelect,
  onAction,
  onHome,
  columns = 1,
  debug = false,
  enabled = true,
}: GamepadNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [lastButtonPressed, setLastButtonPressed] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<{ button: string; action: string; timestamp: number }[]>([]);
  const buttonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analogNavigationRef = useRef<{ lastNavTime: number; direction: string | null }>({
    lastNavTime: 0,
    direction: null,
  });

  useEffect(() => {
    if (!enabled || itemCount === 0) return;

    const buttonSubscription = addButtonListener((event: GamepadButtonEvent) => {
      if (event.action !== 'pressed') return;

      if (debug) {
        setDebugLog((prev) => [
          { button: event.buttonName, action: event.action, timestamp: event.timestamp },
          ...prev.slice(0, 9), // Keep last 10 entries
        ]);
      }

      setLastButtonPressed(event.buttonName);
      
      // Clear the button indicator after 500ms
      if (buttonTimeoutRef.current) {
        clearTimeout(buttonTimeoutRef.current);
      }
      buttonTimeoutRef.current = setTimeout(() => {
        setLastButtonPressed(null);
      }, 500);

      // Handle navigation
      switch (event.buttonName) {
        case 'DPAD_UP':
        case 'L_STICK_UP':
          setFocusedIndex((prev) => {
            const newIndex = prev - columns;
            return newIndex >= 0 ? newIndex : prev;
          });
          break;

        case 'DPAD_DOWN':
        case 'L_STICK_DOWN':
          setFocusedIndex((prev) => {
            const newIndex = prev + columns;
            return newIndex < itemCount ? newIndex : prev;
          });
          break;

        case 'DPAD_LEFT':
        case 'L_STICK_LEFT':
          if (columns > 1) {
            setFocusedIndex((prev) => {
              const col = prev % columns;
              if (col > 0) {
                return prev - 1;
              }
              return prev;
            });
          }
          break;

        case 'DPAD_RIGHT':
        case 'L_STICK_RIGHT':
          if (columns > 1) {
            setFocusedIndex((prev) => {
              const col = prev % columns;
              if (col < columns - 1 && prev + 1 < itemCount) {
                return prev + 1;
              }
              return prev;
            });
          }
          break;

        case 'A':
        case 'START':
          if (onSelect) {
            onSelect(focusedIndex);
          }
          break;

        case 'X':
          if (onAction) {
            onAction(focusedIndex);
          }
          break;
        
        case 'HOME':
          if (onHome) {
            onHome();
          }
          break;
      }
    });

    // Handle analog stick navigation
    const analogSubscription = addAnalogStickListener((event: GamepadAnalogStickEvent) => {
      const now = Date.now();
      const deadzone = 0.5;
      const repeatDelay = 200; // ms between navigation repeats
      
      let direction: string | null = null;
      
      // Determine direction from left stick
      if (Math.abs(event.leftStick.y) > deadzone) {
        if (event.leftStick.y < -deadzone) {
          direction = 'UP';
        } else if (event.leftStick.y > deadzone) {
          direction = 'DOWN';
        }
      } else if (columns > 1 && Math.abs(event.leftStick.x) > deadzone) {
        if (event.leftStick.x < -deadzone) {
          direction = 'LEFT';
        } else if (event.leftStick.x > deadzone) {
          direction = 'RIGHT';
        }
      }
      
      // Only navigate if enough time has passed or direction changed
      const directionChanged = direction !== analogNavigationRef.current.direction;
      const timeElapsed = now - analogNavigationRef.current.lastNavTime;
      
      if (direction && (directionChanged || timeElapsed >= repeatDelay)) {
        analogNavigationRef.current.lastNavTime = now;
        analogNavigationRef.current.direction = direction;
        
        if (debug) {
          setDebugLog((prev) => [
            { button: `ANALOG_${direction}`, action: 'analog', timestamp: now },
            ...prev.slice(0, 9),
          ]);
        }
        
        switch (direction) {
          case 'UP':
            setFocusedIndex((prev) => {
              const newIndex = prev - columns;
              return newIndex >= 0 ? newIndex : prev;
            });
            break;
            
          case 'DOWN':
            setFocusedIndex((prev) => {
              const newIndex = prev + columns;
              return newIndex < itemCount ? newIndex : prev;
            });
            break;
            
          case 'LEFT':
            setFocusedIndex((prev) => {
              const col = prev % columns;
              if (col > 0) {
                return prev - 1;
              }
              return prev;
            });
            break;
            
          case 'RIGHT':
            setFocusedIndex((prev) => {
              const col = prev % columns;
              if (col < columns - 1 && prev + 1 < itemCount) {
                return prev + 1;
              }
              return prev;
            });
            break;
        }
      } else if (!direction) {
        // Reset when stick returns to center
        analogNavigationRef.current.direction = null;
      }
    });

    return () => {
      buttonSubscription.remove();
      analogSubscription.remove();
      if (buttonTimeoutRef.current) {
        clearTimeout(buttonTimeoutRef.current);
      }
    };
  }, [enabled, itemCount, focusedIndex, columns, onSelect, onAction, onHome, debug]);

  return {
    focusedIndex,
    lastButtonPressed,
    debugLog,
  };
}
