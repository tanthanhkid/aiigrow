// Token thiết bị trong Keychain (chỉ app đọc; extension không gọi mạng nên không cần).
import Foundation
import Security

public enum KhoBiMat {
  static let dichVu = "vn.aiilab.aiigrow.con", tai = "token-may"

  static var hoi: [String: Any] {
    [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: dichVu, kSecAttrAccount as String: tai]
  }

  public static func doc() -> String? {
    var q = hoi
    q[kSecReturnData as String] = true
    q[kSecMatchLimit as String] = kSecMatchLimitOne
    var kq: AnyObject?
    guard SecItemCopyMatching(q as CFDictionary, &kq) == errSecSuccess, let d = kq as? Data else { return nil }
    return String(data: d, encoding: .utf8)
  }

  public static func ghi(_ token: String?) {
    SecItemDelete(hoi as CFDictionary)
    guard let token else { return }
    var q = hoi
    q[kSecValueData as String] = Data(token.utf8)
    q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    SecItemAdd(q as CFDictionary, nil)
  }
}
