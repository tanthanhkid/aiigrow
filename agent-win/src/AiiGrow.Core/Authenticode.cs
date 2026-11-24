using System.Runtime.InteropServices;
using System.Security.Cryptography.X509Certificates;

namespace AiiGrow.Core;

/// <summary>WinVerifyTrust + đọc chứng chỉ người ký — dùng chung cho lọc trình duyệt (<see cref="KiemKyTrinhDuyet"/>) và bộ cài tự cập nhật (<see cref="KyBoCai"/>).</summary>
public static class Authenticode
{
    /// <summary>CERT_E_REVOCATION_FAILURE — không kiểm được thu hồi (thường do không tới được máy chủ CRL/OCSP).</summary>
    public const int LoiThuHoi = unchecked((int)0x800B010E);
    /// <summary>CRYPT_E_REVOCATION_OFFLINE — máy chủ thu hồi không trả lời.</summary>
    public const int LoiThuHoiNgoaiMang = unchecked((int)0x80092013);
    /// <summary>Mã riêng: không gọi được WinVerifyTrust (không phải Windows / ngoại lệ interop).</summary>
    public const int LoiGoi = -1;

    /// <summary>
    /// Mã WinVerifyTrust (0 = chữ ký hợp lệ, chuỗi tới gốc tin cậy).
    /// <paramref name="coMang"/> = false: không kiểm thu hồi, chỉ dùng bộ nhớ đệm URL (vòng đóng app 5 giây/lần không chờ mạng).
    /// <paramref name="coMang"/> = true: cho tải gốc/chứng chỉ trung gian, kiểm thu hồi cả chuỗi trừ gốc (bộ cài tự cập nhật).
    /// </summary>
    public static int MaWinTrust(string path, bool coMang)
    {
        if (!OperatingSystem.IsWindows()) return LoiGoi;
        var fi = new WinTrustFileInfo { cbStruct = (uint)Marshal.SizeOf<WinTrustFileInfo>(), pcwszFilePath = path };
        var pFi = Marshal.AllocHGlobal(Marshal.SizeOf<WinTrustFileInfo>());
        try
        {
            Marshal.StructureToPtr(fi, pFi, false);
            var d = new WinTrustData
            {
                cbStruct = (uint)Marshal.SizeOf<WinTrustData>(), dwUIChoice = 2 /* WTD_UI_NONE */,
                fdwRevocationChecks = coMang ? 1u /* WTD_REVOKE_WHOLECHAIN */ : 0u /* WTD_REVOKE_NONE */,
                dwUnionChoice = 1 /* WTD_CHOICE_FILE */, pFile = pFi, dwStateAction = 0,
                dwProvFlags = coMang ? 0x80u /* WTD_REVOCATION_CHECK_CHAIN_EXCLUDE_ROOT */ : 0x1000u /* WTD_CACHE_ONLY_URL_RETRIEVAL */,
            };
            return WinVerifyTrust(new IntPtr(-1) /* INVALID_HANDLE_VALUE: không UI */, GenericVerifyV2, ref d);
        }
        catch { return LoiGoi; }
        finally { Marshal.DestroyStructure<WinTrustFileInfo>(pFi); Marshal.FreeHGlobal(pFi); }
    }

    /// <summary>Chứng chỉ người ký Authenticode (chữ ký chính) của tệp — KHÔNG kiểm tin cậy; không có chữ ký ⇒ null.</summary>
    public static X509Certificate2? ChungChiNguoiKy(string path)
    {
#pragma warning disable SYSLIB0057
        try { using var c = X509Certificate.CreateFromSignedFile(path); return new X509Certificate2(c); }
        catch { return null; }
#pragma warning restore SYSLIB0057
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct WinTrustFileInfo
    {
        public uint cbStruct; [MarshalAs(UnmanagedType.LPWStr)] public string pcwszFilePath; public IntPtr hFile; public IntPtr pgKnownSubject;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct WinTrustData
    {
        public uint cbStruct; public IntPtr pPolicyCallbackData; public IntPtr pSIPClientData; public uint dwUIChoice; public uint fdwRevocationChecks;
        public uint dwUnionChoice; public IntPtr pFile; public uint dwStateAction; public IntPtr hWVTStateData; public IntPtr pwszURLReference;
        public uint dwProvFlags; public uint dwUIContext; public IntPtr pSignatureSettings;
    }

    [DllImport("wintrust.dll", CharSet = CharSet.Unicode)]
    private static extern int WinVerifyTrust(IntPtr hwnd, [MarshalAs(UnmanagedType.LPStruct)] Guid action, ref WinTrustData data);

    private static readonly Guid GenericVerifyV2 = new("00AAC56B-CD44-11d0-8CC2-00C04FC295EE");
}
