// Mảnh màn dùng chung của phía Con bản «Dịu» (nhiều màn con-dt-* lặp lại): Rob chào 3 quy tắc, chip «Bảo Anh ▾», thẻ giờ chơi có vòng,
// thẻ sao vàng, dòng chân màn khoá «AiiGrow · Bảo Anh · Ba Mẹ quản lý».
import { router } from "expo-router";
import { View } from "react-native";
import { Icon3D, Rob } from "./ui";
import { ChipTen, ChuD, NutD, TheD, TieuD, VongD } from "./ui-diu";
import { D } from "./diu";
import { useTre } from "./ui-tre";
import type { QuyTre } from "./api-tre";

/** Rob chào (cdt-chao): «Chào con! Mình là Rob» + 3 dòng quy tắc bằng icon. */
export function RobChao({ ten }: { ten?: string }) {
  const dong: [Parameters<typeof Icon3D>[0]["ten"], string, string][] = [
    ["sao", "Làm nhiệm vụ", "Được sao"], ["dongho", "10 sao = 10 phút", "Đổi sao ra giờ chơi"], ["tin", "Muốn thêm?", "Xin Ba Mẹ"],
  ];
  return (
    <View style={{ alignItems: "center", gap: 10 }}>
      <Rob ten="xong" co={170} />
      <TieuD chu={ten ? `Chào ${ten}! Mình là Rob` : "Chào con! Mình là Rob"} giua />
      <ChuD co={15} mau={D.chu2} giua>Mình giữ giờ chơi cùng con.</ChuD>
      <TheD style={{ alignSelf: "stretch", gap: 12 }}>
        {dong.map(([ic, a, b]) => (
          <View key={a} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: D.ic, alignItems: "center", justifyContent: "center" }}><Icon3D ten={ic} co={30} /></View>
            <View style={{ flex: 1 }}>
              <ChuD kieu="rat" co={16}>{a}</ChuD>
              <ChuD co={14} mau={D.chu2}>{b}</ChuD>
            </View>
          </View>
        ))}
      </TheD>
    </View>
  );
}

/** Chip «Bảo Anh ▾» của bé đang đăng nhập: «Đổi bé» / «Đăng xuất» đều đưa máy về màn chọn tên (máy khoá). */
export function ChipBe() {
  const { ten, iAvt, ra } = useTre();
  if (!ten) return null;
  return <ChipTen ten={ten} i={iAvt} doiBe={ra} dangXuat={ra} />;
}

/** Đầu màn Hôm nay: «Chào Bảo Anh!» + «Thứ Năm · 19:30» + chip tên. */
export function ChaoDau({ ten, phu }: { ten: string; phu: string }) {
  return (
    <View style={{ gap: 6 }}>
      <TieuD chu={`Chào ${ten}!`} />
      <ChuD kieu="rat" co={14} mau={D.chu2}>{phu}</ChuD>
      <ChipBe />
    </View>
  );
}

/** Thẻ giờ chơi (cdt-nha-chinh): vòng «18 phút» + «Còn 18 phút chơi» + «Đã chơi 42 / 60 phút» + nút «Xin Ba Mẹ thêm giờ». */
export function TheGio({ q, conPhut, daDung, tong, bam, nut }: { q?: QuyTre; conPhut: number; daDung: number; tong: number; bam?: () => void; nut?: { chu: string; bam: () => void } }) {
  return (
    <TheD bam={bam} nhanDoc={`Còn ${conPhut} phút chơi. Đã chơi ${daDung} trên ${tong} phút`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <VongD ti={tong ? conPhut / tong : 0} so={String(conPhut)} don="phút" co={104} day={11} />
        <View style={{ flex: 1, gap: 4 }}>
          <ChuD kieu="den" co={20}>{conPhut > 0 ? `Còn ${conPhut} phút chơi` : "Hết giờ chơi rồi"}</ChuD>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon3D ten="dongho" co={20} />
            <ChuD kieu="rat" co={13.5} mau={D.chu2}>{`Đã chơi ${daDung} / ${tong} phút`}</ChuD>
          </View>
          {q?.themPhut ? <ChuD co={13} mau={D.chu3}>{`Có ${q.themPhut} phút Ba Mẹ cho thêm`}</ChuD> : null}
        </View>
      </View>
      {nut ? <NutD chu={nut.chu} ic="tin" bam={nut.bam} nho /> : null}
    </TheD>
  );
}

/** Thẻ sao vàng (cdt-nha-chinh): «Sao của con · ⏳ chờ thêm 10» + «30 sao» to + nút đổi. Thẻ màu DUY NHẤT của màn. */
export function TheSao({ sao, choThem, nut }: { sao: number; choThem?: number; nut?: { chu: string; bam: () => void } }) {
  return (
    <TheD vang nhanDoc={`Sao của con: ${sao} sao`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icon3D ten="sao" co={64} />
        <View style={{ flex: 1 }}>
          <ChuD kieu="rat" co={13.5} mau={D.saoInk}>{`Sao của con${choThem ? ` · ⏳ chờ thêm ${choThem}` : ""}`}</ChuD>
          <ChuD kieu="den" co={36} mau={D.saoInk} so>{`${sao} sao`}</ChuD>
        </View>
      </View>
      {nut ? <NutD chu={nut.chu} ic="dongho" bam={nut.bam} nho /> : null}
    </TheD>
  );
}

/** Chân màn khoá / chặn: «AiiGrow · Bảo Anh · Ba Mẹ quản lý». */
export const ChanMan = ({ chu }: { chu: string }) => <ChuD kieu="rat" co={12.5} mau={D.chu3} giua>{chu}</ChuD>;

/** Đi tới đâu khi chạm thẻ giờ: hết giờ ⇒ «Hết giờ chơi», còn ⇒ «Giờ chơi». */
export const diGio = (conPhut: number) => router.push(conPhut > 0 ? "/tre/gio" : "/tre/het-phien");
