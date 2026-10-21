// con-trang «Nhà của Ken» (BRD 8.2): điểm luôn ở trên cùng, «còn thiếu X điểm để đổi Y», 3 ô lớn: Làm gì để có điểm · Chơi trò chơi · Cửa hàng.
// Teen thêm thống kê ngắn + lịch sử điểm. Được duyệt ⇒ mở màn ăn mừng một lần; ảnh cần chụp lại ⇒ báo ngay đầu màn.
import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import { BangMang, Canh, ChoTai, Chu, Dong, HaiNut, Luoi2, M, Nhan, Nhom, NhomTieu, Nut, OSo, Tien, gioPhut, useTai } from "@/lib/ui";
import { DiemTren, ManTre, OLon, gioCua, useTaiTre, useTre } from "@/lib/ui-tre";
import { daXem, ghiDaXem, guiHangCho, kid, tenMuc, type LuotTre, type NhaTre } from "@/lib/api-tre";

const MOT_NGAY = 86_400_000;

export default function Nha() {
  const { ten, nhom, ra } = useTre();
  const { d, loi, matMang, tai, dangTai, cu } = useTaiTre("nha", () => kid.goi<NhaTre>("nha"));
  // ăn mừng nhiệm vụ vừa được duyệt (một lần), gửi lại ảnh đang chờ mạng
  useFocusEffect(useCallback(() => {
    guiHangCho().catch(() => {});
    kid.goi<{ ds: LuotTre[] }>("luot").then((r) => {
      const moi = r.ds.filter((x) => x.trang_thai === "duoc_duyet" && !daXem(x.id));
      const gan = moi.find((x) => x.nop_luc && new Date(x.nop_luc).getTime() > new Date().getTime() - MOT_NGAY);
      moi.forEach((x) => x !== gan && ghiDaXem(x.id));
      if (gan) router.push(`/tre/duoc-duyet/${gan.id}`);
    }).catch(() => {});
  }, []));
  if (!d) return <ManTre tab="nha"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const mt = d.mucTieu;
  const loiCanh = !mt ? "Làm nhiệm vụ để có thêm điểm nhé!" : mt.conThieu > 0 ? `Còn ${mt.conThieu} điểm nữa là đổi được ${mt.ten}!` : `Đủ điểm đổi ${mt.ten} rồi!`;
  const choi = d.phien ? { phu: `Đang chơi ${tenMuc(d.phien.muc)} · còn ${d.phien.conPhut} phút`, di: `/tre/phien/${d.phien.id}` }
    : d.nghiDen ? { phu: `Nghỉ chút nhé · mở lại lúc ${gioCua(d.nghiDen)}`, di: `/tre/het-phien?nghiDen=${encodeURIComponent(d.nghiDen)}` }
      : d.gioNgu ? { phu: "Đến giờ ngủ rồi · mai chơi tiếp", di: "/tre/gio-ngu?ly=gio_ngu" }
        : !d.khung.dang ? { phu: d.khung.moLai ? `Mở lúc ${d.khung.moLai}${d.khung.moMai ? " ngày mai" : ""}` : "Hôm nay không có giờ chơi", di: "/tre/gio-ngu?ly=ngoai_khung" }
          : d.conPhut <= 0 ? { phu: "Hôm nay đã chơi đủ giờ", di: "/tre/gio-ngu?ly=dat_tran_ngay" }
            : { phu: `${d.conPhut} phút còn lại hôm nay · tới ${d.khung.den}`, di: "/tre/choi" };
  return (
    <ManTre tab="nha" tai={tai} dangTai={dangTai}>
      <DiemTren n={d.soDu} chuoi={d.chuoiNgay} />
      {matMang || cu ? <BangMang chu={`Mất mạng — ${ten} vẫn chơi được bằng ${d.soDu} điểm đã có. Nhiệm vụ nộp sẽ tự gửi khi có mạng.`} /> : null}
      <Canh lv="canh-diem" mau="vang" tieu={`${ten} có ${d.soDu} điểm`} loi={loiCanh}>
        {mt ? <View style={{ alignSelf: "stretch", marginTop: 2 }}><Tien ti={mt.diem ? d.soDu / mt.diem : 0} mau={M.diem} /></View> : null}
      </Canh>
      {d.canBoSung.map((x) => (
        <OLon key={x.id} ic="camera" mau="cam" tieu="Chụp lại giúp Ba Mẹ" phu={x.ten} bam={() => router.push(`/tre/chup-lai/${x.luot}?nv=${x.id}`)} />
      ))}
      <OLon ic="sao" mau="vang" tieu="Làm gì để có điểm?" phu={d.nhiemVuMo ? `${d.nhiemVuMo} nhiệm vụ đang mở` : "Chưa có nhiệm vụ mới"} bam={() => router.push("/tre/nhiem-vu")} />
      <OLon ic="game" tieu="Chơi trò chơi" phu={choi.phu} bam={() => router.push(choi.di as never)} />
      <OLon ic="qua" mau="cam" tieu="Cửa hàng" phu="Phiếu quà, quà, đặc quyền" bam={() => router.push("/tre/cua-hang")} />
      {nhom === "teen" ? <ThongKe d={d} /> : null}
      <HaiNut>
        <Nut chu="Quy tắc nhà mình" loai="ma" nho ic="sach" bam={() => router.push("/tre/quy-tac")} />
        <Nut chu="Huy hiệu" loai="ma" nho ic="sao" bam={() => router.push("/tre/huy-hieu")} />
        <Nut chu="Đổi người" loai="ma" nho ic="nguoi" bam={ra} />
      </HaiNut>
    </ManTre>
  );
}

/** Teen: thống kê cá nhân + lịch sử điểm (BRD 8.2). */
function ThongKe({ d }: { d: NhaTre }) {
  const ls = useTai(() => kid.goi<{ ds: { delta: number; ly_do: string; created_at: string }[] }>("lich-su"));
  return (
    <>
      <Luoi2>
        <OSo nho="Giải trí hôm nay" so={d.phutChoi} don={`/${d.tranNgay} phút`}>
          <View style={{ marginTop: 6 }}><Tien ti={d.tranNgay ? d.phutChoi / d.tranNgay : 0} mau={M.diem} /></View>
        </OSo>
        <OSo nho={`Cấp ${d.capDo.cap}`} so={d.tongKiem} don=" điểm" phu={`Còn ${d.capDo.conThieu} điểm lên cấp ${d.capDo.cap + 1}`} />
      </Luoi2>
      {ls.d?.ds.length ? (
        <>
          <NhomTieu chu="Lịch sử điểm" />
          <Nhom>
            {ls.d.ds.slice(0, 5).map((x, i) => (
              <Dong key={i} dau={i === 0} tieu={x.ly_do} phu={gioPhut(x.created_at)}
                phai={<Nhan chu={`${x.delta > 0 ? "+" : "−"}${Math.abs(x.delta)}`} loai={x.delta > 0 ? "diem" : "xam"} />} />
            ))}
          </Nhom>
        </>
      ) : null}
      {d.diemChoDuyet ? <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>{`${d.diemChoDuyet} điểm đang chờ Ba Mẹ duyệt`}</Chu> : null}
    </>
  );
}
