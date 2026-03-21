import ExpoModulesCore

public class BleWrapperModule: Module {
  private let nrfManager = NrfBleManager()

  public func definition() -> ModuleDefinition {
    Name("BleWrapper")

    Events(
      "onTemperatureData",
      "onBatteryLevel",
      "onCupStateChanged",
      "onDeviceConnected",
      "onDeviceDisconnected"
    )

    OnCreate {
      nrfManager.onTemperatureData = { [weak self] temp in
        self?.sendEvent("onTemperatureData", ["temperature": temp])
      }
      nrfManager.onBatteryLevel = { [weak self] level in
        self?.sendEvent("onBatteryLevel", ["level": level])
      }
      nrfManager.onCupStateChanged = { [weak self] state in
        self?.sendEvent("onCupStateChanged", ["state": state])
      }
      nrfManager.onDeviceConnected = { [weak self] in
        self?.sendEvent("onDeviceConnected", ["connected": true])
      }
      nrfManager.onDeviceDisconnected = { [weak self] in
        self?.sendEvent("onDeviceDisconnected", ["connected": false])
      }
    }

    AsyncFunction("connectToXiao") { (promise: Promise) in
      nrfManager.connectToXiao(
        onResult: { success in
          if success { promise.resolve() } else { promise.reject("CONNECT_ERROR", "Connection failed") }
        },
        onFail: { error in promise.reject("CONNECT_ERROR", error) }
      )
    }

    AsyncFunction("disconnect") {
      nrfManager.disconnect()
    }

    AsyncFunction("syncTime") { (promise: Promise) in
      nrfManager.syncTime(
        onResult: { _ in promise.resolve() },
        onFail: { error in promise.reject("WRITE_ERROR", error) }
      )
    }

    AsyncFunction("setAlarmInterval") { (seconds: Int, promise: Promise) in
      nrfManager.setAlarmInterval(seconds: seconds,
        onResult: { _ in promise.resolve() },
        onFail: { error in promise.reject("WRITE_ERROR", error) }
      )
    }

    AsyncFunction("setAlarmMorning") { (hour: Int, second: Int, promise: Promise) in
      nrfManager.setAlarmMorning(hour: hour, second: second,
        onResult: { _ in promise.resolve() },
        onFail: { error in promise.reject("WRITE_ERROR", error) }
      )
    }

    AsyncFunction("setAlarmEvening") { (hour: Int, second: Int, promise: Promise) in
      nrfManager.setAlarmEvening(hour: hour, second: second,
        onResult: { _ in promise.resolve() },
        onFail: { error in promise.reject("WRITE_ERROR", error) }
      )
    }

    AsyncFunction("readCupState") { (promise: Promise) in
      nrfManager.readCupState(
        onResult: { value in promise.resolve(value) },
        onFail: { error in promise.reject("READ_ERROR", error) }
      )
    }

    AsyncFunction("writeCupState") { (state: Int, promise: Promise) in
      nrfManager.writeCupState(state: state,
        onResult: { _ in promise.resolve() },
        onFail: { error in promise.reject("WRITE_ERROR", error) }
      )
    }

    AsyncFunction("setAlertsEnabled") { (enabled: Bool, promise: Promise) in
      nrfManager.setAlertsEnabled(enabled: enabled,
        onResult: { _ in promise.resolve() },
        onFail: { error in promise.reject("WRITE_ERROR", error) }
      )
    }

    AsyncFunction("findMy") { (promise: Promise) in
      nrfManager.findMy(
        onResult: { _ in promise.resolve() },
        onFail: { error in promise.reject("WRITE_ERROR", error) }
      )
    }

    AsyncFunction("readBattery") { (promise: Promise) in
      nrfManager.readBattery(
        onResult: { value in promise.resolve(value) },
        onFail: { error in promise.reject("READ_ERROR", error) }
      )
    }

    Function("isConnected") { () -> Bool in
      return nrfManager.isConnected
    }
  }
}
