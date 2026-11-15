// Mảnh màn dùng chung của phía Con bản «Dịu» (nhiều màn con-dt-* lặp lại): Grow chào 3 quy tắc, chip «Bảo Anh ▾», thẻ sao = phút có vòng (15/11),
// thẻ sao vàng / âm (đang nợ), dòng chân màn khoá «AiiGrow · Bảo Anh · Ba Mẹ quản lý».
import { router } from "expo-router";
import { View } from "react-native";
import { Icon3D, Rob, type TenIcon } from "./ui";
import { ChipTen, ChuD, NutD, SaoD, TheD, TieuD, VongD } from "./ui-diu";
import { D } from "./diu";
import { useTre } from "./ui-tre";
import { soSao, soVN, type SaoCon } from "./con-diu";

/** Grow chào (cdt-chao): «Chào con! Mình là Grow» + 3 dòng quy tắc bằng icon (15/11: 1 sao = 1 phút chơi). */
export function RobChao({ ten }: { ten?: string }) {
  const dong: [Parameters<typeof Icon3D>[0]["ten"], string, string][] = [
    ["sao", "Làm nhiệm vụ", "Được sao"], ["dongho", "1 sao = 1 phút chơi", "Có sao là chơi, để dành đổi quà"], ["tin", "Muốn thêm?", "Xin Ba Mẹ"],
  ];
  return (
    <View style={{ alignItems: "center", gap: 10 }}>
      <Rob ten="xong" co={170} />
      <TieuD chu={ten ? `Chào ${ten}! Mình là Grow` : "Chào con! Mình là Grow"} giua />
      <ChuD co={15} mau={D.chu2} giua>Mình giữ sao và phút chơi cùng con.</ChuD>
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

/** Màu viên sao âm (đang nợ) — mẫu thống nhất 15/11: nền #f9e7d2, chữ #8a3c0c. */
export const NO = { nen: "#f9e7d2", chu: "#8a3c0c", vien: "#f0d3b4" };

/** Viên sao nhỏ: dương ⇒ vàng «⭐ 30 sao», âm ⇒ viên cảnh báo «⭐ −20 sao». */
export function VienSao({ sao, chu }: { sao: number; chu?: string }) {
  if (sao >= 0) return <SaoD chu={chu ?? soSao(sao)} />;
  return (
    <View accessibilityLabel={chu ?? soSao(sao)} style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 32, paddingLeft: 6, paddingRight: 10, borderRadius: 16,
      backgroundColor: NO.nen, borderWidth: 1, borderColor: NO.vien }}>
      <Icon3D ten="sao" co={20} />
      <ChuD kieu="den" co={14} mau={NO.chu} so>{chu ?? soSao(sao)}</ChuD>
    </View>
  );
}

/** Thẻ sao = phút (cdt-nha-chinh 15/11): vòng «18 sao» + «Còn 18 sao = 18 phút chơi» + «Hôm nay chơi 42 phút» + nút «Xin Ba Mẹ cho vay sao». */
export function ThePhut({ s, bam, nut }: { s: SaoCon; bam?: () => void; nut?: { chu: string; bam: () => void } }) {
  const vong = Math.max(s.phutCon, 1);
  return (
    <TheD bam={bam} nhanDoc={`Còn ${s.phutCon} sao bằng ${s.phutCon} phút chơi. Hôm nay chơi ${s.phutHomNay} phút`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <VongD ti={s.phutCon / Math.max(vong, s.phutCon + s.phutHomNay)} so={soVN(s.phutCon)} don="sao" co={104} day={11} />
        <View style={{ flex: 1, gap: 4 }}>
          <ChuD kieu="den" co={20}>{s.hetSao ? "Hết sao rồi" : `Còn ${soVN(s.phutCon)} sao = ${soVN(s.phutCon)} phút chơi`}</ChuD>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon3D ten="dongho" co={20} />
            <ChuD kieu="rat" co={13.5} mau={D.chu2}>{`Hôm nay chơi ${s.phutHomNay} phút`}</ChuD>
          </View>
        </View>
      </View>
      {nut ? <NutD chu={nut.chu} ic="tin" bam={nut.bam} nho /> : null}
    </TheD>
  );
}

/** Thẻ sao (cdt-nha-chinh / Ví quà): «Sao của con · ⏳ chờ duyệt +10» + «18 sao» to; âm ⇒ màu cảnh báo + «Đang nợ Ba Mẹ 20 sao». Thẻ màu DUY NHẤT của màn. */
export function TheSao({ sao, no = 0, choThem, nut, nhan = "Sao của con" }: { sao: number; no?: number; choThem?: number; nut?: { chu: string; bam: () => void; ic?: TenIcon }; nhan?: string }) {
  const am = sao < 0;
  const mau = am ? NO.chu : D.saoInk;
  return (
    <TheD vang={!am} style={am ? { backgroundColor: NO.nen, borderColor: NO.vien } : undefined} nhanDoc={`${nhan}: ${soSao(sao)}${no > 0 ? `. Đang nợ Ba Mẹ ${no} sao` : ""}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icon3D ten="sao" co={64} />
        <View style={{ flex: 1 }}>
          <ChuD kieu="rat" co={13.5} mau={mau}>{`${nhan}${choThem ? ` · ⏳ chờ duyệt +${choThem}` : ""}`}</ChuD>
          <ChuD kieu="den" co={36} mau={mau} so>{soSao(sao)}</ChuD>
        </View>
      </View>
      {no > 0 ? <ChuD kieu="rat" co={13.5} mau={NO.chu}>{`Đang nợ Ba Mẹ ${soVN(no)} sao · sao nhiệm vụ trả nợ trước`}</ChuD> : null}
      {nut ? <NutD chu={nut.chu} ic={nut.ic ?? "dongho"} bam={nut.bam} nho /> : null}
    </TheD>
  );
}

/** Chân màn khoá / chặn: «AiiGrow · Bảo Anh · Ba Mẹ quản lý». */
export const ChanMan = ({ chu }: { chu: string }) => <ChuD kieu="rat" co={12.5} mau={D.chu3} giua>{chu}</ChuD>;

/** Đi tới đâu khi chạm thẻ sao = phút: hết sao ⇒ «Hết sao rồi», còn ⇒ «Đang chơi». */
export const diGio = (hetSao: boolean) => router.push(hetSao ? "/tre/het-phien" : "/tre/gio");
