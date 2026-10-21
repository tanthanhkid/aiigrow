using AiiGrow.Core;
using AiiGrow.Service;

// Mốc này (cài một chạm + heartbeat + gỡ từ xa): dịch vụ chỉ chạy HeartbeatWorker.
// Lớp áp Policy đầy đủ (AppLockerController, AgentWorker, PipeServer cho khay) + màn chặn / phiên điểm được bật lại ở PR sau
// (phần bị bộ lọc cắt đang chờ master). Các lớp đó vẫn còn trong mã nguồn, chỉ chưa đăng ký.
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddWindowsService(o => o.ServiceName = Paths.ServiceName);
builder.Services.AddHostedService<HeartbeatWorker>();
builder.Build().Run();
