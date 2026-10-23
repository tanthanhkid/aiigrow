# Chụp ảnh THẬT các màn của AiiGrow trên Windows (windows-latest) — KHÔNG phải mã sản phẩm, chỉ dùng cho CI chup-man-win.yml.
# Setup: bộ cài thật, điều khiển bằng UI Automation (bấm Tiếp, gõ tài khoản, gõ mã 6 số…). Khay: AiiGrow.Chup (Chup/Program.cs) chạy TrayContext thật
# nói chuyện với dịch vụ thật; thêm khay đã cài chạy thật (bóng báo, menu chuột phải nếu tìm được biểu tượng). UTF-8 có BOM cho Windows PowerShell 5.1.
param(
  [Parameter(Mandatory = $true)][string]$SetupGoc,
  [Parameter(Mandatory = $true)][string]$SetupMoi,
  [Parameter(Mandatory = $true)][string]$ChupExe,
  [string]$Goc = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$Ra = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path 'anh')
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Utf8 = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $Utf8
New-Item -ItemType Directory -Force $Ra | Out-Null
$Ra = (Resolve-Path $Ra).Path
$LogDir = Join-Path $Ra 'log'; New-Item -ItemType Directory -Force $LogDir | Out-Null

Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public static class Nat {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
  [DllImport("user32.dll")] public static extern int ChangeDisplaySettings(ref DEVMODE dm, int flags);
  [DllImport("user32.dll")] public static extern bool EnumDisplaySettings(string dev, int mode, ref DEVMODE dm);
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public struct DEVMODE {
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
    public short dmSpecVersion, dmDriverVersion, dmSize, dmDriverExtra; public int dmFields;
    public int dmPositionX, dmPositionY, dmDisplayOrientation, dmDisplayFixedOutput;
    public short dmColor, dmDuplex, dmYResolution, dmTTOption, dmCollate;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
    public short dmLogPixels; public int dmBitsPerPel, dmPelsWidth, dmPelsHeight, dmDisplayFlags, dmDisplayFrequency;
    public int dmICMMethod, dmICMIntent, dmMediaType, dmDitherType, dmReserved1, dmReserved2, dmPanningWidth, dmPanningHeight;
  }
}
'@
[void][Nat]::SetProcessDPIAware()
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms, System.Drawing, System.Security

$KQ = New-Object System.Collections.ArrayList
$script:stt = 0
function Log($m) { Write-Host ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $m) }
function Ghi($ten, $ok, $ct) { [void]$KQ.Add([pscustomobject]@{ Ten = $ten; Ok = $ok; ChiTiet = [string]$ct }); Log ("{0} {1} — {2}" -f $(if ($ok) { 'OK ' } else { 'LỖI' }), $ten, $ct) }
function Cho([scriptblock]$dk, [int]$giay = 60, [int]$buoc = 1) {
  $het = (Get-Date).AddSeconds($giay)
  while ((Get-Date) -lt $het) { try { $r = & $dk; if ($r) { return $r } } catch { }; Start-Sleep -Seconds $buoc }
  try { return (& $dk) } catch { return $null }
}

# ---------------------------------------------------------------- độ phân giải
function DatDoPhanGiai($w, $h) {
  try {
    $dm = New-Object Nat+DEVMODE; $dm.dmSize = [int][System.Runtime.InteropServices.Marshal]::SizeOf($dm)
    if (-not [Nat]::EnumDisplaySettings($null, -1, [ref]$dm)) { Log 'không đọc được chế độ hiển thị'; return }
    Log ("màn hình hiện tại {0}x{1}" -f $dm.dmPelsWidth, $dm.dmPelsHeight)
    $dm.dmPelsWidth = $w; $dm.dmPelsHeight = $h; $dm.dmFields = 0x80000 -bor 0x100000
    $r = [Nat]::ChangeDisplaySettings([ref]$dm, 0)
    Log "ChangeDisplaySettings $w x $h → $r (0 = được)"
  } catch { Log "đặt độ phân giải lỗi: $($_.Exception.Message)" }
}
DatDoPhanGiai 1920 1080
Start-Sleep -Seconds 2
$vs = [System.Windows.Forms.SystemInformation]::VirtualScreen
Log ("VirtualScreen {0}x{1}" -f $vs.Width, $vs.Height)

# ---------------------------------------------------------------- chụp + UI Automation
function Anh($ten, $rect = $null) {
  try {
    $script:stt++
    $vs = [System.Windows.Forms.SystemInformation]::VirtualScreen
    $x = $vs.X; $y = $vs.Y; $w = $vs.Width; $h = $vs.Height
    if ($rect) {
      $x = [int][math]::Max($vs.X, $rect.X); $y = [int][math]::Max($vs.Y, $rect.Y)
      $w = [int][math]::Min($vs.Right, $rect.Right) - $x; $h = [int][math]::Min($vs.Bottom, $rect.Bottom) - $y
    }
    if ($w -lt 10 -or $h -lt 10) { Log "vùng chụp $ten quá nhỏ"; return }
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($x, $y, 0, 0, (New-Object System.Drawing.Size $w, $h))
    $g.Dispose()
    $f = Join-Path $Ra ("{0:00}-{1}.png" -f $script:stt, $ten)
    $bmp.Save($f, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
    Log "ảnh $f"
  } catch { Log "chụp $ten lỗi: $($_.Exception.Message)" }
}
$A = [System.Windows.Automation.AutomationElement]
$TSd = [System.Windows.Automation.TreeScope]::Descendants
$TSc = [System.Windows.Automation.TreeScope]::Children
function CuaSo($ten) { $A::RootElement.FindFirst($TSc, (New-Object System.Windows.Automation.PropertyCondition($A::NameProperty, $ten))) }
function TimEl($goc, $ten, $loai = $null) {
  $c = New-Object System.Windows.Automation.PropertyCondition($A::NameProperty, $ten)
  if ($loai) { $c = New-Object System.Windows.Automation.AndCondition($c, (New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, $loai))) }
  $goc.FindFirst($TSd, $c)
}
function TimTheoChu($goc, $mau) {   # phần tử có Name chứa $mau
  foreach ($e in $goc.FindAll($TSd, [System.Windows.Automation.Condition]::TrueCondition)) { try { if ($e.Current.Name -like "*$mau*") { return $e } } catch { } }
  $null
}
function CacO($goc) { $goc.FindAll($TSd, (New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit))) }
function Chuot($el, [switch]$Phai) {
  $r = $el.Current.BoundingRectangle
  [void][Nat]::SetCursorPos([int]($r.X + $r.Width / 2), [int]($r.Y + $r.Height / 2)); Start-Sleep -Milliseconds 200
  if ($Phai) { [Nat]::mouse_event(0x8, 0, 0, 0, [UIntPtr]::Zero); [Nat]::mouse_event(0x10, 0, 0, 0, [UIntPtr]::Zero) }
  else { [Nat]::mouse_event(0x2, 0, 0, 0, [UIntPtr]::Zero); [Nat]::mouse_event(0x4, 0, 0, 0, [UIntPtr]::Zero) }
}
function Bam($el) {
  if (-not $el) { throw 'không thấy phần tử để bấm' }
  $p = $null
  try { if ($el.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$p)) { $p.Invoke(); return } } catch { }
  try { if ($el.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern, [ref]$p)) { $p.Toggle(); return } } catch { }
  Chuot $el
}
function GoVao($el, $chu) {
  try { $el.SetFocus() } catch { Chuot $el }
  Start-Sleep -Milliseconds 300
  [System.Windows.Forms.SendKeys]::SendWait('^a'); Start-Sleep -Milliseconds 100
  [System.Windows.Forms.SendKeys]::SendWait($chu)
}
function Rect($w) { $r = $w.Current.BoundingRectangle; New-Object System.Drawing.Rectangle ([int]$r.X), ([int]$r.Y), ([int]$r.Width), ([int]$r.Height) }
function ChupCua($ten, $w) { Start-Sleep -Milliseconds 700; try { Anh $ten (Rect $w) } catch { Anh $ten } }
function Buoc($ten, [scriptblock]$sb) {
  Log "===== $ten ====="
  try { & $sb; Ghi $ten $true '' } catch { Ghi $ten $false $_.Exception.Message; Anh ("loi-" + ($ten -replace '[^A-Za-z0-9]', '')) }
}

# ---------------------------------------------------------------- API
$CONG_NEXT = 3310; $CONG_PROXY = 3311
$Next = "http://127.0.0.1:$CONG_NEXT"; $MayChu = "http://127.0.0.1:$CONG_PROXY"
function Api($method, $path, $body = $null, $token = $null) {
  $h = @{}; if ($token) { $h['Authorization'] = "Bearer $token" }
  $p = @{ Method = $method; Uri = "$Next$path"; Headers = $h; UseBasicParsing = $true; TimeoutSec = 180 }
  if ($null -ne $body) { $p['ContentType'] = 'application/json; charset=utf-8'; $p['Body'] = $Utf8.GetBytes((ConvertTo-Json $body -Depth 10 -Compress)) }
  $r = Invoke-WebRequest @p
  $txt = $Utf8.GetString($r.RawContentStream.ToArray())
  if ($txt) { ConvertFrom-Json $txt }
}
function Pipe($req) {
  $c = New-Object System.IO.Pipes.NamedPipeClientStream('.', 'AiiGrow.Tray', [System.IO.Pipes.PipeDirection]::InOut)
  try {
    $c.Connect(5000)
    $w = New-Object System.IO.StreamWriter($c, $Utf8, 4096, $true); $w.AutoFlush = $true
    $r = New-Object System.IO.StreamReader($c, $Utf8, $false, 4096, $true)
    $w.WriteLine((ConvertTo-Json $req -Compress -Depth 5)); ConvertFrom-Json ($r.ReadLine())
  } finally { $c.Dispose() }
}

$TienTrinh = @()
try {
  # ---------------------------------------------------------------- máy chủ thử + proxy
  $env:PGLITE_DIR = Join-Path $(if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { $env:TEMP }) 'aiigrow-pg'
  Remove-Item -Recurse -Force $env:PGLITE_DIR -ErrorAction SilentlyContinue
  $env:NEXT_TELEMETRY_DISABLED = '1'
  $TienTrinh += Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "pnpm dev > `"$LogDir\server.log`" 2>&1" -WorkingDirectory (Join-Path $Goc 'server') -WindowStyle Hidden -PassThru
  if (-not (Cho { (Invoke-WebRequest -UseBasicParsing "$Next/api/suc-khoe" -TimeoutSec 60).StatusCode -eq 200 } 300 5)) { throw 'máy chủ Next không lên' }
  $env:CONG_PROXY = "$CONG_PROXY"; $env:CONG_NEXT = "$CONG_NEXT"
  $TienTrinh += Start-Process -FilePath 'node' -ArgumentList "`"$PSScriptRoot\proxy.mjs`"" -RedirectStandardOutput "$LogDir\proxy.log" -RedirectStandardError "$LogDir\proxy.err.log" -WindowStyle Hidden -PassThru
  if (-not (Cho { (Invoke-WebRequest -UseBasicParsing "$MayChu/__e2e/manifest" -TimeoutSec 10).StatusCode -eq 200 } 60 2)) { throw 'proxy không lên' }
  foreach ($u in @('/api/m/toi', '/api/device/dong-bo', '/api/agent/ban-moi', '/api/device/hoc-vien/tong-quan', '/api/device/hoc-vien/cua-hang', '/api/device/hoc-vien/tin')) { try { Invoke-WebRequest -UseBasicParsing "$MayChu$u" -TimeoutSec 180 | Out-Null } catch { } }
  try { Invoke-WebRequest -UseBasicParsing "$MayChu/api/device/ghep" -Method Post -ContentType 'application/json' -Body '{"ma":"000000","nen":"windows","tenMay":"x"}' -TimeoutSec 180 | Out-Null } catch { }
  Log 'máy chủ thử đã lên'

  # ---------------------------------------------------------------- Ba Mẹ + Con + dữ liệu mẫu
  $sdt = '09' + (Get-Random -Minimum 10000000 -Maximum 99999999)
  $otp = Api POST '/api/m/otp' @{ dinhDanh = $sdt; mucDich = 'dang_ky' }
  $dk = Api POST '/api/m/dang-ky' @{ dinhDanh = $sdt; ma = $otp.ma; ten = 'Mẹ Lan'; matKhau = 'MatKhau-Chup-' + (Get-Random) }
  $tok = $dk.token
  $con = Api POST '/api/m/con' @{ ten = 'Bin'; namSinh = ((Get-Date).Year - 10); pin = '1234' } $tok
  $vn = (Get-Date).ToUniversalTime().AddHours(7)
  [void](Api POST "/api/m/con/$($con.id)/lich" @{ ngu = @{ tu = $vn.AddHours(11).ToString('HH:00'); den = $vn.AddHours(12).ToString('HH:00') } } $tok)
  try { [void](Api POST '/api/m/nhiem-vu/mau' @{ nhom = 'nhi' } $tok); [void](Api POST '/api/m/qua/mau' @{} $tok) } catch { Log "dữ liệu mẫu lỗi: $($_.Exception.Message)" }
  Log "Ba Mẹ + Con 'Bin' đã tạo"
} catch {
  Ghi 'Chuẩn bị' $false $_.Exception.Message
  Anh 'loi-chuan-bi'
}

# ================================================================ SETUP (bộ cài thật)
$env:AIIGROW_SERVER = $MayChu
$setupProc = $null
try {
  $maGhep = (Api POST '/api/m/ma-ghep' @{ con = $con.id; nen = 'windows' } $tok).ma
  if (-not ($maGhep -match '^\d{6}$')) { throw "mã ghép lạ: $maGhep" }
  $setupProc = Start-Process -FilePath $SetupGoc -PassThru
  $w = Cho { CuaSo 'Cài AiiGrow' } 90
  if (-not $w) { throw 'không thấy cửa sổ Cài AiiGrow' }
  Log ("cửa sổ Setup {0}" -f (Rect $w))
} catch { Ghi 'Setup mở' $false $_.Exception.Message; Anh 'loi-setup-mo'; $w = $null }

if ($w) {
  Buoc 'Setup 1 Chào' { ChupCua 'setup-1-chao' $w; Bam (TimEl $w 'Bắt đầu') }
  Buoc 'Setup 2 Điều khoản' {
    $cb = Cho { TimEl $w 'Tôi là Ba/Mẹ (hoặc người giám hộ) của Con và đồng ý cài AiiGrow lên máy này' } 20
    ChupCua 'setup-2-dieu-khoan-chua-tich' $w
    Bam $cb; Start-Sleep -Milliseconds 700
    ChupCua 'setup-2-dieu-khoan-da-tich' $w
    Bam (TimEl $w 'Tiếp')
  }
  Buoc 'Setup 3 Tài khoản của Con' {
    $t2 = Cho { TimTheoChu $w 'Máy chưa có tài khoản riêng cho Con' } 40
    if (-not $t2) { throw 'không thấy màn Tài khoản' }
    Start-Sleep -Seconds 1
    ChupCua 'setup-3-tai-khoan-mac-dinh' $w
    Chuot $t2; Start-Sleep -Seconds 1       # chọn «Máy chưa có tài khoản riêng»
    ChupCua 'setup-3-tai-khoan-tao-moi' $w
    $es = @(CacO $w)
    if ($es.Count -lt 2) { throw "chỉ thấy $($es.Count) ô nhập" }
    GoVao $es[0] 'bin con'; GoVao $es[1] 'ab'
    Bam (TimEl $w 'Tạo tài khoản'); Start-Sleep -Seconds 1
    ChupCua 'setup-3-tai-khoan-loi-ten' $w
    GoVao $es[0] 'bin'; GoVao $es[1] 'ab'
    Bam (TimEl $w 'Tạo tài khoản'); Start-Sleep -Seconds 1
    ChupCua 'setup-3-tai-khoan-loi-mat-khau' $w
    GoVao $es[1] 'MatKhau-Con-1'
    ChupCua 'setup-3-tai-khoan-da-dien' $w
    Bam (TimEl $w 'Tạo tài khoản')
  }
  Buoc 'Setup 4 Ghép máy' {
    $nut = Cho { TimEl $w 'Ghép và cài đặt' } 90
    if (-not $nut) { throw 'không thấy màn Ghép máy (tạo tài khoản lỗi?)' }
    ChupCua 'setup-4-ghep-may-trong' $w
    $e = @(CacO $w)[0]
    GoVao $e '12'; Bam $nut; Start-Sleep -Seconds 1
    ChupCua 'setup-4-ghep-may-loi-ma' $w
    GoVao $e $maGhep; Start-Sleep -Milliseconds 500
    ChupCua 'setup-4-ghep-may-da-nhap' $w
    Bam $nut
  }
  Buoc 'Setup 5 Cài đặt + Xong' {
    for ($i = 1; $i -le 4; $i++) { Start-Sleep -Seconds 2; if (TimEl $w 'Xong rồi! AiiGrow đã ở trên máy') { break }; ChupCua ("setup-5-dang-cai-$i") $w }
    $xong = Cho { TimEl $w 'Xong rồi! AiiGrow đã ở trên máy' } 240 2
    if (-not $xong) { Anh 'setup-5-khong-xong'; throw 'cài không tới màn Xong trong 240 giây' }
    ChupCua 'setup-6-xong' $w
    Bam (TimEl $w 'Để sau')
  }
  if ($setupProc -and -not $setupProc.HasExited) { [void]$setupProc.WaitForExit(15000) }
}
Get-Content (Join-Path $env:ProgramData 'AiiGrow\install.log') -ErrorAction SilentlyContinue | Out-File -Encoding utf8 (Join-Path $LogDir 'install.log')

# ================================================================ KHAY + APP (dịch vụ thật)
Buoc 'Chờ dịch vụ đồng bộ' {
  $st = Cho { $x = (Pipe @{ cmd = 'state' }).state; if ($x.paired -and $x.lastSyncAt) { $x } } 120 3
  if (-not $st) { try { [void](Pipe @{ cmd = 'sync-now' }) } catch { }; $st = Cho { $x = (Pipe @{ cmd = 'state' }).state; if ($x.paired) { $x } } 60 3 }
  if (-not $st) { throw 'dịch vụ chưa ghép/đồng bộ' }
  Log ("state: paired=$($st.paired) con=$($st.childName) mode=$($st.mode) cheDo=$($st.cheDo)")
}

Buoc 'Khay thật (AiiGrow.Tray.exe đã cài)' {
  $tray = Join-Path $env:ProgramFiles 'AiiGrow\AiiGrow.Tray.exe'
  if (-not (Test-Path $tray)) { throw 'không có AiiGrow.Tray.exe đã cài' }
  $tp = Start-Process -FilePath $tray -PassThru
  Start-Sleep -Seconds 4
  Anh 'khay-that-bong-bao-dang-bat'
  # biểu tượng khay: tìm trong thanh tác vụ / vùng tràn bằng UI Automation
  $bar = $A::RootElement.FindFirst($TSc, (New-Object System.Windows.Automation.PropertyCondition($A::ClassNameProperty, 'Shell_TrayWnd')))
  if ($bar) {
    $ten = @(); foreach ($e in $bar.FindAll($TSd, [System.Windows.Automation.Condition]::TrueCondition)) { try { $ten += ($e.Current.ControlType.ProgrammaticName + ' | ' + $e.Current.Name) } catch { } }
    $ten | Out-File -Encoding utf8 (Join-Path $LogDir 'taskbar-uia.txt')
    $ic = TimTheoChu $bar 'AiiGrow'
    if (-not $ic) {
      $chev = TimTheoChu $bar 'Notification Chevron'; if (-not $chev) { $chev = TimTheoChu $bar 'Show Hidden' }
      if ($chev) { Bam $chev; Start-Sleep -Seconds 1; Anh 'khay-that-vung-tran'
        $ov = $A::RootElement.FindFirst($TSc, (New-Object System.Windows.Automation.PropertyCondition($A::ClassNameProperty, 'NotifyIconOverflowWindow')))
        if ($ov) { $ic = TimTheoChu $ov 'AiiGrow' } }
    }
    if ($ic) {
      Chuot $ic -Phai; Start-Sleep -Seconds 1
      Anh 'khay-that-menu-chuot-phai'
      [System.Windows.Forms.SendKeys]::SendWait('{ESC}'); Start-Sleep -Milliseconds 500
      Chuot $ic; Start-Sleep -Seconds 6     # nhấn trái ⇒ mở app to
      $app = CuaSo 'AiiGrow'
      if ($app) { ChupCua 'khay-that-nhan-trai-mo-app' $app }
      [System.Windows.Forms.SendKeys]::SendWait('{ESC}')
    } else { Log 'không tìm thấy biểu tượng AiiGrow trên thanh tác vụ qua UIA' }
  }
}

Buoc 'Harness: menu, app 4 mục, màn chặn, xin giờ, nộp bài, khoá' {
  $p = Start-Process -FilePath $ChupExe -ArgumentList "`"$Ra`"", ($script:stt + 1) -PassThru
  if (-not $p.WaitForExit(420000)) { try { $p.Kill() } catch { }; throw 'Chup.exe chạy quá 7 phút' }
  $script:stt += 60   # chừa khoảng số cho ảnh harness
  Log "Chup.exe mã thoát $($p.ExitCode)"
}

# ================================================================ SETUP trên máy đã cài: cập nhật, công tắc chế độ, gỡ
function HopThoai([string]$ten, [string]$nut, [string]$anh) {
  $d = Cho { CuaSo $ten } 30
  if (-not $d) { throw "không thấy hộp thoại $ten" }
  ChupCua $anh $d
  if ($nut) { $b = TimEl $d $nut; if ($b) { Bam $b } else { [System.Windows.Forms.SendKeys]::SendWait('{ENTER}') } }
}
Buoc 'Setup cập nhật (bản mới hơn)' {
  $p = Start-Process -FilePath $SetupMoi -PassThru
  $f = Cho { CuaSo 'AiiGrow' } 60
  if (-not $f) { throw 'không thấy form cập nhật' }
  ChupCua 'setup-capnhat-co-ban-moi' $f
  $b = TimEl $f 'Để sau'; if ($b) { Bam $b }
  [void]$p.WaitForExit(20000)
}
Buoc 'Setup đã là bản mới nhất' {
  $p = Start-Process -FilePath $SetupGoc -PassThru
  $f = Cho { CuaSo 'AiiGrow' } 60
  if (-not $f) { throw 'không thấy form' }
  ChupCua 'setup-da-la-ban-moi-nhat' $f
  $b = TimEl $f 'Đóng'; if ($b) { Bam $b }
  [void]$p.WaitForExit(20000)
}
Buoc 'Công tắc chế độ Chặn thật' {
  $p = Start-Process -FilePath $SetupGoc -ArgumentList '--che-do=chan' -PassThru
  HopThoai 'AiiGrow' 'OK' 'setup-cong-tac-che-do-chan'
  [void]$p.WaitForExit(20000)
}
Buoc 'Gỡ cài đặt' {
  $p = Start-Process -FilePath (Join-Path $env:ProgramFiles 'AiiGrow\AiiGrow-Setup.exe') -ArgumentList '--uninstall' -PassThru
  HopThoai 'AiiGrow' 'Yes' 'setup-go-hoi-xac-nhan'
  Start-Sleep -Seconds 5
  $d = Cho { $x = CuaSo 'AiiGrow'; if ($x) { $x } } 120 2
  if ($d) { ChupCua 'setup-go-ket-qua' $d; $b = TimEl $d 'OK'; if ($b) { Bam $b } }
  [void]$p.WaitForExit(30000)
}

# ---------------------------------------------------------------- tổng kết
Anh 'cuoi-man-hinh'
$md = "# Chụp màn AiiGrow trên Windows`n`n| Bước | Kết quả | Chi tiết |`n|---|---|---|`n"
foreach ($k in $KQ) { $md += ("| {0} | {1} | {2} |`n" -f $k.Ten, $(if ($k.Ok) { 'OK' } else { 'LỖI' }), ($k.ChiTiet -replace '\|', '/' -replace "`r?`n", ' ')) }
[System.IO.File]::WriteAllText((Join-Path $Ra 'ket-qua.md'), $md, $Utf8)
if ($env:GITHUB_STEP_SUMMARY) { Add-Content -Path $env:GITHUB_STEP_SUMMARY -Value $md -Encoding utf8 }
foreach ($t in $TienTrinh) { try { Stop-Process -Id $t.Id -Force -ErrorAction SilentlyContinue } catch { } }
exit 0
