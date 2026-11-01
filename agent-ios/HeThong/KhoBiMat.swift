// Token thiết bị + bí mật mã mở offline trong Keychain (chỉ app đọc; extension không gọi mạng, không kiểm mã nên không cần).
import Foundation
import Security

public enum KhoBiMat {
  static let dichVu = "vn.aiilab.aiigrow.con", tai = "token-may"

  static let taiOffline = "bi-mat-offline"

  static func hoi(_ tk: String = tai) -> [String: Any] {
    [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: dichVu, kSecAttrAccount as String: tk]
  }

  public static func doc() -> String? { doc(tai) }
  public static func ghi(_ token: String?) {
    ghi(token, tai)
    if token == nil { ghi(nil, taiOffline) }      // rời gia đình ⇒ quên luôn bí mật mã offline
  }
  public static func docBiMatOffline() -> String? { doc(taiOffline) }
  public static func ghiBiMatOffline(_ s: String) { if doc(taiOffline) != s { ghi(s, taiOffline) } }

  static func doc(_ tk: String) -> String? {
    var q = hoi(tk)
    q[kSecReturnData as String] = true
    q[kSecMatchLimit as String] = kSecMatchLimitOne
    var kq: AnyObject?
    guard SecItemCopyMatching(q as CFDictionary, &kq) == errSecSuccess, let d = kq as? Data else { return nil }
    return String(data: d, encoding: .utf8)
  }

  static func ghi(_ token: String?, _ tk: String) {
    SecItemDelete(hoi(tk) as CFDictionary)
    guard let token else { return }
    var q = hoi(tk)
    q[kSecValueData as String] = Data(token.utf8)
    q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    SecItemAdd(q as CFDictionary, nil)
  }
}
