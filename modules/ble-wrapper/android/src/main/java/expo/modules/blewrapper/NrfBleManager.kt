package expo.modules.blewrapper

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import java.util.*

/**
 * BLE Manager tailored for communication with the XIAO nRF52840 Sense.
 *
 * Supports:
 * - Scanning for a device by name ("XIAO_Sense_Accel")
 * - Reading accelerometer data from characteristic 0x1235
 * - Writing LED state ("1"/"0") to characteristic 0x1236
 *
 * Inspired by the PlajTime BleManager command-queue pattern.
 */
class NrfBleManager(private val context: Context) {

    companion object {
        private const val TAG = "NrfBleManager"

        // 16-bit UUIDs used in the XIAO firmware
        val SERVICE_UUID: UUID         = uuidFrom16Bit(0x1234)
        val ACCEL_CHAR_UUID: UUID      = uuidFrom16Bit(0x1235)
        val LED_CHAR_UUID: UUID        = uuidFrom16Bit(0x1236)

        /** Convert 16-bit BLE UUID to full 128-bit UUID */
        private fun uuidFrom16Bit(shortUuid: Int): UUID {
            return UUID.fromString(
                String.format("0000%04x-0000-1000-8000-00805f9b34fb", shortUuid)
            )
        }
    }

    private var bluetoothGatt: BluetoothGatt? = null
    private var bleScanner: BluetoothLeScanner? = null
    private var scanCallback: ScanCallback? = null

    // Command queue for sequential GATT operations
    private val commandQueue: Queue<BleCommand> = LinkedList()
    private var isCommandInProgress = false

    // Callbacks for async results
    private var onReadResult: ((String) -> Unit)? = null
    private var onWriteResult: ((Boolean) -> Unit)? = null
    private var onScanResult: ((String) -> Unit)? = null
    private var onError: ((String) -> Unit)? = null

    private sealed class BleCommand {
        data class Read(val characteristic: BluetoothGattCharacteristic) : BleCommand()
        data class Write(val characteristic: BluetoothGattCharacteristic, val value: ByteArray) : BleCommand()
        object Disconnect : BleCommand()
    }

    // ─── GATT Callback ─────────────────────────────────────────────

    private var pendingAction: PendingAction = PendingAction.None

    private sealed class PendingAction {
        object None : PendingAction()
        object ReadAccel : PendingAction()
        data class WriteLed(val value: String) : PendingAction()
    }

    private val gattCallback = object : BluetoothGattCallback() {
        @SuppressLint("MissingPermission")
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            Log.d(TAG, "onConnectionStateChange: status=$status, newState=$newState")

            if (newState == BluetoothGatt.STATE_CONNECTED) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    Log.i(TAG, "Connected, discovering services...")
                    gatt.requestMtu(256)
                    gatt.discoverServices()
                } else {
                    Log.e(TAG, "Connect failed with status $status")
                    onError?.invoke("Connection failed with status $status")
                    closeGatt()
                }
            } else if (newState == BluetoothGatt.STATE_DISCONNECTED) {
                Log.i(TAG, "Disconnected from GATT server")
                synchronized(this@NrfBleManager) {
                    commandQueue.clear()
                    isCommandInProgress = false
                }
                closeGatt()
            }
        }

        @SuppressLint("MissingPermission")
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                Log.e(TAG, "Service discovery failed, status: $status")
                onError?.invoke("Service discovery failed")
                closeGatt()
                return
            }
            Log.i(TAG, "Services discovered")

            when (val action = pendingAction) {
                is PendingAction.ReadAccel -> {
                    val service = gatt.getService(SERVICE_UUID)
                    val accelChar = service?.getCharacteristic(ACCEL_CHAR_UUID)
                    if (accelChar != null) {
                        enqueueCommand(BleCommand.Read(accelChar))
                        enqueueCommand(BleCommand.Disconnect)
                    } else {
                        onError?.invoke("Accelerometer characteristic not found")
                        closeGatt()
                    }
                }
                is PendingAction.WriteLed -> {
                    val service = gatt.getService(SERVICE_UUID)
                    val ledChar = service?.getCharacteristic(LED_CHAR_UUID)
                    if (ledChar != null) {
                        enqueueCommand(BleCommand.Write(ledChar, action.value.toByteArray()))
                        enqueueCommand(BleCommand.Disconnect)
                    } else {
                        onError?.invoke("LED characteristic not found")
                        closeGatt()
                    }
                }
                is PendingAction.None -> {
                    closeGatt()
                }
            }
        }

        @SuppressLint("MissingPermission")
        override fun onCharacteristicRead(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int
        ) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val value = characteristic.value?.let { String(it) } ?: ""
                Log.i(TAG, "Read value: $value")
                onReadResult?.invoke(value)
            } else {
                Log.e(TAG, "Characteristic read failed, status: $status")
                onError?.invoke("Read failed with status $status")
            }
            processNextCommand()
        }

        @SuppressLint("MissingPermission")
        override fun onCharacteristicWrite(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int
        ) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                Log.i(TAG, "Write successful")
                onWriteResult?.invoke(true)
            } else {
                Log.e(TAG, "Write failed with status: $status")
                onError?.invoke("Write failed with status $status")
            }
            processNextCommand()
        }
    }

    // ─── Public API ─────────────────────────────────────────────────

    /**
     * Scan for XIAO_Sense_Accel device.
     * Returns device MAC address via onFound callback.
     */
    @SuppressLint("MissingPermission")
    fun scanForDevice(
        onFound: (address: String) -> Unit,
        onScanError: (String) -> Unit
    ) {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = bluetoothManager.adapter
        if (adapter == null || !adapter.isEnabled) {
            onScanError("Bluetooth is not enabled")
            return
        }

        bleScanner = adapter.bluetoothLeScanner
        if (bleScanner == null) {
            onScanError("BLE Scanner not available")
            return
        }

        scanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val name = result.device.name ?: return
                if (name == "XIAO_Sense_Accel") {
                    Log.i(TAG, "Found XIAO device: ${result.device.address}")
                    stopScan()
                    onFound(result.device.address)
                }
            }

            override fun onScanFailed(errorCode: Int) {
                Log.e(TAG, "Scan failed with error: $errorCode")
                onScanError("Scan failed with error $errorCode")
            }
        }

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        bleScanner?.startScan(null, settings, scanCallback)
        Log.i(TAG, "BLE scan started")
    }

    /** Stop any active BLE scan */
    @SuppressLint("MissingPermission")
    fun stopScan() {
        scanCallback?.let {
            bleScanner?.stopScan(it)
            scanCallback = null
            Log.i(TAG, "BLE scan stopped")
        }
    }

    /**
     * Connect to a device by MAC address and read the accelerometer characteristic.
     * Returns the value (e.g. "0.15,-0.98,0.05") via onResult.
     */
    @SuppressLint("MissingPermission")
    fun readAccelerometer(
        address: String,
        onResult: (String) -> Unit,
        onFail: (String) -> Unit
    ) {
        pendingAction = PendingAction.ReadAccel
        onReadResult = onResult
        onError = onFail
        connectToDevice(address, onFail)
    }

    /**
     * Connect to a device by MAC address and write LED state.
     * @param on true = LED on ("1"), false = LED off ("0")
     */
    @SuppressLint("MissingPermission")
    fun writeLed(
        address: String,
        on: Boolean,
        onResult: (Boolean) -> Unit,
        onFail: (String) -> Unit
    ) {
        val value = if (on) "1" else "0"
        pendingAction = PendingAction.WriteLed(value)
        onWriteResult = onResult
        onError = onFail
        connectToDevice(address, onFail)
    }

    // ─── Private helpers ────────────────────────────────────────────

    @SuppressLint("MissingPermission")
    private fun connectToDevice(address: String, onFail: (String) -> Unit) {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = bluetoothManager.adapter
        if (adapter == null || !adapter.isEnabled) {
            onFail("Bluetooth is not enabled")
            return
        }

        val device = adapter.getRemoteDevice(address)
        if (device == null) {
            onFail("Device not found: $address")
            return
        }

        synchronized(this) {
            commandQueue.clear()
            isCommandInProgress = false
        }
        closeGatt()

        Log.d(TAG, "Connecting to $address")
        bluetoothGatt = device.connectGatt(context, false, gattCallback)
    }

    @SuppressLint("MissingPermission")
    private fun closeGatt() {
        bluetoothGatt?.let { gatt ->
            Log.d(TAG, "Closing GATT resources")
            gatt.close()
            bluetoothGatt = null
        }
    }

    @Synchronized
    private fun enqueueCommand(command: BleCommand) {
        commandQueue.add(command)
        if (!isCommandInProgress) {
            processNextCommand()
        }
    }

    @SuppressLint("MissingPermission")
    private fun processNextCommand() {
        val nextCommand = synchronized(this) {
            val cmd = commandQueue.poll()
            if (cmd == null) {
                isCommandInProgress = false
                return
            }
            isCommandInProgress = true
            cmd
        }

        val gatt = bluetoothGatt ?: run {
            synchronized(this) {
                isCommandInProgress = false
                commandQueue.clear()
            }
            return
        }

        when (nextCommand) {
            is BleCommand.Read -> {
                val success = gatt.readCharacteristic(nextCommand.characteristic)
                if (!success) {
                    Log.e(TAG, "Failed to start characteristic read")
                    onError?.invoke("Failed to initiate read")
                    processNextCommand()
                }
            }
            is BleCommand.Write -> {
                val success = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    gatt.writeCharacteristic(
                        nextCommand.characteristic,
                        nextCommand.value,
                        BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
                    ) == BluetoothStatusCodes.SUCCESS
                } else {
                    @Suppress("DEPRECATION")
                    nextCommand.characteristic.value = nextCommand.value
                    @Suppress("DEPRECATION")
                    gatt.writeCharacteristic(nextCommand.characteristic)
                }

                if (!success) {
                    Log.e(TAG, "Failed to start characteristic write")
                    onError?.invoke("Failed to initiate write")
                    processNextCommand()
                }
            }
            is BleCommand.Disconnect -> {
                Log.d(TAG, "Initiating disconnect...")
                gatt.disconnect()
            }
        }
    }
}
