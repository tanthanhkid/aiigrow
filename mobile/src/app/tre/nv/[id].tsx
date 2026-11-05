// con-nv-chi-tiet: tên việc + sao, 3 bước bằng hình, «Hôm nay đã làm 2/3 lần». Bắt đầu ⇒ đồng hồ nhiệm vụ.
// 05/11: nộp ảnh / ghi âm / viết kể lại / bấm «Xong»; «Học với AiiRob» — AiiRob tự chấm, không có nút Bắt đầu.
import { router, useLocalSearchParams } from "expo-router";
import { BaoLoi, Canh, ChoTai, Nhan, Nut, The, TickDong, useLam } from "@/lib/ui";
import { GhiChu, ManTre, batDauLuc, useTaiTre } from "@/lib/ui-tre";
import { kid, type NvTreSao } from "@/lib/api-tre";
import { LoiApi } from "@/lib/api";

const thuong = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const LUI = { chu: "Nhiệm vụ", ve: "/tre/nhiem-vu" };

export default function ChiTietNv() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTaiTre(`nv-${id}`, async () => {
    const x = (await kid.goi<{ ds: NvTreSao[] }>("nhiem-vu?tuCham=1")).ds.find((n) => n.id === id);
    if (!x) throw new LoiApi("khong_thay", "Nhiệm vụ này không còn nữa — chọn việc khác nhé.", 404);
    return x;
  });
  const { dangChay, loi: loiLam, lam } = useLam();
  if (!d) return <ManTre lui={LUI}><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const bc = d.bang_chung;
  const tuCham = d.tu_cham || bc === "tu_dong";
  const buocNop = bc === "van_ban" ? "Viết vài câu kể lại" : bc === "ghi_am" ? "Ghi âm gửi Ba Mẹ" : bc === "xong" ? "Bấm «Xong»" : "Chụp 1 ảnh việc đã làm";
  const loiNop = bc === "van_ban" ? "Làm xong, kể lại vài câu cho Ba Mẹ nhé!" : bc === "ghi_am" ? "Làm xong, ghi âm gửi Ba Mẹ nghe nhé!"
    : bc === "xong" ? "Làm xong bấm «Xong» là được!" : "Làm xong, chụp 1 ảnh gửi Ba Mẹ nhé!";
  if (tuCham) {
    return (
      <ManTre lui={LUI}>
        <Canh lv="hoc" mau="vang" tieu={d.ten} loi={d.mo_ta || "Học xong một bài với AiiRob — đạt là AiiRob tự cộng sao."}>
          <Nhan chu={`+${d.sao ?? d.diem} sao`} loai="diem" />
        </Canh>
        <GhiChu giua>Mở app Học với AiiRob để học. Không cần nộp bài ở đây.</GhiChu>
      </ManTre>
    );
  }
  const batDau = () => lam(async () => {
    const r = await kid.goi<{ luot: string }>(`nhiem-vu/${d.id}/bat-dau`, {});
    batDauLuc(r.luot);
    router.replace(`/tre/dang/${r.luot}?nv=${d.id}`);
  });
  return (
    <ManTre lui={LUI} day={<><BaoLoi loi={loiLam} /><Nut chu="Bắt đầu" ic="tia" rong bam={batDau} dangChay={dangChay} /></>}>
      <Canh lv="chi" mau="vang" tieu={d.ten} loi={d.mo_ta || loiNop}>
        <Nhan chu={`+${d.sao ?? d.diem} sao`} loai="diem" />
      </Canh>
      <The dem>
        <TickDong chu="Bấm “Bắt đầu”" />
        <TickDong chu={d.phut_toi_thieu ? `Làm ít nhất ${d.phut_toi_thieu} phút` : `Đi ${thuong(d.ten)}`} trang="sau" />
        <TickDong chu={buocNop} trang="sau" />
      </The>
      {d.toi_da_ngay ? <GhiChu giua>{`Hôm nay đã làm ${d.hom_nay}/${d.toi_da_ngay} lần`}</GhiChu> : null}
    </ManTre>
  );
}
