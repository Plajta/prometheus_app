package expo.modules.blewrapper

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class BleWrapperModule : Module() {

    private val nrfManager by lazy {
        NrfBleManager(appContext.reactContext!!).also { manager ->
            manager.onTemperatureData = { temp ->
                sendEvent("onTemperatureData", mapOf("temperature" to temp))
            }
            manager.onBatteryLevel = { level ->
                sendEvent("onBatteryLevel", mapOf("level" to level))
            }
            manager.onCupStateChanged = { state ->
                sendEvent("onCupStateChanged", mapOf("state" to state))
            }
            manager.onDeviceConnected = {
                sendEvent("onDeviceConnected", mapOf("connected" to true))
            }
            manager.onDeviceDisconnected = {
                sendEvent("onDeviceDisconnected", mapOf("connected" to false))
            }
        }
    }

    override fun definition() = ModuleDefinition {
        Name("BleWrapper")

        Events(
            "onTemperatureData",
            "onBatteryLevel",
            "onCupStateChanged",
            "onDeviceConnected",
            "onDeviceDisconnected"
        )

        // Auto-scan + auto-connect
        AsyncFunction("connectToXiao") { promise: Promise ->
            nrfManager.connectToXiao(
                onResult = { success ->
                    if (success) promise.resolve(null)
                    else promise.reject("CONNECT_ERROR", "Connection failed", null)
                },
                onFail = { error ->
                    promise.reject("CONNECT_ERROR", error, null)
                }
            )
        }

        // Graceful disconnect
        AsyncFunction("disconnect") { promise: Promise ->
            nrfManager.disconnect()
            promise.resolve(null)
        }

        // Sync time from phone to XIAO
        AsyncFunction("syncTime") { promise: Promise ->
            nrfManager.syncTime(
                onResult = { promise.resolve(null) },
                onFail = { error -> promise.reject("WRITE_ERROR", error, null) }
            )
        }

        // Set alarm interval in seconds
        AsyncFunction("setAlarmInterval") { seconds: Int, promise: Promise ->
            nrfManager.setAlarmInterval(
                seconds = seconds,
                onResult = { promise.resolve(null) },
                onFail = { error -> promise.reject("WRITE_ERROR", error, null) }
            )
        }

        // Set morning alarm (hour, second)
        AsyncFunction("setAlarmMorning") { hour: Int, second: Int, promise: Promise ->
            nrfManager.setAlarmMorning(
                hour = hour,
                second = second,
                onResult = { promise.resolve(null) },
                onFail = { error -> promise.reject("WRITE_ERROR", error, null) }
            )
        }

        // Set evening alarm (hour, second)
        AsyncFunction("setAlarmEvening") { hour: Int, second: Int, promise: Promise ->
            nrfManager.setAlarmEvening(
                hour = hour,
                second = second,
                onResult = { promise.resolve(null) },
                onFail = { error -> promise.reject("WRITE_ERROR", error, null) }
            )
        }

        // Read cup state (14 bits)
        AsyncFunction("readCupState") { promise: Promise ->
            nrfManager.readCupState(
                onResult = { value -> promise.resolve(value) },
                onFail = { error -> promise.reject("READ_ERROR", error, null) }
            )
        }

        // Write cup state (14 bits as uint16)
        AsyncFunction("writeCupState") { state: Int, promise: Promise ->
            nrfManager.writeCupState(
                state = state,
                onResult = { promise.resolve(null) },
                onFail = { error -> promise.reject("WRITE_ERROR", error, null) }
            )
        }

        // Find My — blink red LED on the XIAO
        AsyncFunction("findMy") { promise: Promise ->
            nrfManager.findMy(
                onResult = { promise.resolve(null) },
                onFail = { error -> promise.reject("WRITE_ERROR", error, null) }
            )
        }

        // Read battery level
        AsyncFunction("readBattery") { promise: Promise ->
            nrfManager.readBattery(
                onResult = { value -> promise.resolve(value) },
                onFail = { error -> promise.reject("READ_ERROR", error, null) }
            )
        }

        // Check connection state (synchronous)
        Function("isConnected") {
            nrfManager.isConnected
        }
    }
}
