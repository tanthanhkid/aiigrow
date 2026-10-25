# Chép mã nguồn AiiGrow.Tray + AiiGrow.Setup vào obj/nguon cho AiiGrow.ChupMan (công cụ chụp màn), kèm HAI chỗ đổi để giả lập DPI:
#   1) mọi «new Font(» và «new("Segoe UI", pt, st)» (UI.F) → ChupDpi.Tao(…)      — cỡ chữ × hệ số (--ti-le)
#   2) Clay.Scale «_scale = g.DpiX / 96f;» → ChupDpi.Dpi(…)                        — hệ số Px/Si × hệ số
# Mã gốc trong src/ KHÔNG bị sửa. Nếu một mẫu không còn khớp (mã gốc đổi) ⇒ dừng build, không để ảnh 150% âm thầm sai.
param([Parameter(Mandatory = $true)][string]$Ra)
$ErrorActionPreference = 'Stop'
$goc = Join-Path $PSScriptRoot '../src'
if (Test-Path $Ra) { Remove-Item -Recurse -Force $Ra }
$utf8 = New-Object System.Text.UTF8Encoding $true
$dem = @{ font = 0; uiF = 0; scale = 0 }
foreach ($p in 'AiiGrow.Tray', 'AiiGrow.Setup') {
  $dich = Join-Path $Ra $p
  New-Item -ItemType Directory -Force $dich | Out-Null
  foreach ($f in Get-ChildItem (Join-Path $goc $p) -Filter *.cs) {
    $t = [IO.File]::ReadAllText($f.FullName)
    $n = ([regex]::Matches($t, [regex]::Escape('new Font('))).Count
    $dem.font += $n
    $t = $t.Replace('new Font(', 'global::AiiGrow.ChupMan.ChupDpi.Tao(')
    if ($t.Contains('=> new("Segoe UI", pt, st);')) {
      $dem.uiF++
      $t = $t.Replace('=> new("Segoe UI", pt, st);', '=> global::AiiGrow.ChupMan.ChupDpi.Tao("Segoe UI", pt, st);')
    }
    if ($t.Contains('_scale = g.DpiX / 96f;')) {
      $dem.scale++
      $t = $t.Replace('_scale = g.DpiX / 96f;', '_scale = global::AiiGrow.ChupMan.ChupDpi.Dpi(g.DpiX / 96f);')
    }
    [IO.File]::WriteAllText((Join-Path $dich $f.Name), $t, $utf8)
  }
}
Write-Host ("chuan-bi-nguon: new Font {0} chỗ, UI.F {1}, Clay.Scale {2} → {3}" -f $dem.font, $dem.uiF, $dem.scale, $Ra)
if ($dem.uiF -ne 1 -or $dem.scale -ne 1 -or $dem.font -lt 5) { throw "chuan-bi-nguon: mẫu giả lập DPI không khớp mã nguồn (UI.F=$($dem.uiF), Clay.Scale=$($dem.scale), new Font=$($dem.font)) — sửa chup-man/chuan-bi-nguon.ps1" }
