namespace AiiGrow.Core;

/// <summary>Đổi chế độ agent: «giam-sat» (mặc định — chỉ ghi log việc SẼ chặn) ⇄ «chan» (áp thật). Phần thuần, test được.</summary>
public static class CheDoSwitch
{
    public static (bool Ok, string Cau) Doi(ConfigStore store, string moi)
    {
        var cd = (moi ?? "").Trim().ToLowerInvariant();
        if (cd != CheDoAgent.GiamSat && cd != CheDoAgent.Chan)
            return (false, $"Chế độ không hợp lệ: «{moi}». Dùng --che-do=giam-sat hoặc --che-do=chan.");
        var cfg = store.Load();
        if (cfg is null) return (false, "Máy này chưa cài / chưa ghép AiiGrow.");
        cfg.CheDo = cd;
        store.Save(cfg);
        return (true, cd == CheDoAgent.Chan
            ? "Đã chuyển sang CHẶN THẬT: AiiGrow sẽ áp AppLocker, đóng app ngoài danh sách và khoá ngoài giờ."
            : "Đã chuyển sang GIÁM SÁT: AiiGrow chỉ ghi lại việc sẽ chặn, không chặn thật.");
    }
}
