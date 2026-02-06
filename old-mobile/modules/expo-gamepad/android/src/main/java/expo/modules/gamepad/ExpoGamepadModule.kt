package expo.modules.gamepad

import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoGamepadModule : Module() {
  private val connectedDevices = mutableMapOf<Int, InputDevice>()
  private var lastHatX = 0f
  private var lastHatY = 0f
  private val dpadButtonState = mutableMapOf<String, Boolean>()

  companion object {
    @Volatile
    private var instance: ExpoGamepadModule? = null

    fun getInstance(): ExpoGamepadModule? = instance
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoGamepad")

    Events("onGamepadButton", "onGamepadConnected", "onGamepadDisconnected", "onGamepadAnalogStick")

    Function("getConnectedDevices") {
      return@Function connectedDevices.values.map { device ->
        mapOf(
          "deviceId" to device.id,
          "name" to device.name,
          "vendorId" to device.vendorId,
          "productId" to device.productId
        )
      }
    }

    OnCreate {
      instance = this@ExpoGamepadModule
      scanForGamepads()
    }

    OnDestroy {
      instance = null
      connectedDevices.clear()
    }
  }

  private fun scanForGamepads() {
    val deviceIds = InputDevice.getDeviceIds()
    for (deviceId in deviceIds) {
      val device = InputDevice.getDevice(deviceId)
      if (device != null && isGamepad(device)) {
        connectedDevices[deviceId] = device
      }
    }
  }

  private fun isGamepad(device: InputDevice): Boolean {
    val sources = device.sources
    return (sources and InputDevice.SOURCE_GAMEPAD == InputDevice.SOURCE_GAMEPAD) ||
           (sources and InputDevice.SOURCE_JOYSTICK == InputDevice.SOURCE_JOYSTICK)
  }

  private fun getButtonName(keyCode: Int): String {
    return when (keyCode) {
      // For Nintendo Switch Joy-Cons:
      // KEYCODE_DPAD_* are actually the HAT switch (physical buttons on left Joy-Con)
      KeyEvent.KEYCODE_DPAD_UP -> "HAT_UP"
      KeyEvent.KEYCODE_DPAD_DOWN -> "HAT_DOWN"
      KeyEvent.KEYCODE_DPAD_LEFT -> "HAT_LEFT"
      KeyEvent.KEYCODE_DPAD_RIGHT -> "HAT_RIGHT"
      
      KeyEvent.KEYCODE_BUTTON_A -> "A"
      KeyEvent.KEYCODE_BUTTON_B -> "B"
      KeyEvent.KEYCODE_BUTTON_X -> "X"
      KeyEvent.KEYCODE_BUTTON_Y -> "Y"
      KeyEvent.KEYCODE_BUTTON_L1 -> "L"
      KeyEvent.KEYCODE_BUTTON_R1 -> "R"
      KeyEvent.KEYCODE_BUTTON_L2 -> "ZL"
      KeyEvent.KEYCODE_BUTTON_R2 -> "ZR"
      KeyEvent.KEYCODE_BUTTON_THUMBL -> "L_STICK"
      KeyEvent.KEYCODE_BUTTON_THUMBR -> "R_STICK"
      KeyEvent.KEYCODE_BUTTON_START -> "PLUS"
      KeyEvent.KEYCODE_BUTTON_SELECT -> "MINUS"
      KeyEvent.KEYCODE_BUTTON_MODE -> "HOME"
      KeyEvent.KEYCODE_BUTTON_C -> "CAPTURE"
      KeyEvent.KEYCODE_BUTTON_Z -> "Z"
      else -> "BUTTON_$keyCode"
    }
  }

  // Handle key events (button presses)
  fun handleKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    if (isGamepadEvent(event)) {
      val device = InputDevice.getDevice(event.deviceId)
      
      // Add device if not already tracked
      if (device != null && !connectedDevices.containsKey(event.deviceId)) {
        connectedDevices[event.deviceId] = device
        sendEvent("onGamepadConnected", mapOf(
          "deviceId" to device.id,
          "name" to device.name,
          "vendorId" to device.vendorId,
          "productId" to device.productId
        ))
      }

      // For BUTTON_0 (D-pad), try to determine direction from scancode or HAT values
      val buttonName = if (keyCode == 0) {
        // Try scancode first (hardware-specific codes)
        val scanCode = event.scanCode
        val direction = when (scanCode) {
          544 -> "DPAD_UP"     // Common scancode for up
          545 -> "DPAD_DOWN"   // Common scancode for down
          546 -> "DPAD_LEFT"   // Common scancode for left
          547 -> "DPAD_RIGHT"  // Common scancode for right
          else -> {
            // Fallback to HAT axis values
            when {
              lastHatX < -0.5 -> "DPAD_LEFT"
              lastHatX > 0.5 -> "DPAD_RIGHT"
              lastHatY < -0.5 -> "DPAD_UP"
              lastHatY > 0.5 -> "DPAD_DOWN"
              else -> {
                // Log for debugging
                android.util.Log.d("ExpoGamepad", "BUTTON_0 pressed - scanCode: $scanCode, hatX: $lastHatX, hatY: $lastHatY")
                "DPAD_BTN"
              }
            }
          }
        }
        direction
      } else {
        getButtonName(keyCode)
      }

      // Track which D-pad button is currently pressed (for release event)
      if (keyCode == 0) {
        dpadButtonState[buttonName] = true
      }

      sendEvent("onGamepadButton", mapOf(
        "deviceId" to event.deviceId,
        "buttonIndex" to keyCode,
        "buttonName" to buttonName,
        "action" to "pressed",
        "timestamp" to System.currentTimeMillis()
      ))
      
      return true
    }
    return false
  }

  fun handleKeyUp(keyCode: Int, event: KeyEvent): Boolean {
    if (isGamepadEvent(event)) {
      // For BUTTON_0 (D-pad), find which button was pressed
      val buttonName = if (keyCode == 0) {
        // Find the button that was pressed
        val pressedButton = dpadButtonState.entries.firstOrNull { it.value }?.key ?: "DPAD_UNKNOWN"
        dpadButtonState.clear()
        pressedButton
      } else {
        getButtonName(keyCode)
      }
      
      sendEvent("onGamepadButton", mapOf(
        "deviceId" to event.deviceId,
        "buttonIndex" to keyCode,
        "buttonName" to buttonName,
        "action" to "released",
        "timestamp" to System.currentTimeMillis()
      ))
      
      return true
    }
    return false
  }

  private fun isGamepadEvent(event: KeyEvent): Boolean {
    val source = event.source
    return (source and InputDevice.SOURCE_GAMEPAD == InputDevice.SOURCE_GAMEPAD) ||
           (source and InputDevice.SOURCE_JOYSTICK == InputDevice.SOURCE_JOYSTICK)
  }

  private var lastDebugLog = 0L
  
  fun handleGenericMotionEvent(event: MotionEvent): Boolean {
    if (event.source and InputDevice.SOURCE_JOYSTICK == InputDevice.SOURCE_JOYSTICK) {
      // Track HAT values for D-pad button detection
      lastHatX = event.getAxisValue(MotionEvent.AXIS_HAT_X)
      lastHatY = event.getAxisValue(MotionEvent.AXIS_HAT_Y)
      
      // Get analog stick values - try multiple axis mappings
      val leftX = event.getAxisValue(MotionEvent.AXIS_X)
      val leftY = event.getAxisValue(MotionEvent.AXIS_Y)
      
      // Right stick can be mapped to different axes depending on controller
      // Try Z/RZ first (common), then RX/RY (some controllers), then HAT_X/HAT_Y
      var rightX = event.getAxisValue(MotionEvent.AXIS_Z)
      var rightY = event.getAxisValue(MotionEvent.AXIS_RZ)
      
      // If Z/RZ are not active, try RX/RY
      if (kotlin.math.abs(rightX) < 0.01 && kotlin.math.abs(rightY) < 0.01) {
        rightX = event.getAxisValue(MotionEvent.AXIS_RX)
        rightY = event.getAxisValue(MotionEvent.AXIS_RY)
      }
      
      // If still not active, try HAT_X/HAT_Y (though these are usually for D-pad)
      if (kotlin.math.abs(rightX) < 0.01 && kotlin.math.abs(rightY) < 0.01) {
        rightX = event.getAxisValue(MotionEvent.AXIS_HAT_X)
        rightY = event.getAxisValue(MotionEvent.AXIS_HAT_Y)
      }
      
      // Calculate angle and magnitude for left stick
      val leftMagnitude = kotlin.math.sqrt(leftX * leftX + leftY * leftY)
      val leftAngle = if (leftMagnitude > 0.01) {
        Math.toDegrees(kotlin.math.atan2(leftY.toDouble(), leftX.toDouble()))
      } else 0.0
      
      // Calculate angle and magnitude for right stick
      val rightMagnitude = kotlin.math.sqrt(rightX * rightX + rightY * rightY)
      val rightAngle = if (rightMagnitude > 0.01) {
        Math.toDegrees(kotlin.math.atan2(rightY.toDouble(), rightX.toDouble()))
      } else 0.0
      
      // Send event with analog stick data
      sendEvent("onGamepadAnalogStick", mapOf(
        "deviceId" to event.deviceId,
        "leftStick" to mapOf(
          "x" to leftX,
          "y" to leftY,
          "angle" to leftAngle,
          "magnitude" to leftMagnitude
        ),
        "rightStick" to mapOf(
          "x" to rightX,
          "y" to rightY,
          "angle" to rightAngle,
          "magnitude" to rightMagnitude
        ),
        "timestamp" to System.currentTimeMillis()
      ))
      
      return true
    }
    return false
  }
}
