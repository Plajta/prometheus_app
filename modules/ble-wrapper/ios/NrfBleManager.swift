import Foundation
import CoreBluetooth
import os.log

class NrfBleManager: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    
    // MARK: - Constants
    struct Constants {
        static let BATTERY_SERVICE_UUID = CBUUID(string: "180F")
        static let BATTERY_LEVEL_UUID   = CBUUID(string: "2A19")
        
        static let ENV_SERVICE_UUID     = CBUUID(string: "181A")
        static let TEMPERATURE_UUID     = CBUUID(string: "2A6E")
        
        static let TIME_SERVICE_UUID    = CBUUID(string: "1805")
        static let CURRENT_TIME_UUID    = CBUUID(string: "2A2B")
        
        static let PILL_SERVICE_UUID    = CBUUID(string: "2000")
        static let ALARM_INTERVAL_UUID  = CBUUID(string: "2001")
        static let ALARM_MORNING_UUID   = CBUUID(string: "2002")
        static let ALARM_EVENING_UUID   = CBUUID(string: "2003")
        static let CUP_STATE_UUID       = CBUUID(string: "2004")
        static let FIND_MY_UUID         = CBUUID(string: "2005")
        static let ALERTS_ENABLED_UUID  = CBUUID(string: "2006")
    }
    
    // MARK: - Properties
    private var centralManager: CBCentralManager!
    private var peripheral: CBPeripheral?
    
    // Callbacks for events
    var onTemperatureData: ((Float) -> Void)?
    var onBatteryLevel: ((Int) -> Void)?
    var onCupStateChanged: ((Int) -> Void)?
    var onDeviceConnected: (() -> Void)?
    var onDeviceDisconnected: (() -> Void)?
    
    // Callbacks for one-shot functions
    private var connectResolver: ((Bool) -> Void)?
    private var connectRejecter: ((String) -> Void)?
    
    private var pendingWrites: [CBUUID: ((Bool) -> Void)] = [:]
    private var pendingReads: [CBUUID: ((Any?) -> Void)] = [:]
    private var writeRejecters: [CBUUID: ((String) -> Void)] = [:]
    private var readRejecters: [CBUUID: ((String) -> Void)] = [:]
    
    // State
    private var shouldAutoReconnect = false
    
    var isConnected: Bool {
        return peripheral?.state == .connected
    }
    
    // MARK: - Initialization
    override init() {
        super.init()
        // Initialize CoreBluetooth queue
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    // MARK: - Public API
    
    func connectToXiao(onResult: @escaping (Bool) -> Void, onFail: @escaping (String) -> Void) {
        shouldAutoReconnect = true
        connectResolver = onResult
        connectRejecter = onFail
        
        if centralManager.state == .poweredOn {
            print("[NrfBleManager] Starting BLE Scan for XIAO_Pill_Box...")
            centralManager.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        } else if centralManager.state == .unauthorized || centralManager.state == .unsupported {
            onFail("Bluetooth is not authorized or supported.")
            connectResolver = nil
            connectRejecter = nil
        } else {
            // .unknown or .resetting means we just have to wait for centralManagerDidUpdateState
            print("[NrfBleManager] Central state is \(centralManager.state.rawValue), waiting for update to poweredOn...")
        }
    }
    
    func disconnect() {
        shouldAutoReconnect = false
        if centralManager.isScanning {
            centralManager.stopScan()
        }
        if let p = peripheral {
            print("[NrfBleManager] Disconnecting manually...")
            centralManager.cancelPeripheralConnection(p)
        }
    }
    
    func syncTime(onResult: @escaping (Bool) -> Void, onFail: @escaping (String) -> Void) {
        let date = Date()
        let calendar = Calendar.current
        
        let components = calendar.dateComponents([.year, .month, .day, .hour, .minute, .second, .weekday], from: date)
        
        let year = UInt16(components.year ?? 2026)
        let month = UInt8(components.month ?? 1)
        let day = UInt8(components.day ?? 1)
        let hours = UInt8(components.hour ?? 0)
        let minutes = UInt8(components.minute ?? 0)
        let seconds = UInt8(components.second ?? 0)
        let weekday = UInt8(components.weekday ?? 1)
        
        let data = Data([
            UInt8(year & 0xFF),
            UInt8((year >> 8) & 0xFF),
            month, day, hours, minutes, seconds, weekday, 0, 0
        ])
        
        write(to: Constants.CURRENT_TIME_UUID, serviceUUID: Constants.TIME_SERVICE_UUID, data: data, onResult: onResult, onFail: onFail)
    }
    
    func setAlarmInterval(seconds: Int, onResult: @escaping (Bool) -> Void, onFail: @escaping (String) -> Void) {
        let sec32 = UInt32(seconds)
        let data = Data([
            UInt8(sec32 & 0xFF),
            UInt8((sec32 >> 8) & 0xFF),
            UInt8((sec32 >> 16) & 0xFF),
            UInt8((sec32 >> 24) & 0xFF)
        ])
        write(to: Constants.ALARM_INTERVAL_UUID, serviceUUID: Constants.PILL_SERVICE_UUID, data: data, onResult: onResult, onFail: onFail)
    }
    
    func setAlarmMorning(hour: Int, second: Int, onResult: @escaping (Bool) -> Void, onFail: @escaping (String) -> Void) {
        let data = Data([UInt8(hour), UInt8(second)])
        write(to: Constants.ALARM_MORNING_UUID, serviceUUID: Constants.PILL_SERVICE_UUID, data: data, onResult: onResult, onFail: onFail)
    }
    
    func setAlarmEvening(hour: Int, second: Int, onResult: @escaping (Bool) -> Void, onFail: @escaping (String) -> Void) {
        let data = Data([UInt8(hour), UInt8(second)])
        write(to: Constants.ALARM_EVENING_UUID, serviceUUID: Constants.PILL_SERVICE_UUID, data: data, onResult: onResult, onFail: onFail)
    }
    
    func readCupState(onResult: @escaping (String) -> Void, onFail: @escaping (String) -> Void) {
        read(Constants.CUP_STATE_UUID, serviceUUID: Constants.PILL_SERVICE_UUID, onResult: { val in
            if let v = val as? Int {
                onResult(String(v))
            } else {
                onFail("Failed to parse cup state")
            }
        }, onFail: onFail)
    }
    
    func writeCupState(state: Int, onResult: @escaping (Bool) -> Void, onFail: @escaping (String) -> Void) {
        let data = Data([
            UInt8(state & 0xFF),
            UInt8((state >> 8) & 0xFF)
        ])
        write(to: Constants.CUP_STATE_UUID, serviceUUID: Constants.PILL_SERVICE_UUID, data: data, onResult: onResult, onFail: onFail)
    }
    
    func setAlertsEnabled(enabled: Bool, onResult: @escaping (Bool) -> Void, onFail: @escaping (String) -> Void) {
        let data = Data([enabled ? 1 : 0])
        write(to: Constants.ALERTS_ENABLED_UUID, serviceUUID: Constants.PILL_SERVICE_UUID, data: data, onResult: onResult, onFail: onFail)
    }
    
    func findMy(onResult: @escaping (Bool) -> Void, onFail: @escaping (String) -> Void) {
        let data = Data([1])
        write(to: Constants.FIND_MY_UUID, serviceUUID: Constants.PILL_SERVICE_UUID, data: data, onResult: onResult, onFail: onFail, type: .withoutResponse) // find my might be withoutResponse, but usually write is fine
    }
    
    func readBattery(onResult: @escaping (String) -> Void, onFail: @escaping (String) -> Void) {
        read(Constants.BATTERY_LEVEL_UUID, serviceUUID: Constants.BATTERY_SERVICE_UUID, onResult: { val in
            if let v = val as? Int {
                onResult(String(v))
            } else {
                onFail("Failed to parse battery")
            }
        }, onFail: onFail)
    }
    
    // MARK: - Internal Helpers
    
    private func getCharacteristic(_ uuid: CBUUID, in serviceUUID: CBUUID) -> CBCharacteristic? {
        guard let p = peripheral else { return nil }
        let service = p.services?.first(where: { $0.uuid == serviceUUID })
        return service?.characteristics?.first(where: { $0.uuid == uuid })
    }
    
    private func write(to charUUID: CBUUID, serviceUUID: CBUUID, data: Data, onResult: @escaping (Bool) -> Void, onFail: @escaping (String) -> Void, type: CBCharacteristicWriteType = .withResponse) {
        guard let p = peripheral, let characteristic = getCharacteristic(charUUID, in: serviceUUID) else {
            onFail("Characteristic \(charUUID.uuidString) not found or not connected")
            return
        }
        
        if type == .withResponse {
            pendingWrites[charUUID] = onResult
            writeRejecters[charUUID] = onFail
        }
        
        p.writeValue(data, for: characteristic, type: type)
        
        if type == .withoutResponse {
            onResult(true)
        }
    }
    
    private func read(_ charUUID: CBUUID, serviceUUID: CBUUID, onResult: @escaping (Any?) -> Void, onFail: @escaping (String) -> Void) {
        guard let p = peripheral, let characteristic = getCharacteristic(charUUID, in: serviceUUID) else {
            onFail("Characteristic \(charUUID.uuidString) not found or not connected")
            return
        }
        pendingReads[charUUID] = onResult
        readRejecters[charUUID] = onFail
        p.readValue(for: characteristic)
    }
    
    // MARK: - CBCentralManagerDelegate
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn && shouldAutoReconnect && peripheral == nil {
            // Started powered on, auto reconnect was requested but we are not connected
            print("[NrfBleManager] Central powered on, starting scan for auto-reconnect...")
            central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        } else if central.state != .poweredOn {
            print("[NrfBleManager] Bluetooth powered off or unauthorized.")
            if let fail = connectRejecter {
                fail("Bluetooth is not enabled (.poweredOn).")
                connectRejecter = nil
                connectResolver = nil
            }
        }
    }
    
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String
        
        if name == "XIAO_Pill_Box" {
            print("[NrfBleManager] Found XIAO_Pill_Box! Stopping scan and connecting...")
            central.stopScan()
            self.peripheral = peripheral
            self.peripheral?.delegate = self
            central.connect(peripheral, options: nil)
        }
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("[NrfBleManager] Connected to peripheral! Discovering services...")
        peripheral.discoverServices(nil)
    }
    
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("[NrfBleManager] Failed to connect: \(error?.localizedDescription ?? "unknown")")
        connectRejecter?("Failed to connect to peripheral")
        connectRejecter = nil
        connectResolver = nil
    }
    
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        print("[NrfBleManager] Disconnected from peripheral: \(error?.localizedDescription ?? "Graceful")")
        onDeviceDisconnected?()
        
        // Auto Reconnect logic - iOS will keep trying to connect if we just call connect
        if shouldAutoReconnect {
            print("[NrfBleManager] Auto-reconnect active, pending connection...")
            // Natively, iOS will auto-connect as soon as it's seen again when we tell it to connect blindly
            central.connect(peripheral, options: nil)
        } else {
            self.peripheral = nil
        }
    }
    
    // MARK: - CBPeripheralDelegate
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            print("[NrfBleManager] Service discovery failed: \(error.localizedDescription)")
            connectRejecter?("Service discovery failed")
            connectRejecter = nil
            connectResolver = nil
            return
        }
        
        guard let services = peripheral.services else { return }
        for service in services {
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let characteristics = service.characteristics else { return }
        
        var servicesDiscoveredComplete = true
        for s in peripheral.services ?? [] {
            if s.characteristics == nil {
                servicesDiscoveredComplete = false
                break
            }
        }
        
        // Subscribe to notifications
        for characteristic in characteristics {
            if characteristic.uuid == Constants.TEMPERATURE_UUID || characteristic.uuid == Constants.CUP_STATE_UUID {
                peripheral.setNotifyValue(true, for: characteristic)
            }
            if characteristic.uuid == Constants.BATTERY_LEVEL_UUID {
                peripheral.readValue(for: characteristic) // Read initial battery
            }
        }
        
        if servicesDiscoveredComplete {
            // We have discovered characteristics for all services
            print("[NrfBleManager] All characteristics discovered, ready to use!")
            onDeviceConnected?()
            connectResolver?(true)
            connectResolver = nil
            connectRejecter = nil
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            readRejecters[characteristic.uuid]?(error.localizedDescription)
            readRejecters.removeValue(forKey: characteristic.uuid)
            pendingReads.removeValue(forKey: characteristic.uuid)
            return
        }
        
        guard let data = characteristic.value else { return }
        
        switch characteristic.uuid {
        case Constants.TEMPERATURE_UUID:
            guard data.count >= 2 else { return }
            let raw = Int16(bitPattern: UInt16(data[0]) | (UInt16(data[1]) << 8))
            let celsius = Float(raw) / 100.0
            onTemperatureData?(celsius)
            
        case Constants.CUP_STATE_UUID:
            guard data.count >= 2 else { return }
            let state = Int(data[0]) | (Int(data[1]) << 8)
            onCupStateChanged?(state)
            
            // If it was a pending manual read callback
            if let cb = pendingReads[Constants.CUP_STATE_UUID] {
                cb(state)
                pendingReads.removeValue(forKey: Constants.CUP_STATE_UUID)
                readRejecters.removeValue(forKey: Constants.CUP_STATE_UUID)
            }
            
        case Constants.BATTERY_LEVEL_UUID:
            guard data.count >= 1 else { return }
            let level = Int(data[0])
            onBatteryLevel?(level)
            
            if let cb = pendingReads[Constants.BATTERY_LEVEL_UUID] {
                cb(level)
                pendingReads.removeValue(forKey: Constants.BATTERY_LEVEL_UUID)
                readRejecters.removeValue(forKey: Constants.BATTERY_LEVEL_UUID)
            }
            
        default:
            // Generic string resolution for unknowns (if any)
            if let str = String(data: data, encoding: .utf8), let cb = pendingReads[characteristic.uuid] {
                cb(str)
                pendingReads.removeValue(forKey: characteristic.uuid)
                readRejecters.removeValue(forKey: characteristic.uuid)
            }
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            writeRejecters[characteristic.uuid]?(error.localizedDescription)
        } else {
            pendingWrites[characteristic.uuid]?(true)
        }
        pendingWrites.removeValue(forKey: characteristic.uuid)
        writeRejecters.removeValue(forKey: characteristic.uuid)
    }
}
