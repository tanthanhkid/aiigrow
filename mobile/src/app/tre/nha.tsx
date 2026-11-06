// «Hôm nay» bản «Dịu» (con-dt-ngay 02 cdt-nha-chinh, PIN 06/11): «Chào Bảo Anh!» + chip «Bảo Anh ▾» (Đổi bé / Đăng xuất); thẻ giờ chơi
// (vòng «18 phút», «Đã chơi 42 / 60 phút», «Xin Ba Mẹ thêm giờ»); thẻ sao vàng (thẻ màu duy nhất, «⏳ chờ thêm 10», «Đổi 10 sao lấy 10 phút»);
// «5 nhiệm vụ hôm nay · ⏳ 1 chờ duyệt · 4 chưa làm»; chip «Giờ học 17:00–18:00» · «Ngủ 21:30». Giờ ngủ / Ba Mẹ khoá / giờ học ⇒ thẻ giờ
// dẫn tới màn khoá tương ứng. Được duyệt ⇒ mở màn ăn mừng một lần; Ba Mẹ nhờ làm lại ⇒ thẻ báo ngay đầu màn. Mất mạng ⇒ băng nhẹ + số đã có.
import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import { daXem, ghiDaXem, guiHangCho, kid, lyDoKhoa, type LuotTre, type NhaTreSao, type NvTreSao } from "@/lib/api-tre";
import { thuGio } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { ChaoDau, TheGio, TheSao, diGio } from "@/lib/man-con";
import { ChipD, ChoD, ChuD, DongD, ManD, MatMangD, PillD } from "@/lib/ui-diu";
import { useTaiTre, useTre } from "@/lib/ui-tre";

const MOT_NGAY = 86_400_000;

export default function Nha() {
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("nha-diu", async () => {
    const [nha, nv] = await Promise.all([kid.goi<NhaTreSao>("nha"), kid.goi<{ ds: NvTreSao[] }>("nhiem-vu?tuCham=1").catch(() => ({ ds: [] as NvTreSao[] }))]);
    return { nha, nv: nv.ds };
  });
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
  if (!d) return <ManD tab="nha"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const { nha } = d;
  const q = nha.quy;
  const sao = nha.sao ?? nha.soDu;
  const ly = lyDoKhoa(q);
  const conPhut = q?.conPhut ?? nha.conPhut;
  const tong = q?.tongPhut ?? nha.tranNgay;
  const daDung = q?.daDung ?? nha.phutChoi;
  const choDuyet = d.nv.filter((x) => x.dang_cho > 0).length;
  const chuaLam = d.nv.filter((x) => x.trang_thai_con === "san_sang" || x.trang_thai_con === "dang_lam" || x.trang_thai_con === "can_bo_sung").length;
  const doiDuoc = !!q && !ly && q.doiSao.bat && q.doiSao.conDoiDuoc > 0;
  const tyLe = q?.tyLe ?? { sao: 10, phut: 10 };
  return (
    <ManD tab="nha">
      <ChaoDau ten={ten} phu={thuGio()} />
      {matMang || cu ? <MatMangD chu={`Mất mạng rồi — giờ chơi vẫn tính, ${ten} vẫn có ${sao} sao. Bài nộp tự gửi khi có mạng.`} /> : null}
      {ly ? (
        <DongD ic={ly === "gio_ngu" ? "trang_ngu" : ly === "gio_hoc" ? "sach" : "khoa"}
          tieu={ly === "gio_ngu" ? "Đến giờ ngủ rồi" : ly === "gio_hoc" ? "Giờ học rồi!" : "Ba Mẹ đang khoá máy"}
          phu={ly === "gio_ngu" ? `Sáng mai máy mở lúc ${q!.gioNgu.den}` : ly === "gio_hoc" && q!.gioHoc ? `${q!.gioHoc.tu} – ${q!.gioHoc.den} · chỉ mở app học` : "Cần gấp thì xin Ba Mẹ"}
          bam={() => router.push(`/tre/gio-ngu?ly=${ly}`)} />
      ) : (
        <TheGio q={q} conPhut={conPhut} daDung={daDung} tong={tong} bam={() => diGio(conPhut)}
          nut={q && !q.choXinThem ? undefined : { chu: "Xin Ba Mẹ thêm giờ", bam: () => router.push("/tre/them-gio") }} />
      )}
      <TheSao sao={sao} choThem={nha.diemChoDuyet || undefined}
        nut={doiDuoc ? { chu: `Đổi ${tyLe.sao} sao lấy ${tyLe.phut} phút`, bam: () => router.push("/tre/choi") } : undefined} />
      {nha.canBoSung.map((x) => (
        <DongD key={x.id} ic="tro_lai" tieu="Ba Mẹ nhờ làm lại" phu={x.ten} bam={() => router.push(`/tre/chup-lai/${x.luot}?nv=${x.id}`)} />
      ))}
      <DongD ic="sach" tieu={d.nv.length ? `${d.nv.length} nhiệm vụ hôm nay` : "Chưa có nhiệm vụ mới"} bam={() => router.push("/tre/nhiem-vu")}
        nhan={d.nv.length ? <>
          {choDuyet ? <PillD chu={`⏳ ${choDuyet} chờ duyệt`} loai="cho" /> : null}
          {chuaLam ? <View style={{ justifyContent: "center", height: 28 }}><ChuD kieu="rat" co={13} mau={D.xanhD}>{`${chuaLam} chưa làm`}</ChuD></View> : null}
        </> : undefined} />
      {q ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {q.gioHoc ? <ChipD ic="sach" chu={`Giờ học ${q.gioHoc.tu}–${q.gioHoc.den}`} bam={() => router.push("/tre/gio-ngu?ly=gio_hoc")} /> : null}
          <ChipD ic="trang_ngu" chu={`Ngủ ${q.gioNgu.tu}`} bam={() => router.push("/tre/quy-tac")} />
        </View>
      ) : null}
    </ManD>
  );
}
