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

// Thực thi Policy (dùng chung một AgentRuntime).
builder.Services.AddSingleton<AgentRuntime>();
builder.Services.AddSingleton<AppLockerController>();
builder.Services.AddSingleton<IProcessControl, WindowsProcessControl>();
builder.Services.AddHostedService<AgentWorker>();
builder.Services.AddHostedService<PipeServer>();

// Heartbeat + gỡ từ xa.
builder.Services.AddHostedService<HeartbeatWorker>();

builder.Build().Run();
