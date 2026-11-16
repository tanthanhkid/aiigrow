// #302 «Giờ chơi»: khối chọn GIỚI HẠN TỐI ĐA mỗi ngày (thẻ vàng «Hết giờ, máy tự khoá» — 30p / 60p / 90p / Tự chọn, kèm T7, CN) + «Mỗi lượt tối đa»
// (Không giới hạn / 15p / 30p / 45p / 60p / Tự chọn) + dòng giải thích. Dùng ở Lần đầu (thiet-lap/gio) và hồ sơ Con (ho-so/[id]/gio-choi).
// Bàn thiết kế chưa có màn cho «Mỗi lượt tối đa» / nghỉ giữa lượt — dựng theo kiểu thẻ + chip của bm1-ob-gio (bổ sung lên bàn sau).
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { chipLuot, chipNgay, docPhut, KHOANG_LUOT, KHOANG_NGAY, moTaGioiHan, mucTu, type GioiHan, type MucMayChu } from "@/lib/gioi-han";
import { Chu, F, Icon3D, M } from "@/lib/ui";

const NAU = "#4a3000";

const oChip = (on: boolean) => ({ flex: 1, minWidth: 0, height: 64, borderRadius: 22, alignItems: "center" as const, justifyContent: "center" as const, gap: 2,
  backgroundColor: on ? M.chinh : "#fff", boxShadow: on ? `0px 0px 0px 3px #fbe9c4, 0px 0px 0px 5px ${M.chinh}` : BONG.nho });

function Chip({ on, tren, duoi, nhan, bam }: { on: boolean; tren: string; duoi?: string; nhan: string; bam: () => void }) {
  return (
    <Pressable onPress={bam} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={nhan} style={oChip(on)}>
      <Chu kieu="rat" co={tren.length > 6 ? 14 : 18} so mau={on ? "#fff" : M.chu} dong={1}>{tren}</Chu>
      {duoi ? <Chu kieu="dam7" co={10.5} mau={on ? "#dcebe6" : "#565c59"} dong={1}>{duoi}</Chu> : null}
    </Pressable>
  );
}

function OPhut({ nhan, chu, doi, goiY }: { nhan: string; chu: string; doi: (s: string) => void; goiY: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
      <Chu kieu="dam7" co={12.5} mau={NAU}>{nhan}</Chu>
      <View style={{ minHeight: 46, borderRadius: 23, backgroundColor: "#fdf3dc", boxShadow: BONG.lom, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 6 }}>
        <TextInput value={chu} onChangeText={doi} placeholder={goiY} placeholderTextColor={M.chu3} keyboardType="number-pad" maxLength={3} accessibilityLabel={nhan}
          style={{ flex: 1, minWidth: 0, fontFamily: F.dam, fontSize: 16, color: M.chu, paddingVertical: 8, outlineStyle: "none" } as never} />
        <Chu kieu="dam7" co={13} mau={M.chu2}>phút</Chu>
      </View>
    </View>
  );
}

/** `doi(gt, loi)`: loi ≠ null khi ô «Tự chọn» đang sai (màn tắt nút Lưu / Tiếp). */
/** `muc` / `moTa`: lựa chọn + dòng giải thích máy chủ trả (gio-choi) — thiếu thì dùng mặc định trong app; `moTa` chỉ dùng khi chưa đổi gì. */
export function ChonGioiHan({ gt, doi, muc: mucVao, moTa }: { gt: GioiHan; doi: (g: GioiHan, loi: string | null) => void; muc?: MucMayChu; moTa?: string | null }) {
  const muc = mucTu(mucVao);
  const [gt0] = useState(gt);
  const [loi, setLoi] = useState<string | null>(null);
  const bao = (g: GioiHan, l: string | null) => { setLoi(l); doi(g, l); };
  const [tuNgay, setTuNgay] = useState(chipNgay(gt, muc.ngay) === "tu_chon");
  const [tuLuot, setTuLuot] = useState(chipLuot(gt, muc.luot) === "tu_chon");
  const [chu, setChu] = useState({ nt: gt.ngayThuong ? String(gt.ngayThuong) : "", ct: gt.cuoiTuan ? String(gt.cuoiTuan) : "", l: gt.moiLuot ? String(gt.moiLuot) : "" });
  const kiem = (c: typeof chu, tn: boolean, tl: boolean) => {
    const nt = docPhut(c.nt, KHOANG_NGAY), ct = docPhut(c.ct, KHOANG_NGAY), l = docPhut(c.l, KHOANG_LUOT);
    const g: GioiHan = { ngayThuong: tn ? nt.phut : gt.ngayThuong, cuoiTuan: tn ? ct.phut : gt.cuoiTuan, moiLuot: tl ? l.phut : gt.moiLuot };
    return { g, loi: (tn ? nt.loi ?? ct.loi : null) ?? (tl ? l.loi : null) };
  };
  const goNgay = (k: "nt" | "ct", s: string) => { const c = { ...chu, [k]: s }; setChu(c); const r = kiem(c, true, tuLuot); bao(r.g, r.loi); };
  const goLuot = (s: string) => { const c = { ...chu, l: s }; setChu(c); const r = kiem(c, tuNgay, true); bao(r.g, r.loi); };
  const chonNgay = (i: number) => { setTuNgay(false); const r = kiem(chu, false, tuLuot); bao({ ...r.g, ngayThuong: muc.ngay[i].ngay, cuoiTuan: muc.ngay[i].cuoiTuan }, r.loi); };
  const moTuNgay = () => {
    setTuNgay(true);
    const c = { ...chu, nt: gt.ngayThuong ? String(gt.ngayThuong) : "", ct: gt.cuoiTuan ? String(gt.cuoiTuan) : "" };
    setChu(c); const r = kiem(c, true, tuLuot); bao(r.g, r.loi);
  };
  const chonLuot = (n: number) => { setTuLuot(false); const r = kiem(chu, tuNgay, false); bao({ ...r.g, moiLuot: n }, r.loi); };
  const moTuLuot = () => { setTuLuot(true); const c = { ...chu, l: gt.moiLuot ? String(gt.moiLuot) : "" }; setChu(c); const r = kiem(c, tuNgay, true); bao(r.g, r.loi); };
  const cn = tuNgay ? "tu_chon" : chipNgay(gt, muc.ngay), cl = tuLuot ? "tu_chon" : chipLuot(gt, muc.luot);
  const theVang = { borderRadius: 30, backgroundColor: "#fdecc8", backgroundImage: "linear-gradient(160deg, #fff4dc, #fbe3b4)", padding: 16, gap: 12, ...KHOI.the };
  return (
    <>
      <View style={theVang}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#f7f6f3", alignItems: "center", justifyContent: "center", ...KHOI.nho }}><Icon3D ten="dongho" co={26} /></View>
          <Chu kieu="rat" co={15} mau={NAU} style={{ flex: 1 }}>Hết giờ, máy tự khoá</Chu>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
          {muc.ngay.map((x, i) => <Chip key={x.ngay} on={cn === i} tren={`${x.ngay}p`} duoi={`T7, CN ${x.cuoiTuan}p`}
            nhan={`Tối đa ${x.ngay} phút mỗi ngày, thứ Bảy Chủ nhật ${x.cuoiTuan} phút`} bam={() => chonNgay(i)} />)}
          <Chip on={cn === "tu_chon"} tren="Tự chọn" duoi={cn === "tu_chon" && (gt.ngayThuong || gt.cuoiTuan) ? `${gt.ngayThuong || "∞"}p · ${gt.cuoiTuan || "∞"}p` : undefined}
            nhan="Tự chọn giới hạn mỗi ngày" bam={moTuNgay} />
        </View>
        {cn === "tu_chon" ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <OPhut nhan="Thứ 2 – Thứ 6" chu={chu.nt} doi={(s) => goNgay("nt", s)} goiY="không giới hạn" />
            <OPhut nhan="T7, CN" chu={chu.ct} doi={(s) => goNgay("ct", s)} goiY="không giới hạn" />
          </View>
        ) : null}
      </View>
      <View style={theVang}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#f7f6f3", alignItems: "center", justifyContent: "center", ...KHOI.nho }}><Icon3D ten="game" co={26} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="rat" co={15} mau={NAU}>Mỗi lượt tối đa</Chu>
            <Chu kieu="dam7" co={12.5} mau={NAU}>Chơi đủ lượt thì máy nghỉ đúng chừng đó phút</Chu>
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
          {[...muc.luot, -1].map((n) => (
            <View key={n} style={{ width: "31%", flexGrow: 1 }}>
              {n < 0
                ? <Chip on={cl === "tu_chon"} tren="Tự chọn" duoi={cl === "tu_chon" && gt.moiLuot ? `${gt.moiLuot}p` : undefined} nhan="Tự chọn phút mỗi lượt" bam={moTuLuot} />
                : <Chip on={cl === n} tren={n ? `${n}p` : "Không giới hạn"} duoi={n ? `nghỉ ${n}p` : undefined}
                    nhan={n ? `Mỗi lượt tối đa ${n} phút rồi nghỉ ${n} phút` : "Mỗi lượt không giới hạn"} bam={() => chonLuot(n)} />}
            </View>
          ))}
        </View>
        {cl === "tu_chon" ? <OPhut nhan={`Mỗi lượt (${KHOANG_LUOT.min}–${KHOANG_LUOT.max} phút)`} chu={chu.l} doi={goLuot} goiY="ví dụ 20" /> : null}
      </View>
      {loi ? <Chu kieu="dam" co={13} mau={M.loi} style={{ marginHorizontal: 4 }}>{loi}</Chu> : null}
      <Chu kieu="dam" co={14} mau={M.chu2} style={{ marginHorizontal: 4 }}>{moTa && JSON.stringify(gt) === JSON.stringify(gt0) ? moTa : moTaGioiHan(gt)}</Chu>
    </>
  );
}
