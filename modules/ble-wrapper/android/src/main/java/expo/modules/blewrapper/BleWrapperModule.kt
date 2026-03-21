package expo.modules.blewrapper

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class BleWrapperModule : Module() {

    private val nrfManager by lazy {
        NrfBleManager(appContext.reactContext!!).also { manager ->
            // Wire up event listeners that push data to JavaScript
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

        // Events that can be listened to from JS
        Events("onAccelData", "onDeviceConnected", "onDeviceDisconnected")

        // Scan for XIAO_Sense_Accel, returns MAC address
        AsyncFunction("scanForXiao") { promise: Promise ->
            nrfManager.scanForDevice(
                onFound = { address ->
                    promise.resolve(address)
                },
                onScanError = { error ->
                    promise.reject("SCAN_ERROR", error, null)
                }
            )
        }

        // Stop any active BLE scan
        AsyncFunction("stopScan") { promise: Promise ->
            nrfManager.stopScan()
            promise.resolve(null)
        }

        // Connect to device and stay connected (persistent session)
        // Automatically subscribes to accelerometer notifications
        AsyncFunction("connect") { address: String, promise: Promise ->
            nrfManager.connect(
                address = address,
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

        // One-shot read of accelerometer (returns "X,Y,Z" string)
        // Device must already be connected via connect()
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

        // Turn green LED on/off. Device must already be connected.
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

        // Check if currently connected
        Function("isConnected") {
            nrfManager.isConnected
        }
    }
}
