# E2E agent Windows AiiGrow trên máy Windows thật (GitHub Actions windows-latest, quyền admin).
# KHÔNG phải mã sản phẩm: chỉ điều khiển bộ cài / dịch vụ / API như Ba Mẹ và quản trị viên sẽ làm, rồi kiểm kết quả.
# Chạy bằng Windows PowerShell 5.1 (AppLocker, DPAPI có sẵn). Tệp lưu UTF-8 có BOM để 5.1 đọc đúng tiếng Việt.
# Mỗi kiểm tra in PASS / FAIL / BỎ; cuối cùng ghi bảng vào $env:GITHUB_STEP_SUMMARY và e2e-logs\ket-qua.md. Có FAIL ⇒ exit 1.
# Xem agent-win/e2e/README.md (giới hạn của runner, vì sao một số kiểm tra BỎ).
param(
  [Parameter(Mandatory = $true)][string]$SetupGoc,     # bộ cài bản đang phát (Directory.Build.props)
  [Parameter(Mandatory = $true)][string]$SetupMoi1,    # bộ cài bản cao hơn — cập nhật đè bằng tay
  [Parameter(Mandatory = $true)][string]$SetupMoi2,    # bộ cài bản cao hơn nữa — giả lỗi + tự cập nhật qua ban-moi
  [Parameter(Mandatory = $true)][string]$BanGoc,
  [string]$BanMoi1 = '9.9.8',
  [string]$BanMoi2 = '9.9.9',
  [string]$Goc = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [string]$ThuMucLog = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path 'e2e-logs'),
  [switch]$KhongChayServer
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Utf8 = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $Utf8
New-Item -ItemType Directory -Force $ThuMucLog | Out-Null
$ThuMucLog = (Resolve-Path $ThuMucLog).Path

$CONG_NEXT = 3310; $CONG_PROXY = 3311; $CONG_TEP = 3443
$Next = "http://127.0.0.1:$CONG_NEXT"
$MayChu = "http://127.0.0.1:$CONG_PROXY"   # agent nói chuyện qua proxy (đè manifest ban-moi)
$Svc = 'AiiGrowService'
$DataDir = Join-Path $env:ProgramData 'AiiGrow'
$InstallDir = Join-Path $env:ProgramFiles 'AiiGrow'
$TenCon = 'aiicon'
$TenMienChan = 'chan-thu-e2e.vn'
$WebQuanTri = 'quan-tri-gia.example.com'
$KQ = New-Object System.Collections.ArrayList
$TienTrinh = @()
$Chung = @{}   # trạng thái chung giữa các kịch bản

# ------------------------------------------------------------------ tiện ích
function Log($m) { Write-Host ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $m) }
function Ghi($ma, $ten, $ketQua, $chiTiet) {
  [void]$KQ.Add([pscustomobject]@{ Ma = $ma; Ten = $ten; KetQua = $ketQua; ChiTiet = [string]$chiTiet })
  $mau = 'Yellow'; if ($ketQua -eq 'PASS') { $mau = 'Green' } elseif ($ketQua -eq 'FAIL') { $mau = 'Red' }
  Write-Host ("{0,-4} {1} {2} — {3}" -f $ketQua, $ma, $ten, $chiTiet) -ForegroundColor $mau
  if ($ketQua -eq 'FAIL' -and $env:GITHUB_ACTIONS) { Write-Host ("::error title=E2E {0}::{1} — {2}" -f $ma, $ten, ($chiTiet -replace "`r?`n", ' ')) }
}
function Dat($ma, $ten, $dk, $chiTiet) { if ([bool]$dk) { Ghi $ma $ten 'PASS' $chiTiet } else { Ghi $ma $ten 'FAIL' $chiTiet } }
function Bo($ma, $ten, $lyDo) { Ghi $ma $ten 'BỎ' $lyDo }

function Cho([scriptblock]$dk, [int]$giay = 180, [int]$buoc = 5) {
  $het = (Get-Date).AddSeconds($giay)
  while ((Get-Date) -lt $het) {
    try { $r = & $dk; if ($r) { return $r } } catch { }
    Start-Sleep -Seconds $buoc
  }
  try { return (& $dk) } catch { return $null }
}

function KichBan($ma, $ten, [scriptblock]$sb) {
  Log "===== $ma · $ten ====="
  try { & $sb }
  catch { Ghi $ma $ten 'FAIL' ("harness gặp ngoại lệ: " + $_.Exception.Message + " (" + $_.InvocationInfo.ScriptLineNumber + ")") }
}

function Bam($s) {
  $h = [System.Security.Cryptography.SHA256]::Create().ComputeHash($Utf8.GetBytes([string]$s))
  -join ($h | ForEach-Object { $_.ToString('x2') })
}

function Api($method, $path, $body = $null, $token = $null, $base = $Next) {
  $h = @{}
  if ($token) { $h['Authorization'] = "Bearer $token" }
  $p = @{ Method = $method; Uri = "$base$path"; Headers = $h; UseBasicParsing = $true; TimeoutSec = 180 }
  if ($null -ne $body) { $p['ContentType'] = 'application/json; charset=utf-8'; $p['Body'] = $Utf8.GetBytes((ConvertTo-Json $body -Depth 10 -Compress)) }
  try { $r = Invoke-WebRequest @p }
  catch {
    $resp = $_.Exception.Response; $txt = ''; $ma = 0
    if ($resp) {
      $ma = [int]$resp.StatusCode
      try { $sr = New-Object System.IO.StreamReader($resp.GetResponseStream(), $Utf8); $txt = $sr.ReadToEnd() } catch { }
    }
    throw ("API {0} {1} lỗi {2}: {3} {4}" -f $method, $path, $ma, $txt, $_.Exception.Message)
  }
  $txt = $Utf8.GetString($r.RawContentStream.ToArray())
  if ($txt) { return (ConvertFrom-Json $txt) }
}

function Pipe($req, [int]$cho = 5000) {
  $c = New-Object System.IO.Pipes.NamedPipeClientStream('.', 'AiiGrow.Tray', [System.IO.Pipes.PipeDirection]::InOut)
  try {
    $c.Connect($cho)
    $w = New-Object System.IO.StreamWriter($c, $Utf8, 4096, $true); $w.AutoFlush = $true
    $r = New-Object System.IO.StreamReader($c, $Utf8, $false, 4096, $true)
    $w.WriteLine((ConvertTo-Json $req -Compress -Depth 5))
    $line = $r.ReadLine()
    if (-not $line) { throw 'dịch vụ không trả lời qua pipe' }
    return (ConvertFrom-Json $line)
  } finally { $c.Dispose() }
}
function TrangThai { (Pipe @{ cmd = 'state' }).state }
function DongBoNgay { try { [void](Pipe @{ cmd = 'sync-now' }) } catch { Log "sync-now lỗi: $($_.Exception.Message)" } }

Add-Type -AssemblyName System.Security
$Entropy = [System.Text.Encoding]::UTF8.GetBytes('AiiGrow.config.v1')
$TepConfig = Join-Path $DataDir 'config.json'
function DocConfigJson {
  $b = [System.IO.File]::ReadAllBytes($TepConfig)
  $Utf8.GetString([System.Security.Cryptography.ProtectedData]::Unprotect($b, $Entropy, [System.Security.Cryptography.DataProtectionScope]::LocalMachine))
}
function DocConfig { ConvertFrom-Json (DocConfigJson) }
function GhiConfigJson($json) {
  $enc = [System.Security.Cryptography.ProtectedData]::Protect($Utf8.GetBytes($json), $Entropy, [System.Security.Cryptography.DataProtectionScope]::LocalMachine)
  [System.IO.File]::WriteAllBytes($TepConfig, $enc)
}

function AppLocker([switch]$Effective) {
  if ($Effective) { [xml](Get-AppLockerPolicy -Effective -Xml) } else { [xml](Get-AppLockerPolicy -Local -Xml) }
}
function LuatAiiGrow($xml, $sid = $null) {
  @($xml.SelectNodes("//*[starts-with(@Name,'AiiGrow: ')]") | Where-Object { -not $sid -or $_.UserOrGroupSid -eq $sid })
}
function LuatQuanTri($xml) { @($xml.SelectNodes("//*[starts-with(@Name,'QuanTri E2E')]")) }

$KhoaWeb = [ordered]@{ Chrome = 'HKLM:\SOFTWARE\Policies\Google\Chrome'; Edge = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' }
function GiaTriDs($khoa, $ds) {
  $k = "$khoa\$ds"
  if (-not (Test-Path $k)) { return @() }
  $it = Get-Item $k
  @($it.GetValueNames() | ForEach-Object { [pscustomobject]@{ Ten = $_; GiaTri = [string]$it.GetValue($_) } })
}
function MucAiiGrow($khoa, $ds) { @(GiaTriDs $khoa $ds | Where-Object { ($_.Ten -as [int]) -gt 90000 }) }

function BanTep($f) {
  if (-not (Test-Path $f)) { return $null }
  $v = (Get-Item $f).VersionInfo.ProductVersion
  if ($v) { return ($v -split '[+ ]')[0] }
}
function BanDichVu { BanTep (Join-Path $InstallDir 'AiiGrow.Service.exe') }
function DichVu { Get-Service -Name $Svc -ErrorAction SilentlyContinue }
function DangChay { $s = DichVu; return ($s -and $s.Status -eq 'Running') }
function Recovery {
  $o = (& sc.exe qfailure $Svc 2>&1) -join "`n"; $f = (& sc.exe qfailureflag $Svc 2>&1) -join "`n"
  [pscustomobject]@{ Ok = (($o -match 'RESTART') -and ($f -match 'TRUE')); Text = ($o + "`n" + $f) }
}

function ChaySetup($exe, [string[]]$thamSo, [int]$giay = 900) {
  $an = ($thamSo | ForEach-Object { if ($_ -like '--enroll=*') { '--enroll=***' } else { $_ } }) -join ' '
  Log ("chạy {0} {1}" -f $exe, $an)
  $t = Get-Date
  $p = Start-Process -FilePath $exe -ArgumentList $thamSo -PassThru
  $null = $p.Handle   # giữ handle để đọc được ExitCode
  if (-not $p.WaitForExit($giay * 1000)) { try { $p.Kill() } catch { }; throw "bộ cài chạy quá $giay giây" }
  Log ("  → mã thoát {0} sau {1:N0} giây" -f $p.ExitCode, ((Get-Date) - $t).TotalSeconds)
  return $p.ExitCode
}

function DuoiLog($n = 15) {
  $f = Join-Path $DataDir 'install.log'
  if (Test-Path $f) { (Get-Content $f -Encoding UTF8 -Tail $n) -join ' | ' } else { '(không có install.log)' }
}

function ChepLog($nhan) {
  $dich = Join-Path $ThuMucLog "programdata-$nhan"
  New-Item -ItemType Directory -Force $dich | Out-Null
  if (Test-Path $DataDir) { Get-ChildItem $DataDir -Filter *.log -ErrorAction SilentlyContinue | Copy-Item -Destination $dich -Force -ErrorAction SilentlyContinue }
  try { (Get-AppLockerPolicy -Local -Xml) | Out-File -Encoding utf8 (Join-Path $dich 'applocker-local.xml') } catch { }
  try { Get-WinEvent -LogName 'Microsoft-Windows-AppLocker/EXE and DLL' -MaxEvents 200 -ErrorAction Stop | Format-List TimeCreated, Id, Message | Out-File -Encoding utf8 (Join-Path $dich 'applocker-events.txt') } catch { }
  try { Get-WinEvent -FilterHashtable @{ LogName = 'System'; ProviderName = 'Service Control Manager' } -MaxEvents 100 -ErrorAction Stop | Format-List TimeCreated, Id, Message | Out-File -Encoding utf8 (Join-Path $dich 'scm-events.txt') } catch { }
}

function MayCuaToi {
  $ds = @((Api GET '/api/m/tuan-thu' $null $Chung.TokenBaMe).ds)
  @($ds | Where-Object { $_.nen -eq 'windows' })
}

Add-Type -Namespace E2E -Name Wts -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint WTSGetActiveConsoleSessionId();'

# ------------------------------------------------------------------ chuẩn bị: máy chủ, proxy, chứng chỉ, luật «quản trị» giả
try {
  Log "Máy: $env:COMPUTERNAME · $((Get-CimInstance Win32_OperatingSystem).Caption) · phiên tiến trình $([System.Diagnostics.Process]::GetCurrentProcess().SessionId) · phiên console $([E2E.Wts]::WTSGetActiveConsoleSessionId()) · người chạy $env:USERNAME"

  if (-not $KhongChayServer) {
    $env:PGLITE_DIR = Join-Path $env:RUNNER_TEMP 'aiigrow-pg'
    if (-not $env:RUNNER_TEMP) { $env:PGLITE_DIR = Join-Path $env:TEMP 'aiigrow-pg' }
    Remove-Item -Recurse -Force $env:PGLITE_DIR -ErrorAction SilentlyContinue
    $env:NEXT_TELEMETRY_DISABLED = '1'
    $TienTrinh += Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "pnpm dev > `"$ThuMucLog\server.log`" 2>&1" -WorkingDirectory (Join-Path $Goc 'server') -WindowStyle Hidden -PassThru
  }
  $ok = Cho { (Invoke-WebRequest -UseBasicParsing "$Next/api/suc-khoe" -TimeoutSec 60).StatusCode -eq 200 } 300 5
  if (-not $ok) { throw "máy chủ Next không lên ở $Next sau 300 giây" }
  Log "máy chủ Next đã lên"

  # chứng chỉ tự ký cho https://127.0.0.1 (tệp bộ cài bản mới) — tin cậy ở LocalMachine\Root (dịch vụ chạy SYSTEM dùng SChannel)
  $ThuMucTep = Join-Path $ThuMucLog '..\e2e-tep'
  New-Item -ItemType Directory -Force $ThuMucTep | Out-Null
  $ThuMucTep = (Resolve-Path $ThuMucTep).Path
  $cert = New-SelfSignedCertificate -Subject 'CN=127.0.0.1' -TextExtension @('2.5.29.17={text}IPAddress=127.0.0.1&DNS=localhost') -CertStoreLocation 'Cert:\LocalMachine\My' -NotAfter (Get-Date).AddDays(2)
  $mk = 'e2e-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
  $pfx = Join-Path $ThuMucTep 'e2e.pfx'
  Export-PfxCertificate -Cert $cert -FilePath $pfx -Password (ConvertTo-SecureString $mk -AsPlainText -Force) | Out-Null
  Export-Certificate -Cert $cert -FilePath (Join-Path $ThuMucTep 'e2e.cer') | Out-Null
  Import-Certificate -FilePath (Join-Path $ThuMucTep 'e2e.cer') -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null
  $Chung.TenTepMoi2 = "AiiGrow-Setup-$BanMoi2.exe"
  Copy-Item $SetupMoi2 (Join-Path $ThuMucTep $Chung.TenTepMoi2) -Force
  $Chung.ShaMoi2 = (Get-FileHash (Join-Path $ThuMucTep $Chung.TenTepMoi2) -Algorithm SHA256).Hash.ToLowerInvariant()

  $env:CONG_PROXY = "$CONG_PROXY"; $env:CONG_NEXT = "$CONG_NEXT"; $env:CONG_TEP = "$CONG_TEP"
  $env:PFX = $pfx; $env:PFX_MK = $mk; $env:THU_MUC_TEP = $ThuMucTep
  $TienTrinh += Start-Process -FilePath 'node' -ArgumentList "`"$PSScriptRoot\proxy.mjs`"" -RedirectStandardOutput "$ThuMucLog\proxy.log" -RedirectStandardError "$ThuMucLog\proxy.err.log" -WindowStyle Hidden -PassThru
  if (-not (Cho { (Invoke-WebRequest -UseBasicParsing "$MayChu/__e2e/manifest" -TimeoutSec 10).StatusCode -eq 200 } 60 2)) { throw 'proxy không lên' }
  if (-not (Cho { (Invoke-WebRequest -UseBasicParsing "https://127.0.0.1:$CONG_TEP/$($Chung.TenTepMoi2)" -Method Head -TimeoutSec 30).StatusCode -eq 200 } 60 2)) { Log 'CẢNH BÁO: https tệp chưa trả 200 (tự cập nhật sẽ lỗi)' }

  # hâm nóng các đường (next dev biên dịch lần đầu chậm — agent chỉ chờ 20 giây mỗi request)
  foreach ($u in @('/api/m/toi', '/api/device/dong-bo', '/api/agent/ban-moi')) { try { Invoke-WebRequest -UseBasicParsing "$MayChu$u" -TimeoutSec 180 | Out-Null } catch { } }
  try { Invoke-WebRequest -UseBasicParsing "$MayChu/api/device/ghep-goi" -Method Post -ContentType 'application/json' -Body '{"token":"khong-co","nen":"windows","tenMay":"x"}' -TimeoutSec 180 | Out-Null } catch { }

  # Luật AppLocker của «quản trị» (giả) đặt TRƯỚC khi cài: AiiGrow không được xoá. AuditOnly + Allow Everyone ⇒ vô hại cho runner.
  $guid = [guid]::NewGuid().ToString()
  $xmlQt = @"
<AppLockerPolicy Version="1"><RuleCollection Type="Exe" EnforcementMode="AuditOnly"><FilePathRule Id="$guid" Name="QuanTri E2E: cho phép mọi người" Description="Luật quản trị giả của e2e — AiiGrow phải giữ nguyên" UserOrGroupSid="S-1-1-0" Action="Allow"><Conditions><FilePathCondition Path="*" /></Conditions></FilePathRule></RuleCollection></AppLockerPolicy>
"@
  $tepQt = Join-Path $ThuMucTep 'quan-tri.xml'
  [System.IO.File]::WriteAllText($tepQt, $xmlQt, $Utf8)
  Set-AppLockerPolicy -XmlPolicy $tepQt
  # Chính sách web của «IT» (giả): mục tên «1» trong URLBlocklist — AiiGrow chỉ được đụng mục ≥ 90001
  foreach ($k in $KhoaWeb.Values) { New-Item -Path "$k\URLBlocklist" -Force | Out-Null; New-ItemProperty -Path "$k\URLBlocklist" -Name '1' -Value $WebQuanTri -PropertyType String -Force | Out-Null }
  Log ("luật quản trị giả: AppLocker {0} luật, web «1»={1}" -f @(LuatQuanTri (AppLocker)).Count, $WebQuanTri)
} catch {
  Ghi 'KB0' 'Chuẩn bị môi trường thử' 'FAIL' $_.Exception.Message
}

# ------------------------------------------------------------------ KB1 — Ba Mẹ, Con, tài khoản Windows, gói cài
KichBan 'KB1' 'Đăng ký Ba Mẹ, tạo Con, gói cài một chạm' {
  $sdt = '09' + (Get-Random -Minimum 10000000 -Maximum 99999999)
  $otp = Api POST '/api/m/otp' @{ dinhDanh = $sdt; mucDich = 'dang_ky' }
  Dat '1.1' 'OTP chế độ thử trả mã' ($otp.ma -match '^\d{6}$') "gửi đến $($otp.guiDen)"
  $dk = Api POST '/api/m/dang-ky' @{ dinhDanh = $sdt; ma = $otp.ma; ten = 'Ba E2E'; matKhau = 'MatKhau-E2e-' + (Get-Random) }
  $Chung.TokenBaMe = $dk.token
  Dat '1.2' 'Đăng ký Ba Mẹ → token phiên' ([bool]$dk.token) 'có token'
  $con = Api POST '/api/m/con' @{ ten = 'Con E2E'; namSinh = ((Get-Date).Year - 10); pin = '1234' } $Chung.TokenBaMe
  $Chung.ConId = $con.id
  Dat '1.3' 'Tạo Con' ([bool]$con.id) "con $($con.id)"
  # Bộ cài một chạm KHÔNG hỏi tài khoản Windows (Installer.RunOneTouchAsync); tạo sẵn tài khoản thường của Con để dùng ở KB4.
  $mkCon = ConvertTo-SecureString ('Aa1!' + [guid]::NewGuid().ToString('N')) -AsPlainText -Force
  if (-not (Get-LocalUser -Name $TenCon -ErrorAction SilentlyContinue)) { New-LocalUser -Name $TenCon -Password $mkCon -FullName 'Con E2E' -Description 'Tài khoản thử của e2e AiiGrow' | Out-Null }
  Add-LocalGroupMember -SID 'S-1-5-32-545' -Member $TenCon -ErrorAction SilentlyContinue
  $Chung.SidCon = (Get-LocalUser -Name $TenCon).SID.Value
  $laAdmin = [bool](Get-LocalGroupMember -SID 'S-1-5-32-544' | Where-Object { $_.SID.Value -eq $Chung.SidCon })
  Dat '1.4' 'Tài khoản Windows thường của Con' ($Chung.SidCon -and -not $laAdmin) "$TenCon $($Chung.SidCon)"
  $goi = Api POST '/api/m/goi-cai' @{ con = $Chung.ConId; nen = 'windows' } $Chung.TokenBaMe
  if ($env:GITHUB_ACTIONS) { Write-Host "::add-mask::$($goi.token)" }
  $json = '{"server":"' + $MayChu + '","token":"' + $goi.token + '"}'
  $Chung.Enroll = [Convert]::ToBase64String($Utf8.GetBytes($json)).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  if ($env:GITHUB_ACTIONS) { Write-Host "::add-mask::$($Chung.Enroll)" }
  Dat '1.5' 'Gói cài một chạm (goi-cai)' ([bool]$goi.token -and $goi.het) "hết hạn $($goi.het); lệnh im lặng máy chủ gợi ý: $($goi.cai.chiTiet.lenhIm -replace [regex]::Escape($goi.token), '***')"
}

# ------------------------------------------------------------------ KB2 — cài im lặng
KichBan 'KB2' 'Cài im lặng một chạm' {
  if (-not $Chung.Enroll) { Bo 'KB2' 'Cài im lặng' 'KB1 không tạo được gói cài'; return }
  $ma = ChaySetup $SetupGoc @('--silent', "--enroll=$($Chung.Enroll)")
  Dat '2.1' 'Mã thoát bộ cài = 0' ($ma -eq 0) "mã $ma · install.log: $(DuoiLog 6)"
  $s = Cho { $x = DichVu; if ($x -and $x.Status -eq 'Running') { $x } } 60 3
  Dat '2.2' 'Dịch vụ AiiGrowService Running' ([bool]$s) "trạng thái $((DichVu).Status)"
  $st = (Get-CimInstance Win32_Service -Filter "Name='$Svc'")
  Dat '2.3' 'StartType Automatic, chạy LocalSystem' ($st.StartMode -eq 'Auto' -and $st.StartName -eq 'LocalSystem') "StartMode=$($st.StartMode) StartName=$($st.StartName) Path=$($st.PathName)"
  $rc = Recovery
  Dat '2.4' 'Recovery (sc qfailure) bật restart + failureflag' $rc.Ok ($rc.Text -replace "`n", ' ' -replace '\s+', ' ')
  $tep = @('AiiGrow.Service.exe', 'AiiGrow.Tray.exe', 'AiiGrow.Setup.exe') | ForEach-Object { Join-Path $InstallDir $_ }
  $thieu = @($tep | Where-Object { -not (Test-Path $_) })
  Dat '2.5' 'Tệp cài ở Program Files\AiiGrow' ($thieu.Count -eq 0) ("bản dịch vụ {0}; thiếu: {1}" -f (BanDichVu), ($thieu -join ', '))
  Dat '2.6' 'Bản dịch vụ = bản build' ((BanDichVu) -eq $BanGoc) "ProductVersion $(BanDichVu), mong $BanGoc"
  $cfg = DocConfig
  $Chung.TokenHash = Bam $cfg.token; $Chung.DeviceId = $cfg.deviceId
  Dat '2.7' 'Config ProgramData mã DPAPI có token máy' ($cfg.token.Length -ge 16 -and $cfg.server -eq $MayChu -and $cfg.deviceId) ("token {0} ký tự (sha256 {1}…), deviceId {2}, server {3}, cheDo {4}" -f $cfg.token.Length, $Chung.TokenHash.Substring(0, 8), $cfg.deviceId, $cfg.server, $cfg.cheDo)
  $acl = (Get-Acl $DataDir).Access | ForEach-Object { $_.IdentityReference.Value }
  Dat '2.8' 'Thư mục dữ liệu chỉ SYSTEM + Administrators' (-not ($acl | Where-Object { $_ -notmatch 'SYSTEM|Administrators' })) ($acl -join ', ')
  $app = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AiiGrow' -ErrorAction SilentlyContinue
  Dat '2.9' 'Mục Ứng dụng (Uninstall\AiiGrow)' ($app -and $app.DisplayVersion -eq $BanGoc) "DisplayVersion $($app.DisplayVersion) · UninstallString $($app.UninstallString)"
  $Chung.CfgChildSidLucCai = $cfg.childSid
}

# ------------------------------------------------------------------ KB3 — máy xuất hiện ở app Ba Mẹ
KichBan 'KB3' 'Máy hiện ở app Ba Mẹ, đồng bộ lần đầu ≤ 3 phút' {
  if (-not $Chung.TokenBaMe) { Bo 'KB3' 'Máy hiện ở app Ba Mẹ' 'chưa có Ba Mẹ'; return }
  $t = Get-Date
  $may = Cho { $m = @(MayCuaToi | Where-Object { $_.lanCuoi -and $_.phienBan }); if ($m.Count) { $m[0] } } 180 5
  $giay = [int]((Get-Date) - $t).TotalSeconds
  Dat '3.1' 'Máy Windows trong tuan-thu, đã đồng bộ' ([bool]$may) "sau $giay giây · $(if ($may) { "id $($may.id) ten $($may.ten) lanCuoi $($may.lanCuoi)" } else { 'không thấy' })"
  if ($may) {
    $Chung.MayId = $may.id
    Dat '3.2' 'status.version = bản build' ($may.phienBan -eq $BanGoc) "phienBan $($may.phienBan), mong $BanGoc"
    Dat '3.3' 'Máy gắn đúng Con của gói cài' ($may.con -eq $Chung.ConId) "con $($may.con)"
    $ct = Api GET "/api/m/con/$($Chung.ConId)" $null $Chung.TokenBaMe
    Dat '3.4' 'Chi tiết Con thấy máy đang trực tuyến' ([bool](@($ct.may) | Where-Object { $_.id -eq $Chung.MayId -and $_.truc })) ("{0} máy; baoVe {1}" -f @($ct.may).Count, ((@($ct.may) | ForEach-Object { "$($_.baoVe):$($_.baoVeThieu -join '/')" }) -join ','))
  }
  $st = TrangThai
  Dat '3.5' 'Pipe state: paired, chế độ mặc định giám sát' ($st.paired -and $st.cheDo -eq 'giam-sat') "paired $($st.paired) cheDo $($st.cheDo) mode $($st.mode) lastSyncAt $($st.lastSyncAt)"
}

# ------------------------------------------------------------------ KB10 — named pipe như khay
KichBan 'KB10' 'Named pipe (lệnh của khay)' {
  $r = Pipe @{ cmd = 'state' }
  Dat '10.1' 'Lệnh state trả trạng thái' ($r.ok -and $r.state) "ok $($r.ok)"
  $hv = Pipe @{ cmd = 'hoc-vien'; method = 'GET'; path = 'hoc-vien/tong-quan' } 10000
  Dat '10.2' 'GET hoc-vien/tong-quan qua pipe (mọi phiên được đọc)' ($hv.ok -and $hv.data) ("ok {0} lỗi {1} dữ liệu {2} ký tự" -f $hv.ok, $hv.error, ([string]$hv.data).Length)
  $sai = Pipe @{ cmd = 'hoc-vien'; method = 'GET'; path = 'hoc-vien/../m/toi' }
  Dat '10.3' 'Đường ngoài danh sách bị từ chối' (-not $sai.ok) "lỗi «$($sai.error)»"
  $x = Pipe @{ cmd = 'khong-co' }
  Dat '10.4' 'Lệnh lạ bị từ chối' (-not $x.ok) "lỗi «$($x.error)»"
  # Lệnh GHI từ phiên không phải Con: chỉ kiểm được khi Con có phiên đăng nhập thật (runner không có) — xem README.
  $phien = [System.Diagnostics.Process]::GetCurrentProcess().SessionId; $console = [E2E.Wts]::WTSGetActiveConsoleSessionId()
  $ghi = Pipe @{ cmd = 'hoc-vien'; method = 'POST'; path = 'hoc-vien/doi/khong-co-qua'; body = '{}' } 10000
  Bo '10.5' 'Lệnh ghi từ phiên không phải Con bị từ chối' ("runner không có phiên đăng nhập của Con (ChildSessionId = -1 ⇒ QuyenPhien.LaPhienCon cho mọi phiên). Quan sát: phiên harness $phien, console $console, POST doi → ok $($ghi.ok), lỗi «$($ghi.error)»")
}

# ------------------------------------------------------------------ KB4 — Chặn thật: AppLocker + chính sách web
KichBan 'KB4' 'Chặn thật: AppLocker + web' {
  if (-not $Chung.MayId) { Bo 'KB4' 'Chặn thật' 'chưa có máy'; return }
  $w = Api POST "/api/m/con/$($Chung.ConId)/web/trang" @{ muc = $TenMienChan; trangThai = 'chan' } $Chung.TokenBaMe
  $cd = Api POST "/api/m/may/$($Chung.MayId)/che-do" @{ cheDo = 'chan' } $Chung.TokenBaMe
  Dat '4.1' 'Ba Mẹ đặt Chặn thật + chặn một tên miền' ($cd.cheDo -eq 'chan' -and $w.trangThai -eq 'chan') "cheDo $($cd.cheDo) doi $($cd.doi) · web $($w.muc)=$($w.trangThai)"
  DongBoNgay
  $st = Cho { $x = TrangThai; if ($x.cheDo -eq 'chan') { $x } } 60 3
  Dat '4.2' 'Agent nhận chế độ chan sau đồng bộ' ([bool]$st) "cheDo $((TrangThai).cheDo) mode $((TrangThai).mode)"
  $may = Cho { $m = @(MayCuaToi | Where-Object { $_.id -eq $Chung.MayId -and $_.cheDoMay -eq 'chan' }); if ($m.Count) { $m[0] } } 90 5
  Dat '4.3' 'Máy chủ thấy cheDoMay = chan' ([bool]$may) "cheDoMay $((@(MayCuaToi))[0].cheDoMay)"

  # 4.4 — chính sách web trong registry (không cần SID Con)
  $webOk = Cho { $all = $true; foreach ($k in $KhoaWeb.Values) { if (-not (@(MucAiiGrow $k 'URLBlocklist') | Where-Object { $_.GiaTri -like "*$TenMienChan*" })) { $all = $false } }; $all } 90 5
  $chiTiet = ($KhoaWeb.GetEnumerator() | ForEach-Object { "$($_.Key): " + ((@(MucAiiGrow $_.Value 'URLBlocklist') | ForEach-Object { "$($_.Ten)=$($_.GiaTri)" }) -join ';') }) -join ' · '
  Dat '4.4' "URLBlocklist Chrome + Edge có $TenMienChan" $webOk $chiTiet
  $co = Get-ItemProperty $KhoaWeb.Chrome -ErrorAction SilentlyContinue
  Dat '4.5' 'Cờ trình duyệt (tắt ẩn danh / xoá lịch sử / khách)' ($co.IncognitoModeAvailability -eq 1 -and $co.AllowDeletingBrowserHistory -eq 0 -and $co.BrowserGuestModeEnabled -eq 0) "Incognito=$($co.IncognitoModeAvailability) XoaLS=$($co.AllowDeletingBrowserHistory) Khach=$($co.BrowserGuestModeEnabled)"
  Dat '4.6' 'Mục web của «IT» (tên 1) giữ nguyên' ((@(GiaTriDs $KhoaWeb.Chrome 'URLBlocklist') | Where-Object { $_.Ten -eq '1' -and $_.GiaTri -eq $WebQuanTri }).Count -eq 1) ''

  # 4.7 — cài MỘT CHẠM không gắn tài khoản Con ⇒ AppLocker có áp không?
  Start-Sleep -Seconds 30
  $n = @(LuatAiiGrow (AppLocker)).Count
  $cfg = DocConfig
  Dat '4.7' 'Cài một chạm + Chặn thật ⇒ có luật AppLocker AiiGrow' ($n -gt 0) ("{0} luật AiiGrow; config childUser «{1}» childSid «{2}» (one-touch không ghi tài khoản Con ⇒ AppLockerController bỏ qua khi SID rỗng)" -f $n, $cfg.childUser, $cfg.childSid)

  # 4.8 — gắn tài khoản Con vào config như luồng cài có giao diện (Installer.RunAsync ghi ChildUser/ChildSid) rồi kiểm AppLocker thật
  Stop-Service $Svc -Force
  $json = DocConfigJson
  $json = $json -replace '"childUser":"[^"]*"', ('"childUser":"' + $TenCon + '"') -replace '"childSid":"[^"]*"', ('"childSid":"' + $Chung.SidCon + '"')
  if ($json -notmatch '"childSid"') { $json = $json.TrimEnd('}') + ',"childUser":"' + $TenCon + '","childSid":"' + $Chung.SidCon + '"}' }
  GhiConfigJson $json
  Start-Service $Svc
  [void](Cho { DangChay } 30 2)
  [void](Cho { TrangThai } 30 2)
  DongBoNgay
  $luat = @(Cho { $l = @(LuatAiiGrow (AppLocker) $Chung.SidCon); if ($l.Count) { $l } } 150 5)
  $tenLuat = (@($luat) | ForEach-Object { "$($_.Action):$($_.Name)" }) -join ' | '
  Dat '4.8' 'AppLocker -Local có luật AiiGrow cho SID Con (sau khi gắn tài khoản Con)' ($luat.Count -gt 0) ("{0} luật cho SID: {1}" -f @($luat).Count, $tenLuat)
  $eff = @(LuatAiiGrow (AppLocker -Effective) $Chung.SidCon)
  Dat '4.9' 'AppLocker -Effective có luật AiiGrow' ($eff.Count -gt 0) "$($eff.Count) luật"
  $exe = (AppLocker).SelectSingleNode("//RuleCollection[@Type='Exe']")
  Dat '4.10' 'Bộ Exe ở EnforcementMode Enabled; luật quản trị còn' ($exe.EnforcementMode -eq 'Enabled' -and @(LuatQuanTri (AppLocker)).Count -eq 1) "EnforcementMode $($exe.EnforcementMode); luật quản trị $(@(LuatQuanTri (AppLocker)).Count)"
  $appid = Get-Service AppIDSvc -ErrorAction SilentlyContinue
  Dat '4.11' 'AppIDSvc chạy' ($appid.Status -eq 'Running') "AppIDSvc $($appid.Status)"
  $Chung.CoSid = $true
}

# ------------------------------------------------------------------ KB5 — Khoá ngay / mở lại
KichBan 'KB5' 'Khoá ngay rồi mở lại' {
  if (-not $Chung.MayId) { Bo 'KB5' 'Khoá ngay' 'chưa có máy'; return }
  [void](Api POST "/api/m/con/$($Chung.ConId)/khoa" @{ khoa = $true } $Chung.TokenBaMe)
  DongBoNgay
  $st = Cho { $x = TrangThai; if ($x.locked -and $x.mode -eq 'khoa') { $x } } 60 3
  $hien = TrangThai
  Dat '5.1' 'Agent báo chế độ khoá' ([bool]$st) "locked $($hien.locked) mode $($hien.mode) lockReason $($hien.lockReason)"
  [void](Api POST "/api/m/con/$($Chung.ConId)/khoa" @{ khoa = $false } $Chung.TokenBaMe)
  DongBoNgay
  $st2 = Cho { $x = TrangThai; if (-not $x.locked -and $x.mode -ne 'khoa') { $x } } 60 3
  $hien = TrangThai
  Dat '5.2' 'Mở lại ⇒ hết khoá' ([bool]$st2) "locked $($hien.locked) mode $($hien.mode)"
  Bo '5.3' 'Màn khoá / ngắt phiên Con' 'runner không có phiên đăng nhập của Con và không có khay (xem README)'
}

# ------------------------------------------------------------------ KB6 — về Giám sát
KichBan 'KB6' 'Về Giám sát: gỡ luật AiiGrow, giữ luật quản trị' {
  if (-not $Chung.MayId) { Bo 'KB6' 'Về Giám sát' 'chưa có máy'; return }
  $cd = Api POST "/api/m/may/$($Chung.MayId)/che-do" @{ cheDo = 'giam-sat' } $Chung.TokenBaMe
  DongBoNgay
  [void](Cho { (TrangThai).cheDo -eq 'giam-sat' } 60 3)
  $het = Cho { @(LuatAiiGrow (AppLocker)).Count -eq 0 } 120 5
  Dat '6.1' 'AppLocker không còn luật AiiGrow' $het "còn $(@(LuatAiiGrow (AppLocker)).Count) luật (cheDo agent $((TrangThai).cheDo))"
  Dat '6.2' 'Luật quản trị giả vẫn còn' (@(LuatQuanTri (AppLocker)).Count -eq 1) "$(@(LuatQuanTri (AppLocker)).Count) luật"
  $webHet = Cho { $all = $true; foreach ($k in $KhoaWeb.Values) { if (@(MucAiiGrow $k 'URLBlocklist').Count) { $all = $false } }; $all } 90 5
  Dat '6.3' 'Chính sách web của AiiGrow được gỡ' $webHet (@(MucAiiGrow $KhoaWeb.Chrome 'URLBlocklist' | ForEach-Object { "$($_.Ten)=$($_.GiaTri)" }) -join ';')
  Dat '6.4' 'Mục web «IT» vẫn còn' ((@(GiaTriDs $KhoaWeb.Chrome 'URLBlocklist') | Where-Object { $_.Ten -eq '1' }).Count -eq 1) ''
}

# ------------------------------------------------------------------ KB7a — cập nhật đè bằng tay
KichBan 'KB7a' "Cập nhật đè --capnhat --im-lang lên $BanMoi1" {
  if (-not (DichVu)) { Bo 'KB7a' 'Cập nhật đè' 'chưa cài'; return }
  $ma = ChaySetup $SetupMoi1 @('--capnhat', '--im-lang')
  Dat '7.1' 'Mã thoát 0' ($ma -eq 0) "mã $ma · $(DuoiLog 3)"
  $ok = Cho { DangChay } 60 3
  Dat '7.2' "Dịch vụ chạy bản $BanMoi1" ($ok -and (BanDichVu) -eq $BanMoi1) "Running $ok · ProductVersion $(BanDichVu)"
  $cfg = DocConfig
  Dat '7.3' 'Config/token/deviceId giữ nguyên (không ghép lại)' ((Bam $cfg.token) -eq $Chung.TokenHash -and $cfg.deviceId -eq $Chung.DeviceId -and (-not $Chung.CoSid -or $cfg.childSid -eq $Chung.SidCon)) "deviceId $($cfg.deviceId) childSid $($cfg.childSid)"
  $rc = Recovery
  Dat '7.4' 'Recovery bật lại sau cập nhật' $rc.Ok ($rc.Text -replace "`n", ' ' -replace '\s+', ' ')
  DongBoNgay
  $may = Cho { $m = @(MayCuaToi); if ($m.Count -eq 1 -and $m[0].phienBan -eq $BanMoi1) { $m[0] } } 90 5
  Dat '7.5' "App Ba Mẹ: vẫn 1 máy, phienBan $BanMoi1" ([bool]$may) ("{0} máy, phienBan {1}" -f @(MayCuaToi).Count, ((@(MayCuaToi) | ForEach-Object { $_.phienBan }) -join ','))
  $app = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AiiGrow' -ErrorAction SilentlyContinue
  Dat '7.6' 'Mục Ứng dụng ghi số bản mới' ($app.DisplayVersion -eq $BanMoi1) "DisplayVersion $($app.DisplayVersion) BanVuaCapNhat $($app.BanVuaCapNhat)"
  Dat '7.7' 'Không còn thư mục sao lưu' (-not (Test-Path "$InstallDir.sao-luu")) ''
}

# ------------------------------------------------------------------ KB8 — giả lỗi giữa chừng
KichBan 'KB8' 'Cập nhật lỗi giữa chừng (tệp đích bị khoá) ⇒ máy vẫn có dịch vụ' {
  if (-not (DichVu)) { Bo 'KB8' 'Khôi phục' 'chưa cài'; return }
  $banTruoc = BanDichVu
  $tray = Join-Path $InstallDir 'AiiGrow.Tray.exe'
  # Giữ handle đọc, KHÔNG chia sẻ ghi/xoá ⇒ không ghi đè được, cũng không đổi tên được (giống phần mềm diệt virus đang quét tệp).
  $lenh = "`$f = [System.IO.File]::Open('$tray', 'Open', 'Read', 'Read'); Start-Sleep -Seconds 900"
  $giu = Start-Process powershell.exe -ArgumentList '-NoProfile', '-Command', $lenh -WindowStyle Hidden -PassThru
  $khoa = Cho { try { [System.IO.File]::Open($tray, 'Open', 'ReadWrite', 'ReadWrite').Dispose(); $false } catch { $true } } 20 1
  Log "tệp khay bị giữ: $khoa"
  $ma = ChaySetup $SetupMoi2 @('--capnhat', '--im-lang')
  $chay = Cho { DangChay } 30 3
  Dat '8.1' 'Bộ cài báo lỗi + đã khôi phục (mã 7)' ($ma -eq 7) "mã $ma (0 ok · 7 lỗi đã khôi phục · 8 lỗi chưa khôi phục) · $(DuoiLog 2)"
  Dat '8.2' 'Sau lỗi: dịch vụ vẫn chạy' $chay ("trạng thái {0}, bản {1} (trước {2})" -f (DichVu).Status, (BanDichVu), $banTruoc)
  Dat '8.3' 'Sau lỗi: vẫn là bản cũ' ((BanDichVu) -eq $banTruoc) "ProductVersion $(BanDichVu)"
  $rc = Recovery
  Dat '8.4' 'Sau lỗi: recovery vẫn bật' $rc.Ok ($rc.Text -replace "`n", ' ' -replace '\s+', ' ')
  try { Stop-Process -Id $giu.Id -Force } catch { }
  if (-not (DangChay)) { Log 'dịch vụ không chạy sau KB8 — harness tự Start-Service để chạy tiếp'; try { Start-Service $Svc } catch { Log "Start-Service lỗi: $($_.Exception.Message)" } }
  Get-ChildItem $InstallDir -Filter '*.cu-*' -ErrorAction SilentlyContinue | ForEach-Object { Log "tệp cũ còn lại: $($_.Name)" }
}

# ------------------------------------------------------------------ KB7b — tự cập nhật qua /api/agent/ban-moi
KichBan 'KB7b' "Tự cập nhật qua ban-moi lên $BanMoi2" {
  if (-not (DichVu)) { Bo 'KB7b' 'Tự cập nhật' 'chưa cài'; return }
  if ((BanDichVu) -eq $BanMoi2) { Bo '7b' 'Tự cập nhật' "máy đã là $BanMoi2 (KB8 không lỗi như dự kiến)"; return }
  $m = @{ version = $BanMoi2; url = "https://127.0.0.1:$CONG_TEP/$($Chung.TenTepMoi2)"; sha256 = $Chung.ShaMoi2 }
  [void](Invoke-WebRequest -UseBasicParsing "$MayChu/__e2e/manifest" -Method Post -ContentType 'application/json' -Body (ConvertTo-Json $m -Compress))
  Restart-Service $Svc -Force   # UpdateWorker hỏi ban-moi 2 phút sau khi dịch vụ chạy
  $t = Get-Date
  $ok = Cho { (BanDichVu) -eq $BanMoi2 -and (DangChay) } 480 10
  $mf = (Invoke-WebRequest -UseBasicParsing "$MayChu/__e2e/manifest").Content | ConvertFrom-Json
  Dat '7.8' "Dịch vụ tự lên $BanMoi2 (tải https, kiểm sha256, tác vụ SYSTEM)" $ok ("sau {0:N0} giây · bản {1} · agent hỏi ban-moi {2} lần · {3}" -f ((Get-Date) - $t).TotalSeconds, (BanDichVu), $mf.soLanHoiManifest, (DuoiLog 2))
  $cfg = DocConfig
  Dat '7.9' 'Tự cập nhật giữ token/deviceId' ((Bam $cfg.token) -eq $Chung.TokenHash -and $cfg.deviceId -eq $Chung.DeviceId) "deviceId $($cfg.deviceId)"
  $rc = Recovery
  Dat '7.10' 'Recovery bật sau tự cập nhật' $rc.Ok ($rc.Text -replace "`n", ' ' -replace '\s+', ' ')
  $tv = Get-ScheduledTask -TaskName 'AiiGrowCapNhat' -ErrorAction SilentlyContinue
  Log ("tác vụ AiiGrowCapNhat: {0} · kết quả lần chạy cuối {1}" -f $tv.State, ($tv | Get-ScheduledTaskInfo -ErrorAction SilentlyContinue).LastTaskResult)
  [void](Invoke-WebRequest -UseBasicParsing "$MayChu/__e2e/manifest" -Method Post -ContentType 'application/json' -Body '{}')
}

# ------------------------------------------------------------------ KB9 — gỡ cài đặt
KichBan 'KB9' 'Gỡ --uninstall' {
  if (-not (DichVu)) { Bo 'KB9' 'Gỡ' 'chưa cài'; return }
  # bật lại Chặn thật để có luật AiiGrow + chính sách web cho bộ gỡ dọn
  if ($Chung.MayId) {
    [void](Api POST "/api/m/may/$($Chung.MayId)/che-do" @{ cheDo = 'chan' } $Chung.TokenBaMe)
    DongBoNgay
    [void](Cho { (TrangThai).cheDo -eq 'chan' } 60 3)
    [void](Cho { @(LuatAiiGrow (AppLocker)).Count -gt 0 -and @(MucAiiGrow $KhoaWeb.Chrome 'URLBlocklist').Count -gt 0 } 150 5)
  }
  $truoc = "{0} luật AiiGrow, {1} mục web AiiGrow" -f @(LuatAiiGrow (AppLocker)).Count, @(MucAiiGrow $KhoaWeb.Chrome 'URLBlocklist').Count
  Log "trước khi gỡ: $truoc"
  ChepLog 'truoc-go'
  $setup = Join-Path $InstallDir 'AiiGrow.Setup.exe'   # đúng bản Cài đặt › Ứng dụng › Gỡ gọi
  $ma = ChaySetup $setup @('--uninstall', '--silent')
  ChepLog 'sau-go'
  Dat '9.1' 'Mã thoát gỡ = 0' ($ma -eq 0) "mã $ma (5 = chưa gỡ AppLocker, 6 = chưa trả quyền admin) · trước gỡ: $truoc · $(DuoiLog 4)"
  $mat = Cho { -not (DichVu) } 60 3
  Dat '9.2' 'Dịch vụ AiiGrowService đã mất' $mat "$(if (DichVu) { (DichVu).Status } else { 'không còn' })"
  Dat '9.3' 'AppLocker không còn luật AiiGrow' (@(LuatAiiGrow (AppLocker)).Count -eq 0) "còn $(@(LuatAiiGrow (AppLocker)).Count)"
  Dat '9.4' 'Luật quản trị giả vẫn còn' (@(LuatQuanTri (AppLocker)).Count -eq 1) "$(@(LuatQuanTri (AppLocker)).Count)"
  $conWeb = @(); foreach ($k in $KhoaWeb.Values) { $conWeb += MucAiiGrow $k 'URLBlocklist'; $conWeb += MucAiiGrow $k 'URLAllowlist' }
  $co = Get-ItemProperty $KhoaWeb.Chrome -ErrorAction SilentlyContinue
  Dat '9.5' 'Chính sách web của AiiGrow đã dọn (danh sách + cờ)' ($conWeb.Count -eq 0 -and $null -eq $co.IncognitoModeAvailability -and $null -eq $co.BrowserGuestModeEnabled) ("còn {0} mục; Incognito={1} Khach={2}" -f $conWeb.Count, $co.IncognitoModeAvailability, $co.BrowserGuestModeEnabled)
  Dat '9.6' 'Mục web «IT» vẫn còn' ((@(GiaTriDs $KhoaWeb.Chrome 'URLBlocklist') | Where-Object { $_.Ten -eq '1' -and $_.GiaTri -eq $WebQuanTri }).Count -eq 1) ''
  $run = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' -ErrorAction SilentlyContinue).AiiGrowTray
  $uk = Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AiiGrow'
  Dat '9.7' 'Khay (Run) + mục Ứng dụng đã gỡ' (-not $run -and -not $uk) "Run=$run · Uninstall\AiiGrow=$uk"
  if ($Chung.TokenBaMe) {
    $con = @(MayCuaToi)
    Dat '9.8' 'Máy rời gia đình trên app Ba Mẹ (da-go)' ($con.Count -eq 0) "$($con.Count) máy Windows còn lại"
  }
  $don = Cho { -not (Test-Path $InstallDir) -and -not (Test-Path $TepConfig) } 120 5
  Dat '9.9' 'Thư mục cài + config (token) đã xoá (tác vụ dọn)' $don ("Program Files\AiiGrow còn: {0} · config còn: {1}" -f (Test-Path $InstallDir), (Test-Path $TepConfig))
}

# ------------------------------------------------------------------ tổng kết
ChepLog 'cuoi'
foreach ($p in $TienTrinh) { try { if ($p -and -not $p.HasExited) { & taskkill.exe /PID $p.Id /T /F 2>&1 | Out-Null } } catch { } }

$dem = @{ PASS = 0; FAIL = 0; 'BỎ' = 0 }
foreach ($k in $KQ) { $dem[$k.KetQua]++ }
$md = New-Object System.Text.StringBuilder
[void]$md.AppendLine("## E2E agent Windows — $($dem.PASS) PASS · $($dem.FAIL) FAIL · $($dem['BỎ']) BỎ")
[void]$md.AppendLine('')
[void]$md.AppendLine("Bản build $BanGoc → cập nhật tay $BanMoi1 → tự cập nhật $BanMoi2 · máy $env:COMPUTERNAME · $((Get-CimInstance Win32_OperatingSystem).Caption)")
[void]$md.AppendLine('')
[void]$md.AppendLine('| Mã | Kiểm tra | Kết quả | Chi tiết |')
[void]$md.AppendLine('|---|---|---|---|')
foreach ($k in $KQ) {
  $icon = if ($k.KetQua -eq 'PASS') { '✅ PASS' } elseif ($k.KetQua -eq 'FAIL') { '❌ FAIL' } else { '⏭️ BỎ' }
  $ct = ($k.ChiTiet -replace '\|', '\|' -replace "`r?`n", ' ')
  if ($ct.Length -gt 400) { $ct = $ct.Substring(0, 400) + '…' }
  [void]$md.AppendLine("| $($k.Ma) | $($k.Ten) | $icon | $ct |")
}
$txt = $md.ToString()
[System.IO.File]::WriteAllText((Join-Path $ThuMucLog 'ket-qua.md'), $txt, $Utf8)
if ($env:GITHUB_STEP_SUMMARY) { [System.IO.File]::AppendAllText($env:GITHUB_STEP_SUMMARY, $txt, $Utf8) }
Write-Host ''
Write-Host $txt
if ($dem.FAIL -gt 0) { exit 1 } else { exit 0 }
