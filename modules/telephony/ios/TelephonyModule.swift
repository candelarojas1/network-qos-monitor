import CoreTelephony
import ExpoModulesCore

public class TelephonyModule: Module {
  private let networkInfo = CTTelephonyNetworkInfo()

  public func definition() -> ModuleDefinition {
    Name("Telephony")

    // Devuelve la tecnologia de radio celular, la generacion y el operador.
    // iOS no expone RSSI con ninguna API publica, por eso rssi siempre es nil.
    Function("getCellularInfo") { () -> [String: Any?] in
      let serviceId = self.currentServiceId()
      let rawTech = serviceId.flatMap { self.networkInfo.serviceCurrentRadioAccessTechnology?[$0] }

      return [
        "radioTech": rawTech?.replacingOccurrences(of: "CTRadioAccessTechnology", with: ""),
        "generation": rawTech.flatMap { Self.generation(for: $0) },
        "carrier": serviceId.flatMap { self.carrierName(for: $0) },
        "rssi": nil
      ]
    }
  }

  // Con dos SIM, la que se usa para datos. Si no se sabe, la primera con radio activa.
  private func currentServiceId() -> String? {
    let techs = networkInfo.serviceCurrentRadioAccessTechnology
    if let id = networkInfo.dataServiceIdentifier, techs?[id] != nil {
      return id
    }
    return techs?.keys.sorted().first
  }

  // CTCarrier esta deprecado desde iOS 16 y devuelve "--"; en ese caso no hay dato.
  private func carrierName(for serviceId: String) -> String? {
    guard let name = networkInfo.serviceSubscriberCellularProviders?[serviceId]?.carrierName,
          !name.isEmpty, name != "--" else {
      return nil
    }
    return name
  }

  private static func generation(for tech: String) -> String? {
    switch tech {
    case CTRadioAccessTechnologyGPRS, CTRadioAccessTechnologyEdge, CTRadioAccessTechnologyCDMA1x:
      return "2G"
    case CTRadioAccessTechnologyWCDMA, CTRadioAccessTechnologyHSDPA, CTRadioAccessTechnologyHSUPA,
         CTRadioAccessTechnologyCDMAEVDORev0, CTRadioAccessTechnologyCDMAEVDORevA,
         CTRadioAccessTechnologyCDMAEVDORevB, CTRadioAccessTechnologyeHRPD:
      return "3G"
    case CTRadioAccessTechnologyLTE:
      return "4G"
    case CTRadioAccessTechnologyNRNSA, CTRadioAccessTechnologyNR:
      return "5G"
    default:
      return nil
    }
  }
}
