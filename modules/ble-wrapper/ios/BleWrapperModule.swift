import ExpoModulesCore

public class BleWrapperModule: Module {
    private lazy var nrfManager: NrfBleManager = {
        let manager = NrfBleManager()
        manager.onTemperatureData = { [weak self] temp in
            self?.sendEvent("onTemperatureData", ["temperature": temp])
        }
        manager.onBatteryLevel = { [weak self] level in
            self?.sendEvent("onBatteryLevel", ["level": level])
        }
        manager.onCupStateChanged = { [weak self] state in
            self?.sendEvent("onCupStateChanged", ["state": state])
        }
        manager.onDeviceConnected = { [weak self] in
            self?.sendEvent("onDeviceConnected", ["connected": true])
        }
        manager.onDeviceDisconnected = { [weak self] in
            self?.sendEvent("onDeviceDisconnected", ["connected": false])
        }
        return manager
    }()

    public func definition() -> ModuleDefinition {
        Name("BleWrapper")
        Events(
            "onTemperatureData",
            "onBatteryLevel",
            "onCupStateChanged",
            "onDeviceConnected",
            "onDeviceDisconnected"
        )
        AsyncFunction("connectToXiao") { (promise: Promise) in
            self.nrfManager.connectToXiao(
                onResult: { success in
                    if success { promise.resolve() } else { promise.reject("CONNECT_ERROR", "Connection failed") }
                },
                onFail: { error in promise.reject("CONNECT_ERROR", error) }
            )
        }
        AsyncFunction("disconnect") {
            self.nrfManager.disconnect()
        }
        AsyncFunction("syncTime") { (promise: Promise) in
            self.nrfManager.syncTime(
                onResult: { _ in promise.resolve() },
                onFail: { error in promise.reject("WRITE_ERROR", error) }
            )
        }
        AsyncFunction("setAlarmInterval") { (seconds: Int, promise: Promise) in
            self.nrfManager.setAlarmInterval(seconds: seconds,
                onResult: { _ in promise.resolve() },
                onFail: { error in promise.reject("WRITE_ERROR", error) }
            )
        }
        AsyncFunction("setAlarmMorning") { (hour: Int, second: Int, promise: Promise) in
            self.nrfManager.setAlarmMorning(hour: hour, second: second,
                onResult: { _ in promise.resolve() },
                onFail: { error in promise.reject("WRITE_ERROR", error) }
            )
        }
        AsyncFunction("setAlarmEvening") { (hour: Int, second: Int, promise: Promise) in
            self.nrfManager.setAlarmEvening(hour: hour, second: second,
                onResult: { _ in promise.resolve() },
                onFail: { error in promise.reject("WRITE_ERROR", error) }
            )
        }
        AsyncFunction("readCupState") { (promise: Promise) in
            self.nrfManager.readCupState(
                onResult: { value in promise.resolve(value) },
                onFail: { error in promise.reject("READ_ERROR", error) }
            )
        }
        AsyncFunction("writeCupState") { (state: Int, promise: Promise) in
            self.nrfManager.writeCupState(state: state,
                onResult: { _ in promise.resolve() },
                onFail: { error in promise.reject("WRITE_ERROR", error) }
            )
        }
        AsyncFunction("setAlertsEnabled") { (enabled: Bool, promise: Promise) in
            self.nrfManager.setAlertsEnabled(enabled: enabled,
                onResult: { _ in promise.resolve() },
                onFail: { error in promise.reject("WRITE_ERROR", error) }
            )
        }
        AsyncFunction("findMy") { (promise: Promise) in
            self.nrfManager.findMy(
                onResult: { _ in promise.resolve() },
                onFail: { error in promise.reject("WRITE_ERROR", error) }
            )
        }
        AsyncFunction("readBattery") { (promise: Promise) in
            self.nrfManager.readBattery(
                onResult: { value in promise.resolve(value) },
                onFail: { error in promise.reject("READ_ERROR", error) }
            )
        }
        Function("isConnected") { () -> Bool in
            return self.nrfManager.isConnected
        }
    }
}   