// «Giờ chơi» theo bàn bm1-ob-gio v21 (#306): hai thẻ kem — «Mỗi ngày chơi bao lâu?» (Thứ 2 – Thứ 6 · Thứ 7, Chủ nhật) và «Chơi liền bao lâu thì nghỉ?»
// (+ hình Chơi → Nghỉ → Chơi tiếp, ô tick «Không cần nghỉ»). Mỗi thời gian là ô số phút gõ trực tiếp + nút −/+ (15 phút/lần), dưới nhãn ghi quy ra tiếng.
// Dùng ở Lần đầu (thiet-lap/gio — có thêm thẻ vàng «Quà khởi đầu» ở màn) và hồ sơ Con (ho-so/[id]/gio-choi). Gửi máy chủ: gioiHanNgayThuong / gioiHanCuoiTuan / phutMoiLuot (0 = không giới hạn / không cần nghỉ).
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { buocPhut, docPhut, KHOANG_LUOT, KHOANG_NGAY, LUOT_MD, quyRaTieng, type GioiHan } from "@/lib/gioi-han";
import { Chu, F, Icon3D, M } from "@/lib/ui";

const XANH = "#0a5246";

function NutTang({ dau, nhan, bam, tat }: { dau: "−" | "+"; nhan: string; bam: () => void; tat?: boolean }) {
  return (
    <Pressable onPress={bam} disabled={tat} accessibilityRole="button" accessibilityLabel={nhan} hitSlop={4}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", boxShadow: BONG.nho }}>
      <Chu kieu="rat" co={20} mau={XANH}>{dau}</Chu>
    </Pressable>
  );
}

/** Một dòng: nhãn + «= quy ra tiếng» ở trái; − [ô số phút] + ở phải. */
function DongPhut({ nhan, quy, chu, doi, nhanO, tru, cong, mo }: { nhan: string; quy: string; chu: string; doi: (s: string) => void; nhanO: string;
  tru: () => void; cong: () => void; mo?: boolean }) {
  const [dang, setDang] = useState(false);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, opacity: mo ? 0.4 : 1 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={14.5} dong={1}>{nhan}</Chu>
        <Chu kieu="rat" co={12} mau={XANH} dong={1}>{`= ${quy}`}</Chu>
      </View>
      <NutTang dau="−" nhan={`Bớt 15 phút · ${nhan}`} bam={tru} tat={mo} />
      <View style={{ width: 92, height: 48, borderRadius: 16, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3,
        boxShadow: dang ? `0px 0px 0px 2.5px ${M.chinh}, ${BONG.lom}` : `0px 0px 0px 2px #cfe5de, ${BONG.lom}` }}>
        <TextInput value={chu} onChangeText={doi} editable={!mo} keyboardType="number-pad" inputMode="numeric" maxLength={3} accessibilityLabel={nhanO} placeholder="∞" placeholderTextColor={M.chu3}
          onFocus={() => setDang(true)} onBlur={() => setDang(false)} selectTextOnFocus
          style={{ width: 40, textAlign: "center", fontFamily: F.rat, fontSize: 22, color: XANH, padding: 0, outlineStyle: "none" } as never} />
        <Chu kieu="dam7" co={12.5} mau="#565c59">phút</Chu>
      </View>
      <NutTang dau="+" nhan={`Thêm 15 phút · ${nhan}`} bam={cong} tat={mo} />
    </View>
  );
}

const theKem = { borderRadius: 28, backgroundColor: "#f7f6f3", paddingHorizontal: 16, paddingVertical: 14, gap: 10, ...KHOI.the };

function Hoi({ ic, chu }: { ic: "dongho" | "dong_ho_cat"; chu: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 2 }}>
      <Icon3D ten={ic} co={28} /><Chu kieu="rat" co={16} dong={1} style={{ flex: 1 }}>{chu}</Chu>
    </View>
  );
}

function BuocMinh({ ic, chu }: { ic: "game" | "khoa"; chu: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", boxShadow: BONG.nho }}><Icon3D ten={ic} co={21} /></View>
      <Chu kieu="rat" co={12} mau="#2b302e" dong={1}>{chu}</Chu>
    </View>
  );
}

/** `doi(gt, loi)`: loi ≠ null khi một ô đang sai (màn tắt nút Lưu / Tiếp). */
export function ChonGioiHan({ gt, doi }: { gt: GioiHan; doi: (g: GioiHan, loi: string | null) => void }) {
  const [chu, setChu] = useState({ nt: gt.ngayThuong ? String(gt.ngayThuong) : "", ct: gt.cuoiTuan ? String(gt.cuoiTuan) : "", l: String(gt.moiLuot || LUOT_MD) });
  const [khongNghi, setKhongNghi] = useState(!gt.moiLuot);
  const [loi, setLoi] = useState<string | null>(null);
  /** tính lại giới hạn từ các ô + ô tick, báo lên màn */
  const bao = (c: typeof chu, kn: boolean) => {
    const nt = docPhut(c.nt, KHOANG_NGAY), ct = docPhut(c.ct, KHOANG_NGAY), l = docPhut(c.l, KHOANG_LUOT);
    const loiLuot = kn ? null : !l.phut ? `Từ ${KHOANG_LUOT.min} đến ${KHOANG_LUOT.max} phút` : l.loi;
    const e = nt.loi ?? ct.loi ?? loiLuot;
    setLoi(e);
    doi({ ngayThuong: nt.phut, cuoiTuan: ct.phut, moiLuot: kn ? 0 : l.phut }, e);
  };
  const go = (k: "nt" | "ct" | "l", s: string) => { const c = { ...chu, [k]: s.replace(/\D/g, "") }; setChu(c); bao(c, khongNghi); };
  const buoc = (k: "nt" | "ct" | "l", h: 1 | -1) => {
    const n = buocPhut(docPhut(chu[k], k === "l" ? KHOANG_LUOT : KHOANG_NGAY).phut, h, k === "l" ? KHOANG_LUOT : KHOANG_NGAY);
    go(k, n ? String(n) : "");
  };
  const tick = () => {
    const kn = !khongNghi;
    setKhongNghi(kn);
    // bỏ tick mà ô đang trống / 0 ⇒ quay về 30 phút
    const c = !kn && !docPhut(chu.l, KHOANG_LUOT).phut ? { ...chu, l: String(LUOT_MD) } : chu;
    setChu(c); bao(c, kn);
  };
  const phutL = docPhut(chu.l, KHOANG_LUOT).phut;
  const choi = khongNghi ? "…" : `${phutL || "…"} phút`;
  return (
    <>
      <View style={theKem}>
        <Hoi ic="dongho" chu="Mỗi ngày chơi bao lâu?" />
        <DongPhut nhan="Thứ 2 – Thứ 6" quy={quyRaTieng(docPhut(chu.nt, KHOANG_NGAY).phut)} chu={chu.nt} doi={(s) => go("nt", s)} nhanO="Số phút ngày thường"
          tru={() => buoc("nt", -1)} cong={() => buoc("nt", 1)} />
        <DongPhut nhan="Thứ 7, Chủ nhật" quy={quyRaTieng(docPhut(chu.ct, KHOANG_NGAY).phut)} chu={chu.ct} doi={(s) => go("ct", s)} nhanO="Số phút cuối tuần"
          tru={() => buoc("ct", -1)} cong={() => buoc("ct", 1)} />
      </View>
      <View style={theKem}>
        <Hoi ic="dong_ho_cat" chu="Chơi liền bao lâu thì nghỉ?" />
        <DongPhut nhan="Chơi liền" quy={quyRaTieng(khongNghi ? 0 : phutL).replace("không giới hạn", "không nghỉ")} chu={chu.l} doi={(s) => go("l", s)} nhanO="Số phút mỗi lần chơi"
          tru={() => buoc("l", -1)} cong={() => buoc("l", 1)} mo={khongNghi} />
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 8, borderRadius: 18, backgroundColor: "#efeeea",
          boxShadow: BONG.lom, opacity: khongNghi ? 0.4 : 1 }}>
          <BuocMinh ic="game" chu={`Chơi ${choi}`} />
          <Chu kieu="rat" co={18} mau={M.chinh} style={{ marginTop: 7 }}>→</Chu>
          <BuocMinh ic="khoa" chu={`Nghỉ ${choi}`} />
          <Chu kieu="rat" co={18} mau={M.chinh} style={{ marginTop: 7 }}>→</Chu>
          <BuocMinh ic="game" chu="Chơi tiếp" />
        </View>
        <Pressable onPress={tick} accessibilityRole="checkbox" accessibilityState={{ checked: khongNghi }} accessibilityLabel="Không cần nghỉ"
          style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingLeft: 2, alignSelf: "flex-start" }}>
          <View style={{ width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: khongNghi ? M.chinh : "#fff",
            boxShadow: khongNghi ? BONG.ngoc : `0px 0px 0px 2px #c9ccc9, ${BONG.lom}` }}>
            {khongNghi ? <Chu kieu="rat" co={13} mau="#fff">✓</Chu> : null}
          </View>
          <Chu kieu="rat" co={12.5} mau="#565c59">Không cần nghỉ</Chu>
        </Pressable>
      </View>
      {loi ? <Chu kieu="dam" co={13} mau={M.loi} style={{ marginHorizontal: 4 }}>{loi}</Chu> : null}
    </>
  );
}
