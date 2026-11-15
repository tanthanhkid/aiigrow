// «Hôm nay» bản «Dịu» (con-dt-ngay 02 cdt-nha-chinh, PIN 06/11, sổ sao 15/11 #263–#265): «Chào Bảo Anh!» + chip «Bảo Anh ▾» (Đổi bé / Đăng xuất);
// thẻ sao = phút (vòng «18 sao», «Còn 18 sao = 18 phút chơi», «Hôm nay chơi 42 phút», «Xin Ba Mẹ cho vay sao»); thẻ sao (vàng, âm ⇒ màu cảnh
// báo + «Đang nợ Ba Mẹ 20 sao», «⏳ chờ duyệt +10», «Chơi bằng sao · 1 sao = 1 phút»); «5 nhiệm vụ hôm nay · ⏳ 1 chờ duyệt · 4 chưa làm».
// Chế độ «Mở hết» (#262, them-uero9k5x): thẻ «Hôm nay Mở hết · không tính phút», sao chỉ để đổi quà. Ba Mẹ khoá máy ⇒ dòng dẫn tới màn khoá.
// Được duyệt ⇒ mở màn ăn mừng một lần; Ba Mẹ nhờ làm lại ⇒ thẻ báo ngay đầu màn. Mất mạng ⇒ băng nhẹ + số đã có. (Bỏ giờ ngủ, giờ học 14/11.)
import { useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import { daXem, ghiDaXem, guiHangCho, kid, taiSao, type LuotTre, type NhaTreSao, type NvTreSao, type ToiTre } from "@/lib/api-tre";
import { saoTuMayChu, soSao, thuGio } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { Icon3D } from "@/lib/ui";
import { ChaoDau, ThePhut, TheSao, diGio } from "@/lib/man-con";
import { ChuD, ChoD, DongD, ManD, MatMangD, PillD, TheD } from "@/lib/ui-diu";
import { useTaiTre, useTre } from "@/lib/ui-tre";

const MOT_NGAY = 86_400_000;

export default function Nha() {
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("nha-diu", async () => {
    const [nha, nv, s, toi] = await Promise.all([kid.goi<NhaTreSao>("nha"), kid.goi<{ ds: NvTreSao[] }>("nhiem-vu?tuCham=1").catch(() => ({ ds: [] as NvTreSao[] })),
      taiSao().catch(() => null), kid.goi<ToiTre>("toi").catch(() => null)]);
    // kid/sao lỗi ⇒ màn vẫn hiện, số suy từ kid/nha (sao + quỹ cũ)
    const s2 = s ?? saoTuMayChu(null, { sao: nha.sao ?? nha.soDu, quy: nha.quy ?? null });
    return { nha, nv: nv.ds, s: { ...s2, khoa: s2.khoa || !!nha.quy?.khoa }, cheDo: toi?.cheDo ?? null };
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
  const { nha, s } = d;
  const moHet = d.cheDo === "mo_het";
  const choDuyet = d.nv.filter((x) => x.dang_cho > 0).length;
  const chuaLam = d.nv.filter((x) => x.trang_thai_con === "san_sang" || x.trang_thai_con === "dang_lam" || x.trang_thai_con === "can_bo_sung").length;
  return (
    <ManD tab="nha">
      <ChaoDau ten={ten} phu={thuGio()} />
      {matMang || cu ? <MatMangD chu={`Mất mạng rồi — ${ten} vẫn có ${soSao(s.sao)}. Bài nộp tự gửi khi có mạng.`} /> : null}
      {s.khoa ? (
        <DongD ic="khoa" tieu="Ba Mẹ đang khoá máy" phu="Cần gấp thì nhắn Ba Mẹ" bam={() => router.push("/tre/gio-ngu?ly=ba_me_khoa")} />
      ) : moHet ? (
        <TheD nhanDoc="Hôm nay Mở hết. Không tính phút">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: D.xanhN, alignItems: "center", justifyContent: "center" }}><Icon3D ten="tick" co={40} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <ChuD kieu="rat" co={13.5} mau={D.chu2}>Hôm nay Mở hết</ChuD>
              <ChuD kieu="den" co={20}>Mở hết · không tính phút</ChuD>
            </View>
          </View>
          <ChuD co={14} mau={D.chu2}>Ba Mẹ để mở hết: app, web dùng tự do, chơi không trừ sao.</ChuD>
        </TheD>
      ) : (
        <ThePhut s={s} bam={() => diGio(s.hetSao)} nut={{ chu: "Xin Ba Mẹ cho vay sao", bam: () => router.push("/tre/them-gio") }} />
      )}
      <TheSao sao={s.sao} no={s.no} choThem={nha.diemChoDuyet || undefined} nhan={moHet ? "Sao để đổi quà" : "Sao của con"}
        nut={moHet ? { chu: "Đổi quà bằng sao", ic: "qua", bam: () => router.push("/tre/cua-hang") }
          : { chu: "Chơi bằng sao · 1 sao = 1 phút", bam: () => router.push("/tre/choi") }} />
      {nha.canBoSung.map((x) => (
        <DongD key={x.id} ic="tro_lai" tieu="Ba Mẹ nhờ làm lại" phu={x.ten} bam={() => router.push(`/tre/chup-lai/${x.luot}?nv=${x.id}`)} />
      ))}
      <DongD ic="sach" tieu={d.nv.length ? `${d.nv.length} nhiệm vụ hôm nay` : "Chưa có nhiệm vụ mới"} bam={() => router.push("/tre/nhiem-vu")}
        nhan={d.nv.length ? <>
          {choDuyet ? <PillD chu={`⏳ ${choDuyet} chờ duyệt`} loai="cho" /> : null}
          {chuaLam ? <View style={{ justifyContent: "center", height: 28 }}><ChuD kieu="rat" co={13} mau={D.xanhD}>{`${chuaLam} chưa làm`}</ChuD></View> : null}
        </> : undefined} />
    </ManD>
  );
}
