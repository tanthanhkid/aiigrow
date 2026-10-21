using AiiGrow.Core;
using AiiGrow.Service;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddWindowsService(o => o.ServiceName = Paths.ServiceName);
builder.Services.AddSingleton<AgentRuntime>();
builder.Services.AddSingleton<AppLockerController>();
builder.Services.AddHostedService<AgentWorker>();
builder.Services.AddHostedService<PipeServer>();
builder.Build().Run();
