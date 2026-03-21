package expo.modules.blewrapper

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class BleWrapperModule : Module() {

    private val nrfManager by lazy {
        NrfBleManager(appContext.reactContext!!)
    }

    override fun definition() = ModuleDefinition {
        Name("BleWrapper")

        Events("onChange")

        // Scan for XIAO_Sense_Accel device, returns its MAC address
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

        // Read accelerometer data from the XIAO device
        // Returns a string like "0.15,-0.98,0.05"
        AsyncFunction("readAccelerometer") { address: String, promise: Promise ->
            nrfManager.readAccelerometer(
                address = address,
                onResult = { value ->
                    promise.resolve(value)
                },
                onFail = { error ->
                    promise.reject("READ_ERROR", error, null)
                }
            )
        }

        // Turn the green LED on or off
        AsyncFunction("setLed") { address: String, on: Boolean, promise: Promise ->
            nrfManager.writeLed(
                address = address,
                on = on,
                onResult = {
                    promise.resolve(null)
                },
                onFail = { error ->
                    promise.reject("WRITE_ERROR", error, null)
                }
            )
        }
    }
}
