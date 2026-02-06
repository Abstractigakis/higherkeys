const { withMainActivity } = require('@expo/config-plugins');

/**
 * Adds gamepad event interception to MainActivity
 */
const withGamepadMainActivity = (config) => {
  return withMainActivity(config, async (config) => {
    const { modResults } = config;
    const { contents } = modResults;

    // Check if already modified
    if (contents.includes('ExpoGamepadModule')) {
      return config;
    }

    // Add import for our gamepad module
    const importToAdd = 'import expo.modules.gamepad.ExpoGamepadModule';
    
    // Find the package declaration and add import after it
    const packageMatch = contents.match(/(package\s+[\w.]+)/);
    if (packageMatch) {
      const insertPosition = packageMatch.index + packageMatch[0].length;
      modResults.contents = 
        contents.slice(0, insertPosition) + 
        '\n\n' + importToAdd + 
        contents.slice(insertPosition);
    }

    // Add onKeyDown override
    const onKeyDownMethod = `
  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    // Try to get the gamepad module singleton and handle the event
    val gamepadModule = ExpoGamepadModule.getInstance()
    if (gamepadModule?.handleKeyDown(keyCode, event) == true) {
      return true
    }
    return super.onKeyDown(keyCode, event)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
    // Try to get the gamepad module singleton and handle the event
    val gamepadModule = ExpoGamepadModule.getInstance()
    if (gamepadModule?.handleKeyUp(keyCode, event) == true) {
      return true
    }
    return super.onKeyUp(keyCode, event)
  }

  override fun onGenericMotionEvent(event: MotionEvent): Boolean {
    // Try to get the gamepad module singleton and handle the event
    val gamepadModule = ExpoGamepadModule.getInstance()
    if (gamepadModule?.handleGenericMotionEvent(event) == true) {
      return true
    }
    return super.onGenericMotionEvent(event)
  }`;

    // Find the last closing brace of the class and insert before it
    const lastBraceIndex = modResults.contents.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      modResults.contents = 
        modResults.contents.slice(0, lastBraceIndex) + 
        onKeyDownMethod + 
        '\n' + modResults.contents.slice(lastBraceIndex);
    }

    // Add KeyEvent and MotionEvent imports
    if (!contents.includes('import android.view.KeyEvent')) {
      const androidImportIndex = modResults.contents.indexOf('import android.');
      if (androidImportIndex !== -1) {
        modResults.contents = 
          modResults.contents.slice(0, androidImportIndex) + 
          'import android.view.KeyEvent\n' + 
          'import android.view.MotionEvent\n' + 
          modResults.contents.slice(androidImportIndex);
      }
    }

    return config;
  });
};

module.exports = withGamepadMainActivity;
