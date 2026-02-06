const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Disables default controller/D-Pad navigation in Android
 * This prevents the system from automatically handling gamepad inputs as navigation events
 */
const withDisableControllerNavigation = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application?.[0];

    if (application) {
      // Add android:configChanges to handle keyboard/navigation changes ourselves
      const activity = application.activity?.[0];
      if (activity) {
        // Add keyboard to configChanges if not already present
        const configChanges = activity.$?.['android:configChanges'] || '';
        const changes = new Set(configChanges.split('|').filter(Boolean));
        changes.add('keyboard');
        changes.add('keyboardHidden');
        changes.add('navigation');
        activity.$['android:configChanges'] = Array.from(changes).join('|');
      }
    }

    return config;
  });
};

module.exports = withDisableControllerNavigation;
