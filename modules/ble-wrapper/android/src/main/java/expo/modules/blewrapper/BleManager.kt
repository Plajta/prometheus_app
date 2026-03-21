package eu.plajta.plajtime

import android.annotation.SuppressLint
import android.bluetooth.*
import android.content.Context
import android.os.Build
import android.util.Log
import java.util.*

class BleManager(private val context: Context) {

    private var bluetoothGatt: BluetoothGatt? = null
    
    // Hold the music title for syncing
    var musicTitle: String = "Unknown Track"

    var musicAlbum: String = "Unknown Album/Artist"

    // Queue to handle GATT operations sequentially
    private val commandQueue: Queue<BleCommand> = LinkedList()
    private var isCommandInProgress = false

    private sealed class BleCommand {
        data class Write(val characteristic: BluetoothGattCharacteristic, val value: ByteArray) : BleCommand()
        object Disconnect : BleCommand()
    }

    private val gattCallback = object : BluetoothGattCallback() {
        @SuppressLint("MissingPermission")
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            Log.d("BleManager", "onConnectionStateChange: status=$status, newState=$newState")

            if (newState == BluetoothGatt.STATE_CONNECTED) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    Log.i("BleManager", "Connected, discovering services...")
                    gatt.requestMtu(517)
                    gatt.discoverServices()
                } else {
                    Log.e("BleManager", "Connect failed with status $status")
                    closeGatt()
                }
            } else if (newState == BluetoothGatt.STATE_DISCONNECTED) {
                Log.i("BleManager", "Disconnected from GATT server")
                synchronized(this@BleManager) {
                    commandQueue.clear()
                    isCommandInProgress = false
                }
                closeGatt()
            }
        }

        @SuppressLint("MissingPermission")
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                Log.i("BleManager", "Services discovered")
                writeSyncData(gatt)
            } else {
                Log.e("BleManager", "Service discovery failed, status: $status")
                closeGatt()
            }
        }

        @SuppressLint("MissingPermission")
        override fun onCharacteristicWrite(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int
        ) {
            Log.i("BleManager", "Write finished with status: $status")
            processNextCommand()
        }
    }

    @SuppressLint("MissingPermission")
    fun connect(device: BluetoothDevice) {
        synchronized(this) {
            commandQueue.clear()
            isCommandInProgress = false
        }
        closeGatt()
        Log.d("BleManager", "Connecting to ${device.address}")
        bluetoothGatt = device.connectGatt(context, false, gattCallback)
    }

    @SuppressLint("MissingPermission")
    private fun closeGatt() {
        bluetoothGatt?.let { gatt ->
            Log.d("BleManager", "Closing GATT resources")
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
                    Log.e("BleManager", "Failed to start characteristic write")
                    processNextCommand() // Move to next if this one failed to start
                }
            }
            is BleCommand.Disconnect -> {
                Log.d("BleManager", "Initiating disconnect...")
                gatt.disconnect()
            }
        }
    }

    private fun writeSyncData(gatt: BluetoothGatt) {
        val timeService = gatt.getService(BleConstants.CURRENT_TIME_SERVICE_UUID)
        val timeChar = timeService?.getCharacteristic(BleConstants.CURRENT_TIME_CHARACTERISTIC_UUID)

        val musicService = gatt.getService(BleConstants.MUSIC_SERVICE_UUID)
        val musicTrackChar = musicService?.getCharacteristic(BleConstants.MUSIC_SERVICE_TITLE_NAME_UUID)
        val musicAlbumChar = musicService?.getCharacteristic(BleConstants.MUSIC_SERVICE_ALBUM_NAME_UUID)

        if (timeChar != null) {
            Log.d("BleManager", "Enqueuing time write...")
            enqueueCommand(BleCommand.Write(timeChar, getCurrentTimeBytes()))
        }

        if (musicTrackChar != null && musicAlbumChar != null) {
            val musicBytes: ByteArray = musicTitle.toByteArray();
            val musicAlbumBytes: ByteArray = musicAlbum.toByteArray();

            Log.d("BleManager", "Enqueuing music title write: $musicTitle, with length ${musicTitle.length} encoded into ${musicBytes.size} bytes")
            Log.d("BleManager", "Enqueuing music album write: $musicAlbum, with length ${musicAlbum.length} encoded into ${musicAlbumBytes.size} bytes")

            enqueueCommand(BleCommand.Write(musicTrackChar, musicBytes))
            enqueueCommand(BleCommand.Write(musicAlbumChar, musicAlbumBytes))
        }

        enqueueCommand(BleCommand.Disconnect)
    }

    private fun getCurrentTimeBytes(): ByteArray {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH) + 1
        val day = calendar.get(Calendar.DAY_OF_MONTH)
        val hours = calendar.get(Calendar.HOUR_OF_DAY)
        val minutes = calendar.get(Calendar.MINUTE)
        val seconds = calendar.get(Calendar.SECOND)

        val dayOfWeek = when (val androidDay = calendar.get(Calendar.DAY_OF_WEEK)) {
            Calendar.SUNDAY -> 7
            else -> androidDay - 1
        }
        val fractions256 = (calendar.get(Calendar.MILLISECOND) * 256) / 1000
        return byteArrayOf(
            (year and 0xFF).toByte(), ((year shr 8) and 0xFF).toByte(),
            month.toByte(), day.toByte(), hours.toByte(), minutes.toByte(),
            seconds.toByte(), dayOfWeek.toByte(), fractions256.toByte(), 0
        )
    }
}
