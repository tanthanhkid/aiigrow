using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#777 B4: bộ cài chạy từ tài khoản không đủ quyền phải báo, không im lặng.</summary>
public class QuyenBoCaiTests
{
    [Fact] public void DaNangQuyen_Chay() => Assert.Equal(HuongChayBoCai.Chay, QuyenBoCai.Quyet(true, QuyenBoCai.NangDayDu));
    [Fact] public void QuanTriChuaNang_TuXinNangQuyen() => Assert.Equal(HuongChayBoCai.TuNangQuyen, QuyenBoCai.Quyet(false, QuyenBoCai.DaLoc));
    [Fact] public void TaiKhoanThuong_BaoCanBaMe() => Assert.Equal(HuongChayBoCai.CanTaiKhoanBaMe, QuyenBoCai.Quyet(false, 1));
    [Fact] public void ChuBao_TiengViet_KhongNoiPIN()
    {
        Assert.Contains("Ba Mẹ", QuyenBoCai.ChuCanBaMe);
        Assert.DoesNotContain("PIN", QuyenBoCai.ChuCanBaMe);
    }
}
