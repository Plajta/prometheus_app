package expo.modules.blewrapper

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.*

/**
 * BLE Manager for persistent connection with XIAO nRF52840 Sense.
 *
 * Connects once, stays connected, subscribes to accelerometer notifications,
 * allows LED writes at any time, and emits events on disconnect.
 */
class NrfBleManager(private val context: Context) {

    companion object {
        private const val TAG = "NrfBleManager"

        val SERVICE_UUID: UUID     = uuidFrom16Bit(0x1234)
        val ACCEL_CHAR_UUID: UUID  = uuidFrom16Bit(0x1235)
        val LED_CHAR_UUID: UUID    = uuidFrom16Bit(0x1236)
        val BUTTON_CHAR_UUID: UUID = uuidFrom16Bit(0x1237)

        // Standard BLE Client Characteristic Configuration Descriptor
        val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

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

    // Auto-reconnect
    private var shouldAutoReconnect = false
    private val reconnectHandler = Handler(Looper.getMainLooper())
    private val RECONNECT_DELAY_MS = 3000L

    // Event listeners set by the Module
    var onAccelData: ((String) -> Unit)? = null
    var onButtonPress: (() -> Unit)? = null
    var onDeviceConnected: (() -> Unit)? = null
    var onDeviceDisconnected: (() -> Unit)? = null

    // Promise callbacks for one-shot operations
    private var onConnectResult: ((Boolean) -> Unit)? = null
    private var onWriteResult: ((Boolean) -> Unit)? = null
    private var onReadResult: ((String) -> Unit)? = null
    private var onError: ((String) -> Unit)? = null

    val isConnected: Boolean
        get() = bluetoothGatt != null

    private sealed class BleCommand {
        data class Read(val characteristic: BluetoothGattCharacteristic) : BleCommand()
        data class Write(val characteristic: BluetoothGattCharacteristic, val value: ByteArray) : BleCommand()
        data class EnableNotify(val characteristic: BluetoothGattCharacteristic) : BleCommand()
    }

    // ─── GATT Callback ──────────────────────────────────────────────

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
                    onConnectResult?.invoke(false)
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
                // Emit disconnect event to JS
                onDeviceDisconnected?.invoke()

                // Auto-reconnect: schedule a re-scan after a short delay
                if (shouldAutoReconnect) {
                    Log.i(TAG, "Auto-reconnect: will re-scan in ${RECONNECT_DELAY_MS}ms...")
                    reconnectHandler.postDelayed({
                        if (shouldAutoReconnect) {
                            Log.i(TAG, "Auto-reconnect: starting scan...")
                            connectToXiao(
                                onResult = { success ->
                                    if (success) Log.i(TAG, "Auto-reconnect: connected!")
                                },
                                onFail = { error ->
                                    Log.e(TAG, "Auto-reconnect failed: $error")
                                }
                            )
                        }
                    }, RECONNECT_DELAY_MS)
                }
            }
        }

        @SuppressLint("MissingPermission")
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                Log.e(TAG, "Service discovery failed, status: $status")
                onConnectResult?.invoke(false)
                onError?.invoke("Service discovery failed")
                closeGatt()
                return
            }
            Log.i(TAG, "Services discovered, subscribing to accel notifications...")

            // Subscribe to accelerometer notifications
            val service = gatt.getService(SERVICE_UUID)
            val accelChar = service?.getCharacteristic(ACCEL_CHAR_UUID)
            val buttonChar = service?.getCharacteristic(BUTTON_CHAR_UUID)

            if (accelChar != null) {
                enqueueCommand(BleCommand.EnableNotify(accelChar))
            } else {
                Log.w(TAG, "Accelerometer characteristic not found, continuing without notifications")
            }

            // Subscribe to button notifications
            if (buttonChar != null) {
                enqueueCommand(BleCommand.EnableNotify(buttonChar))
            } else {
                Log.w(TAG, "Button characteristic not found, continuing without button notifications")
            }

            // Signal that connection is alive
            onDeviceConnected?.invoke()
            onConnectResult?.invoke(true)
            onConnectResult = null
        }

        @Suppress("DEPRECATION")
        override fun onCharacteristicChanged(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic
        ) {
            when (characteristic.uuid) {
                ACCEL_CHAR_UUID -> {
                    val value = characteristic.value?.let { String(it) } ?: ""
                    onAccelData?.invoke(value)
                }
                BUTTON_CHAR_UUID -> {
                    Log.i(TAG, "Button press notification received!")
                    onButtonPress?.invoke()
                }
            }
        }

        @SuppressLint("MissingPermission")
        @Suppress("DEPRECATION")
        override fun onCharacteristicRead(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int
        ) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val value = characteristic.value?.let { String(it) } ?: ""
                Log.i(TAG, "Read value: $value")
                onReadResult?.invoke(value)
                onReadResult = null
            } else {
                Log.e(TAG, "Read failed, status: $status")
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
                onWriteResult = null
            } else {
                Log.e(TAG, "Write failed with status: $status")
                onError?.invoke("Write failed with status $status")
            }
            processNextCommand()
        }

        override fun onDescriptorWrite(
            gatt: BluetoothGatt,
            descriptor: BluetoothGattDescriptor,
            status: Int
        ) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                Log.i(TAG, "Descriptor write successful (notifications enabled)")
            } else {
                Log.e(TAG, "Descriptor write failed, status: $status")
            }
            processNextCommand()
        }
    }

    // ─── Public API ─────────────────────────────────────────────────

    /**
     * Automatically scan for XIAO_Sense_Accel, connect, and stay connected.
     * This is the single entry point — no manual scan or address needed.
     */
    @SuppressLint("MissingPermission")
    fun connectToXiao(
        onResult: (Boolean) -> Unit,
        onFail: (String) -> Unit
    ) {
        // Enable auto-reconnect from now on
        shouldAutoReconnect = true

        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = bluetoothManager.adapter
        if (adapter == null || !adapter.isEnabled) {
            onFail("Bluetooth is not enabled")
            return
        }

        bleScanner = adapter.bluetoothLeScanner
        if (bleScanner == null) {
            onFail("BLE Scanner not available")
            return
        }

        // Store callbacks for later use during connection
        onConnectResult = onResult
        onError = onFail

        scanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val deviceName = result.device.name
                val recordName = result.scanRecord?.deviceName
                val name = recordName ?: deviceName

                if (name != null) {
                    Log.d(TAG, "Scanned: name=$name, addr=${result.device.address}")
                }

                if (name == "XIAO_Sense_Accel") {
                    Log.i(TAG, "Found XIAO device: ${result.device.address}, connecting...")
                    stopScan()

                    // Immediately connect to the found device
                    synchronized(this@NrfBleManager) {
                        commandQueue.clear()
                        isCommandInProgress = false
                    }
                    closeGatt()
                    bluetoothGatt = result.device.connectGatt(context, false, gattCallback)
                }
            }

            override fun onScanFailed(errorCode: Int) {
                Log.e(TAG, "Scan failed with error: $errorCode")
                onFail("Scan failed with error $errorCode")
            }
        }

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        bleScanner?.startScan(null, settings, scanCallback)
        Log.i(TAG, "BLE scan started, looking for XIAO_Sense_Accel...")
    }

    @SuppressLint("MissingPermission")
    private fun stopScan() {
        scanCallback?.let {
            bleScanner?.stopScan(it)
            scanCallback = null
            Log.i(TAG, "BLE scan stopped")
        }
    }

    /**
     * Disconnect from the device gracefully.
     * Disables auto-reconnect.
     */
    @SuppressLint("MissingPermission")
    fun disconnect() {
        shouldAutoReconnect = false
        reconnectHandler.removeCallbacksAndMessages(null)
        stopScan()
        bluetoothGatt?.let { gatt ->
            Log.d(TAG, "Disconnecting (manual, no auto-reconnect)...")
            gatt.disconnect()
        }
    }

    /**
     * Read accelerometer once (one-shot read instead of notification).
     * The device must already be connected.
     */
    fun readAccelerometer(
        onResult: (String) -> Unit,
        onFail: (String) -> Unit
    ) {
        val gatt = bluetoothGatt
        if (gatt == null) {
            onFail("Not connected")
            return
        }

        val service = gatt.getService(SERVICE_UUID)
        val accelChar = service?.getCharacteristic(ACCEL_CHAR_UUID)
        if (accelChar == null) {
            onFail("Accelerometer characteristic not found")
            return
        }

        onReadResult = onResult
        onError = onFail
        enqueueCommand(BleCommand.Read(accelChar))
    }

    /**
     * Write LED state. Device must already be connected.
     */
    fun writeLed(
        on: Boolean,
        onResult: (Boolean) -> Unit,
        onFail: (String) -> Unit
    ) {
        val gatt = bluetoothGatt
        if (gatt == null) {
            onFail("Not connected")
            return
        }

        val service = gatt.getService(SERVICE_UUID)
        val ledChar = service?.getCharacteristic(LED_CHAR_UUID)
        if (ledChar == null) {
            onFail("LED characteristic not found")
            return
        }

        val value = if (on) "1" else "0"
        onWriteResult = onResult
        onError = onFail
        enqueueCommand(BleCommand.Write(ledChar, value.toByteArray()))
    }

    // ─── Private helpers ────────────────────────────────────────────

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
                @Suppress("DEPRECATION")
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
            is BleCommand.EnableNotify -> {
                // Tell Android to listen for notifications from this characteristic
                gatt.setCharacteristicNotification(nextCommand.characteristic, true)

                // Write to CCCD descriptor to tell the peripheral to start sending
                val descriptor = nextCommand.characteristic.getDescriptor(CCCD_UUID)
                if (descriptor != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        gatt.writeDescriptor(descriptor, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
                    } else {
                        @Suppress("DEPRECATION")
                        descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        @Suppress("DEPRECATION")
                        gatt.writeDescriptor(descriptor)
                    }
                } else {
                    Log.w(TAG, "CCCD descriptor not found, notifications may not work")
                    processNextCommand()
                }
            }
        }
    }
}
