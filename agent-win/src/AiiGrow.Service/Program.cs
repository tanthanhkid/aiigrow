using AiiGrow.Core;
using AiiGrow.Service;
using Microsoft.Extensions.DependencyInjection;

// Dịch vụ AiiGrow chạy như Windows Service (UseWindowsService; bộ cài tạo dịch vụ chạy bằng LocalSystem, tự khởi động lại khi lỗi).
// Hai nhóm worker chạy song song:
//   • HeartbeatWorker  — đồng bộ định kỳ + thực thi lệnh GỠ TỪ XA ("go").
//   • Thực thi Policy   — AgentWorker (đọc Policy từ đồng bộ, đóng tiến trình ngoài danh sách qua IProcessControl, sinh/áp AppLocker),
//                         AppLockerController (áp/gỡ luật) và PipeServer (màn chặn + phiên điểm nói chuyện với khay qua named pipe).
// Bước ÁP THẬT (Set-AppLockerPolicy, đóng tiến trình, ngắt phiên) chỉ chạy khi dịch vụ đã được cài trên máy Con và đã ghép máy;
// không ghép ⇒ các vòng này đứng yên. Trong test chỉ chạy logic thuần + dry-run (không đụng hệ thống).
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddWindowsService(o => o.ServiceName = Paths.ServiceName);

// Nhật ký: C:ProgramDataAiiGrowlogsagent-yyyyMMdd.log (giữ 7 ngày) + đẩy lên POST /api/device/log để xem từ xa.
var fileLog = new FileLog(Path.Combine(Paths.DataDir, "logs"));
builder.Services.AddSingleton(fileLog);
builder.Logging.AddProvider(new FileLogProvider(fileLog));
builder.Services.AddHostedService<LogShipWorker>();

// Sentry (Thanh 22/10): log mức Error + ngoại lệ không bắt ⇒ project aiigrow-agent. Không gửi tên máy/tài khoản (máy của Con).
var sentryDsn = typeof(Program).Assembly.GetCustomAttributes(typeof(System.Reflection.AssemblyMetadataAttribute), false)
    .OfType<System.Reflection.AssemblyMetadataAttribute>().FirstOrDefault(a => a.Key == "SentryDsn")?.Value;
if (!string.IsNullOrWhiteSpace(sentryDsn))
    builder.Logging.AddSentry(o =>
    {
        o.Dsn = sentryDsn;
        o.Release = "aiigrow-agent@" + TuCapNhat.BanHienTai().ToString(3);
        o.Environment = "production";
        o.MinimumEventLevel = LogLevel.Error;
        // KHÔNG đính log thường ngày (tên app Con mở, SID tài khoản Con, mã offline) vào sự kiện
        o.MinimumBreadcrumbLevel = LogLevel.None;
        o.SendDefaultPii = false;
        o.ServerName = "";
        o.SetBeforeSend(e => SentryLoc.Loc(e, Environment.TickCount64));
        o.SetBeforeBreadcrumb(_ => null);   // Hub tự thêm breadcrumb «Exception» chưa ẩn — bỏ hết
    });

// Thực thi Policy (dùng chung một AgentRuntime).
builder.Services.AddSingleton<AgentRuntime>();
builder.Services.AddSingleton<AppLockerController>();
builder.Services.AddSingleton<IProcessControl, WindowsProcessControl>();
builder.Services.AddHostedService<AgentWorker>();
builder.Services.AddHostedService<PipeServer>();

// Giám sát + lọc WEB (Chrome/Edge/Brave): ghi lịch sử tên miền Con vào lên máy chủ (mọi chế độ) và áp URLBlocklist/URLAllowlist (chỉ «Chặn thật»).
builder.Services.AddHostedService<WebHistoryWorker>();
builder.Services.AddHostedService<WebGuardWorker>();

// Danh sách app đã cài THẬT ⇒ POST /api/device/ung-dung (Ba Mẹ chọn app thật để chặn / cho phép) — DanhSachAppWorker.cs.
builder.Services.AddHostedService<DanhSachAppWorker>();

// Heartbeat + gỡ từ xa.
builder.Services.AddHostedService<HeartbeatWorker>();

// Tự cập nhật: kiểm /api/agent/ban-moi lúc khởi động + theo chuKyKiemPhut của máy chủ, mặc định 6 giờ (UpdateWorker.cs).
builder.Services.AddHostedService<UpdateWorker>();

builder.Build().Run();
