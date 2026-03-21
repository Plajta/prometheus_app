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
 * BLE Manager for persistent connection with XIAO_Pill_Box (nRF52840 Sense).
 *
 * Standard services:
 *   - Battery (0x180F) — read
 *   - Environment Sensing / Temperature (0x181A / 0x2A6E) — read + notify
 *   - Current Time (0x1805 / 0x2A2B) — write (sync time from phone)
 *
 * Custom Pill Service (0x2000):
 *   - Alarm Interval  (0x2001) — write 4 bytes (uint32 seconds)
 *   - Alarm Morning   (0x2002) — write 2 bytes (hour, second)
 *   - Alarm Evening   (0x2003) — write 2 bytes (hour, second)
 *   - Cup State       (0x2004) — read/write/notify 2 bytes (14 bits)
 *   - Find My         (0x2005) — write anything → blinks red LED
 */
class NrfBleManager(private val context: Context) {

    companion object {
        private const val TAG = "NrfBleManager"

        // Standard BLE services
        val BATTERY_SERVICE_UUID: UUID  = uuidFrom16Bit(0x180F)
        val BATTERY_LEVEL_UUID: UUID    = uuidFrom16Bit(0x2A19)

        val ENV_SERVICE_UUID: UUID      = uuidFrom16Bit(0x181A)
        val TEMPERATURE_UUID: UUID      = uuidFrom16Bit(0x2A6E)

        val TIME_SERVICE_UUID: UUID     = uuidFrom16Bit(0x1805)
        val CURRENT_TIME_UUID: UUID     = uuidFrom16Bit(0x2A2B)

        // Custom Pill Service
        val PILL_SERVICE_UUID: UUID     = uuidFrom16Bit(0x2000)
        val ALARM_INTERVAL_UUID: UUID   = uuidFrom16Bit(0x2001)
        val ALARM_MORNING_UUID: UUID    = uuidFrom16Bit(0x2002)
        val ALARM_EVENING_UUID: UUID    = uuidFrom16Bit(0x2003)
        val CUP_STATE_UUID: UUID        = uuidFrom16Bit(0x2004)
        val FIND_MY_UUID: UUID          = uuidFrom16Bit(0x2005)

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
    var onTemperatureData: ((Float) -> Unit)? = null
    var onBatteryLevel: ((Int) -> Unit)? = null
    var onCupStateChanged: ((Int) -> Unit)? = null
    var onFindMyTriggered: (() -> Unit)? = null
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
                onDeviceDisconnected?.invoke()

                // Auto-reconnect
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
            Log.i(TAG, "Services discovered, subscribing to notifications...")

            // Subscribe to Temperature notifications (0x181A / 0x2A6E)
            val envService = gatt.getService(ENV_SERVICE_UUID)
            val tempChar = envService?.getCharacteristic(TEMPERATURE_UUID)
            if (tempChar != null) {
                enqueueCommand(BleCommand.EnableNotify(tempChar))
            } else {
                Log.w(TAG, "Temperature characteristic not found")
            }

            // Subscribe to Cup State notifications (0x2000 / 0x2004)
            val pillService = gatt.getService(PILL_SERVICE_UUID)
            val cupChar = pillService?.getCharacteristic(CUP_STATE_UUID)
            if (cupChar != null) {
                enqueueCommand(BleCommand.EnableNotify(cupChar))
            } else {
                Log.w(TAG, "Cup State characteristic not found")
            }

            // Read initial battery level
            val batService = gatt.getService(BATTERY_SERVICE_UUID)
            val batChar = batService?.getCharacteristic(BATTERY_LEVEL_UUID)
            if (batChar != null) {
                enqueueCommand(BleCommand.Read(batChar))
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
                TEMPERATURE_UUID -> {
                    // BLE format: sint16, resolution 0.01 °C
                    val raw = characteristic.getIntValue(BluetoothGattCharacteristic.FORMAT_SINT16, 0)
                    val tempCelsius = (raw ?: 0) / 100.0f
                    Log.d(TAG, "Temperature notification: $tempCelsius °C")
                    onTemperatureData?.invoke(tempCelsius)
                }
                CUP_STATE_UUID -> {
                    val state = characteristic.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT16, 0) ?: 0
                    Log.d(TAG, "Cup state notification: $state (bin: ${Integer.toBinaryString(state)})")
                    onCupStateChanged?.invoke(state)
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
                when (characteristic.uuid) {
                    BATTERY_LEVEL_UUID -> {
                        val level = characteristic.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT8, 0) ?: 0
                        Log.i(TAG, "Battery level: $level%")
                        onBatteryLevel?.invoke(level)
                    }
                    CUP_STATE_UUID -> {
                        val state = characteristic.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT16, 0) ?: 0
                        Log.i(TAG, "Cup state read: $state")
                        onReadResult?.invoke(state.toString())
                        onReadResult = null
                    }
                    else -> {
                        val value = characteristic.value?.let { String(it) } ?: ""
                        Log.i(TAG, "Read value: $value")
                        onReadResult?.invoke(value)
                        onReadResult = null
                    }
                }
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
                Log.i(TAG, "Write successful to ${characteristic.uuid}")
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
     * Automatically scan for XIAO_Pill_Box, connect, and stay connected.
     */
    @SuppressLint("MissingPermission")
    fun connectToXiao(
        onResult: (Boolean) -> Unit,
        onFail: (String) -> Unit
    ) {
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

                if (name == "XIAO_Pill_Box") {
                    Log.i(TAG, "Found XIAO_Pill_Box: ${result.device.address}, connecting...")
                    stopScan()

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
        Log.i(TAG, "BLE scan started, looking for XIAO_Pill_Box...")
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
     * Disconnect gracefully. Disables auto-reconnect.
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

    // ─── Time Sync ─────────────────────────────────────────────────

    /**
     * Sync current time from phone to XIAO.
     * Writes 10 bytes to Current Time characteristic (0x2A2B):
     *   [year_lo, year_hi, month, day, hours, minutes, seconds, day_of_week, fractions, adjust_reason]
     */
    fun syncTime(
        onResult: (Boolean) -> Unit,
        onFail: (String) -> Unit
    ) {
        val gatt = bluetoothGatt
        if (gatt == null) {
            onFail("Not connected")
            return
        }

        val timeService = gatt.getService(TIME_SERVICE_UUID)
        val timeChar = timeService?.getCharacteristic(CURRENT_TIME_UUID)
        if (timeChar == null) {
            onFail("Current Time characteristic not found")
            return
        }

        val cal = java.util.Calendar.getInstance()
        val year = cal.get(java.util.Calendar.YEAR)
        val month = cal.get(java.util.Calendar.MONTH) + 1
        val day = cal.get(java.util.Calendar.DAY_OF_MONTH)
        val hours = cal.get(java.util.Calendar.HOUR_OF_DAY)
        val minutes = cal.get(java.util.Calendar.MINUTE)
        val seconds = cal.get(java.util.Calendar.SECOND)
        val dayOfWeek = cal.get(java.util.Calendar.DAY_OF_WEEK)
        
        val data = byteArrayOf(
            (year and 0xFF).toByte(),
            ((year shr 8) and 0xFF).toByte(),
            month.toByte(),
            day.toByte(),
            hours.toByte(),
            minutes.toByte(),
            seconds.toByte(),
            dayOfWeek.toByte(),
            0, // fractions256
            0  // adjust reason
        )

        onWriteResult = onResult
        onError = onFail
        enqueueCommand(BleCommand.Write(timeChar, data))
    }

    // ─── Alarm Interval ────────────────────────────────────────────

    /**
     * Set alarm repeat interval in seconds (uint32, 4 bytes).
     */
    fun setAlarmInterval(
        seconds: Int,
        onResult: (Boolean) -> Unit,
        onFail: (String) -> Unit
    ) {
        val gatt = bluetoothGatt ?: run { onFail("Not connected"); return }
        val service = gatt.getService(PILL_SERVICE_UUID)
        val char = service?.getCharacteristic(ALARM_INTERVAL_UUID) ?: run {
            onFail("Alarm Interval characteristic not found"); return
        }

        val data = byteArrayOf(
            (seconds and 0xFF).toByte(),
            ((seconds shr 8) and 0xFF).toByte(),
            ((seconds shr 16) and 0xFF).toByte(),
            ((seconds shr 24) and 0xFF).toByte()
        )

        onWriteResult = onResult
        onError = onFail
        enqueueCommand(BleCommand.Write(char, data))
    }

    // ─── Alarm Morning / Evening ───────────────────────────────────

    /**
     * Set morning alarm time (2 bytes: hour, second).
     */
    fun setAlarmMorning(
        hour: Int,
        second: Int,
        onResult: (Boolean) -> Unit,
        onFail: (String) -> Unit
    ) {
        val gatt = bluetoothGatt ?: run { onFail("Not connected"); return }
        val service = gatt.getService(PILL_SERVICE_UUID)
        val char = service?.getCharacteristic(ALARM_MORNING_UUID) ?: run {
            onFail("Alarm Morning characteristic not found"); return
        }

        val data = byteArrayOf(hour.toByte(), second.toByte())
        onWriteResult = onResult
        onError = onFail
        enqueueCommand(BleCommand.Write(char, data))
    }

    /**
     * Set evening alarm time (2 bytes: hour, second).
     */
    fun setAlarmEvening(
        hour: Int,
        second: Int,
        onResult: (Boolean) -> Unit,
        onFail: (String) -> Unit
    ) {
        val gatt = bluetoothGatt ?: run { onFail("Not connected"); return }
        val service = gatt.getService(PILL_SERVICE_UUID)
        val char = service?.getCharacteristic(ALARM_EVENING_UUID) ?: run {
            onFail("Alarm Evening characteristic not found"); return
        }

        val data = byteArrayOf(hour.toByte(), second.toByte())
        onWriteResult = onResult
        onError = onFail
        enqueueCommand(BleCommand.Write(char, data))
    }

    // ─── Cup State ─────────────────────────────────────────────────

    /**
     * Read current cup state (14 bits in 2 bytes).
     */
    fun readCupState(
        onResult: (String) -> Unit,
        onFail: (String) -> Unit
    ) {
        val gatt = bluetoothGatt ?: run { onFail("Not connected"); return }
        val service = gatt.getService(PILL_SERVICE_UUID)
        val char = service?.getCharacteristic(CUP_STATE_UUID) ?: run {
            onFail("Cup State characteristic not found"); return
        }

        onReadResult = onResult
        onError = onFail
        enqueueCommand(BleCommand.Read(char))
    }

    /**
     * Write new cup state (14 bits in 2 bytes).
     */
    fun writeCupState(
        state: Int,
        onResult: (Boolean) -> Unit,
        onFail: (String) -> Unit
    ) {
        val gatt = bluetoothGatt ?: run { onFail("Not connected"); return }
        val service = gatt.getService(PILL_SERVICE_UUID)
        val char = service?.getCharacteristic(CUP_STATE_UUID) ?: run {
            onFail("Cup State characteristic not found"); return
        }

        val data = byteArrayOf(
            (state and 0xFF).toByte(),
            ((state shr 8) and 0xFF).toByte()
        )

        onWriteResult = onResult
        onError = onFail
        enqueueCommand(BleCommand.Write(char, data))
    }

    // ─── Find My ───────────────────────────────────────────────────

    /**
     * Trigger Find My — write any byte to make the XIAO blink its red LED.
     */
    fun findMy(
        onResult: (Boolean) -> Unit,
        onFail: (String) -> Unit
    ) {
        val gatt = bluetoothGatt ?: run { onFail("Not connected"); return }
        val service = gatt.getService(PILL_SERVICE_UUID)
        val char = service?.getCharacteristic(FIND_MY_UUID) ?: run {
            onFail("Find My characteristic not found"); return
        }

        onWriteResult = onResult
        onError = onFail
        enqueueCommand(BleCommand.Write(char, byteArrayOf(0x01)))
    }

    // ─── Read Battery ──────────────────────────────────────────────

    /**
     * Read battery level (one-shot).
     */
    fun readBattery(
        onResult: (String) -> Unit,
        onFail: (String) -> Unit
    ) {
        val gatt = bluetoothGatt ?: run { onFail("Not connected"); return }
        val service = gatt.getService(BATTERY_SERVICE_UUID)
        val char = service?.getCharacteristic(BATTERY_LEVEL_UUID) ?: run {
            onFail("Battery Level characteristic not found"); return
        }

        onReadResult = onResult
        onError = onFail
        enqueueCommand(BleCommand.Read(char))
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
                gatt.setCharacteristicNotification(nextCommand.characteristic, true)

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
