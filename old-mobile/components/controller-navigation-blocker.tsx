import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Disables default controller navigation by preventing default back button behavior
 * This needs to be added at the root level of your app
 */
export function ControllerNavigationBlocker() {
  useEffect(() => {
    // Prevent back button (controller B button) from navigating back
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Return true to prevent default behavior
      return true;
    });

    return () => backHandler.remove();
  }, []);

  return null;
}
