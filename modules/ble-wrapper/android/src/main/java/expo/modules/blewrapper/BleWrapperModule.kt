package expo.modules.blewrapper

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class BleWrapperModule : Module() {

    private val nrfManager by lazy {
        NrfBleManager(appContext.reactContext!!).also { manager ->
            manager.onAccelData = { value ->
                sendEvent("onAccelData", mapOf("value" to value))
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

        Events("onAccelData", "onDeviceConnected", "onDeviceDisconnected")

        // Auto-scan + auto-connect in one call
        AsyncFunction("connectToXiao") { promise: Promise ->
            nrfManager.connectToXiao(
                onResult = { success ->
                    if (success) {
                        promise.resolve(null)
                    } else {
                        promise.reject("CONNECT_ERROR", "Connection failed", null)
                    }
                },
                onFail = { error ->
                    promise.reject("CONNECT_ERROR", error, null)
                }
            )
        }

        // Gracefully disconnect
        AsyncFunction("disconnect") { promise: Promise ->
            nrfManager.disconnect()
            promise.resolve(null)
        }

        // One-shot read of accelerometer (must be connected)
        AsyncFunction("readAccelerometer") { promise: Promise ->
            nrfManager.readAccelerometer(
                onResult = { value ->
                    promise.resolve(value)
                },
                onFail = { error ->
                    promise.reject("READ_ERROR", error, null)
                }
            )
        }

        // Turn green LED on/off (must be connected)
        AsyncFunction("setLed") { on: Boolean, promise: Promise ->
            nrfManager.writeLed(
                on = on,
                onResult = {
                    promise.resolve(null)
                },
                onFail = { error ->
                    promise.reject("WRITE_ERROR", error, null)
                }
            )
        }

        // Check connection state (synchronous)
        Function("isConnected") {
            nrfManager.isConnected
        }
    }
}
