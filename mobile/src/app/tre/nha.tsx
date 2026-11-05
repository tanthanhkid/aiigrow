// con-trang «Hôm nay» (BRD 8.2, thiết kế 05/11 con-ngay-thuong): sao luôn ở trên cùng; ô lớn: Giờ chơi còn X phút (một quỹ cho mọi app —
// chạm ⇒ Thêm giờ; giờ ngủ / Ba Mẹ khoá / giờ học ⇒ chỉ xin ngoại lệ) · Sao của con (10 sao = 10 phút) · Nhiệm vụ · Sao & quà.
// Teen thêm thống kê ngắn + lịch sử sao. Được duyệt ⇒ mở màn ăn mừng một lần; Ba Mẹ nhờ làm lại ⇒ báo ngay đầu màn.
import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import { BangMang, Canh, ChoTai, Chu, Dong, HaiNut, Luoi2, M, Nhan, Nhom, NhomTieu, Nut, OSo, Tien, gioPhut, useTai } from "@/lib/ui";
import { DiemTren, ManTre, OLon, useTaiTre, useTre } from "@/lib/ui-tre";
import { daXem, ghiDaXem, guiHangCho, kid, lyDoKhoa, type LuotTre, type NhaTreSao } from "@/lib/api-tre";

const MOT_NGAY = 86_400_000;

/** Thẻ giờ chơi trên Nhà: đường đi + dòng phụ theo quỹ hôm nay (05/11: một quỹ phút cho mọi app; hết ⇒ Thêm giờ; ngủ / khoá / học ⇒ ngoại lệ). */
function theGio(d: NhaTreSao, ten: string): { tieu: string; phu: string; di: string; khoa: boolean } {
  const q = d.quy;
  if (!q) return { tieu: "Giờ chơi", phu: d.conPhut > 0 ? `${d.conPhut} phút còn lại hôm nay` : "Hôm nay đã chơi đủ giờ", di: "/tre/them-gio", khoa: false };
  const ly = lyDoKhoa(q);
  if (ly === "gio_ngu") return { tieu: "Đến giờ ngủ rồi", phu: `Máy mở lại lúc ${q.gioNgu.den} · chúc ${ten} ngủ ngon`, di: "/tre/gio-ngu?ly=gio_ngu", khoa: true };
  if (ly === "ba_me_khoa") return { tieu: "Ba Mẹ đang khoá máy", phu: "Cần gấp thì xin Ba Mẹ mở ngoại lệ", di: "/tre/gio-ngu?ly=ba_me_khoa", khoa: true };
  if (ly === "gio_hoc") return { tieu: "Đang giờ học", phu: q.gioHoc ? `App học vẫn dùng được · chơi lại sau ${q.gioHoc.den}` : "App học vẫn dùng được", di: "/tre/gio-ngu?ly=gio_hoc", khoa: true };
  if (q.conPhut <= 0) return { tieu: "Hết giờ chơi hôm nay", phu: "Dùng sao hoặc xin Ba Mẹ thêm giờ", di: "/tre/them-gio", khoa: false };
  return { tieu: `Giờ chơi còn ${q.conPhut} phút`, phu: `Đã chơi ${q.daDung} / ${q.tongPhut} phút · cần thêm? Chạm vào đây`, di: "/tre/them-gio", khoa: false };
}

export default function Nha() {
  const { ten, nhom, ra } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("nha", () => kid.goi<NhaTreSao>("nha"));
  // ăn mừng nhiệm vụ vừa được duyệt (một lần), gửi lại bài đang chờ mạng
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
  const sao = d.sao ?? d.soDu;
  const mt = d.mucTieu;
  const q = d.quy;
  const loiCanh = !mt ? "Làm nhiệm vụ để có thêm sao nhé!" : mt.conThieu > 0 ? `Còn ${mt.conThieu} sao nữa là đổi được ${mt.ten}!` : `Đủ sao đổi ${mt.ten} rồi!`;
  const gio = theGio(d, ten);
  const tyLe = q ? `${q.tyLe.sao} sao = ${q.tyLe.phut} phút chơi` : "Đổi sao lấy giờ chơi hoặc quà";
  return (
    <ManTre tab="nha" tai={tai} vongTai>
      <DiemTren n={sao} chuoi={d.chuoiNgay} />
      {matMang || cu ? <BangMang chu={`Mất mạng — giờ chơi vẫn tính trên máy, ${ten} vẫn có ${sao} sao. Bài nộp sẽ tự gửi khi có mạng.`} /> : null}
      <OLon ic={gio.khoa ? "trang_ngu" : "dongho"} mau={gio.khoa ? "tim" : "xanh"} tieu={gio.tieu} phu={gio.phu} bam={() => router.push(gio.di as never)} />
      {q && !gio.khoa ? <View style={{ marginTop: -4, paddingHorizontal: 6 }}><Tien ti={q.tongPhut ? Math.min(1, q.daDung / q.tongPhut) : 0} /></View> : null}
      <Canh lv="canh-diem" mau="vang" tieu={`${ten} có ${sao} sao`} loi={`${tyLe}. ${loiCanh}`}>
        {mt ? <View style={{ alignSelf: "stretch", marginTop: 2 }}><Tien ti={mt.diem ? sao / mt.diem : 0} mau={M.diem} /></View> : null}
      </Canh>
      {d.canBoSung.map((x) => (
        <OLon key={x.id} ic="camera" mau="cam" tieu="Ba Mẹ nhờ con làm lại" phu={x.ten} bam={() => router.push(`/tre/chup-lai/${x.luot}?nv=${x.id}`)} />
      ))}
      <OLon ic="sao" mau="vang" tieu="Nhiệm vụ hôm nay" phu={d.nhiemVuMo ? `${d.nhiemVuMo} việc đang mở · làm xong được sao` : "Chưa có nhiệm vụ mới"} bam={() => router.push("/tre/nhiem-vu")} />
      <OLon ic="qua" mau="cam" tieu="Sao & quà" phu="Đổi sao lấy giờ chơi hoặc quà Ba Mẹ trao" bam={() => router.push("/tre/cua-hang")} />
      {nhom === "teen" ? <ThongKe d={d} /> : null}
      <HaiNut>
        <Nut chu="Quy tắc nhà mình" loai="ma" nho ic="sach" bam={() => router.push("/tre/quy-tac")} />
        <Nut chu="Huy hiệu" loai="ma" nho ic="sao" bam={() => router.push("/tre/huy-hieu")} />
        <Nut chu="Đổi người" loai="ma" nho ic="nguoi" bam={ra} />
      </HaiNut>
    </ManTre>
  );
}

/** Teen: thống kê cá nhân + lịch sử sao (BRD 8.2). */
function ThongKe({ d }: { d: NhaTreSao }) {
  const ls = useTai(() => kid.goi<{ ds: { delta: number; ly_do: string; created_at: string }[] }>("lich-su"));
  return (
    <>
      <Luoi2>
        <OSo nho="Giải trí hôm nay" so={d.quy?.daDung ?? d.phutChoi} don={`/${d.quy?.tongPhut ?? d.tranNgay} phút`}>
          <View style={{ marginTop: 6 }}><Tien ti={(d.quy?.tongPhut ?? d.tranNgay) ? (d.quy?.daDung ?? d.phutChoi) / (d.quy?.tongPhut ?? d.tranNgay) : 0} mau={M.diem} /></View>
        </OSo>
        <OSo nho={`Cấp ${d.capDo.cap}`} so={d.tongKiem} don=" sao" phu={`Còn ${d.capDo.conThieu} sao lên cấp ${d.capDo.cap + 1}`} />
      </Luoi2>
      {ls.d?.ds.length ? (
        <>
          <NhomTieu chu="Lịch sử sao" />
          <Nhom>
            {ls.d.ds.slice(0, 5).map((x, i) => (
              <Dong key={i} dau={i === 0} tieu={x.ly_do} phu={gioPhut(x.created_at)}
                phai={<Nhan chu={`${x.delta > 0 ? "+" : "−"}${Math.abs(x.delta)}`} loai={x.delta > 0 ? "diem" : "xam"} />} />
            ))}
          </Nhom>
        </>
      ) : null}
      {d.diemChoDuyet ? <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>{`${d.diemChoDuyet} sao đang chờ Ba Mẹ duyệt`}</Chu> : null}
    </>
  );
}
