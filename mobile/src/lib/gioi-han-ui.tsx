// «Giờ chơi» theo bàn bm1-ob-gio v21 (#306): hai thẻ kem — «Mỗi ngày chơi bao lâu?» (Thứ 2 – Thứ 6 · Thứ 7, Chủ nhật) và «Chơi liền bao lâu thì nghỉ?»
// (+ hình Chơi → Nghỉ → Chơi tiếp, ô tick «Không cần nghỉ»). Mỗi thời gian là ô số phút gõ trực tiếp + nút −/+ (15 phút/lần), dưới nhãn ghi quy ra tiếng.
// Dùng ở Lần đầu (thiet-lap/gio — có thêm thẻ vàng «Quà khởi đầu» ở màn) và hồ sơ Con (ho-so/[id]/gio-choi). Gửi máy chủ: gioiHanNgayThuong / gioiHanCuoiTuan / phutMoiLuot (0 = không giới hạn / không cần nghỉ).
import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { buocPhut, docPhut, GIOI_HAN_MD, KHOANG_LUOT, KHOANG_NGAY, LUOT_MD, quyRaTieng, type GioiHan } from "@/lib/gioi-han";
import { Chu, F, IconNet, M } from "@/lib/ui";
import { soNguyenGo } from "@/lib/so-nguyen";

const XANH = M.chinhInk;

/** Nút tròn −/+ dùng chung (Giờ chơi + thẻ «Quà khởi đầu»): `nen` màu nền, `co` cỡ dấu; `tat` ⇒ mờ + không bấm. */
export function NutTron({ dau, nhan, bam, tat, nen = M.nen, co = 20 }: { dau: "−" | "+"; nhan: string; bam: () => void; tat?: boolean; nen?: string; co?: number }) {
  return (
    <Pressable onPress={bam} disabled={tat} accessibilityRole="button" accessibilityLabel={nhan} hitSlop={4}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: nen, alignItems: "center", justifyContent: "center", opacity: tat ? 0.45 : 1, boxShadow: BONG.nho }}>
      <Chu kieu="rat" co={co} mau={XANH}>{dau}</Chu>
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
      <NutTron dau="−" nhan={`Bớt 15 phút · ${nhan}`} bam={tru} tat={mo} />
      <View style={{ width: 92, height: 48, borderRadius: 16, backgroundColor: M.the, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3,
        boxShadow: dang ? `0px 0px 0px 2.5px ${M.chinh}, ${BONG.lom}` : `0px 0px 0px 2px ${M.vien}, ${BONG.lom}` }}>
        <TextInput value={chu} onChangeText={doi} editable={!mo} keyboardType="number-pad" inputMode="numeric" maxLength={3} accessibilityLabel={nhanO} placeholder="…" placeholderTextColor={M.chu3}
          onFocus={() => setDang(true)} onBlur={() => setDang(false)} selectTextOnFocus
          style={{ width: 40, textAlign: "center", fontFamily: F.rat, fontSize: 22, color: XANH, padding: 0, outlineStyle: "none" } as never} />
        <Chu kieu="dam7" co={12.5} mau={M.chu3}>phút</Chu>
      </View>
      <NutTron dau="+" nhan={`Thêm 15 phút · ${nhan}`} bam={cong} tat={mo} />
    </View>
  );
}

const theKem = { borderRadius: 28, backgroundColor: M.the, paddingHorizontal: 16, paddingVertical: 14, gap: 10, ...KHOI.the };

function Hoi({ ic, chu }: { ic: "dongho" | "dong_ho_cat"; chu: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 2 }}>
      <IconNet ten={ic} co={24} mau={M.chinh} /><Chu kieu="rat" co={16} dong={1} style={{ flex: 1 }}>{chu}</Chu>
    </View>
  );
}

function BuocMinh({ ic, chu }: { ic: "game" | "khoa"; chu: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: M.the, alignItems: "center", justifyContent: "center", boxShadow: BONG.nho }}><IconNet ten={ic} co={18} mau={M.chinh} /></View>
      <Chu kieu="rat" co={12} mau={M.nut} dong={1}>{chu}</Chu>
    </View>
  );
}

/** `doi(gt, loi)`: loi ≠ null khi một ô đang sai (màn tắt nút Lưu / Tiếp). Ô ngày bắt buộc 10–720 (bàn v21 không có «không giới hạn»): Con cũ đang 0 ⇒ hiện 60 / 90 và ghi chú. */
export function ChonGioiHan({ gt, doi }: { gt: GioiHan; doi: (g: GioiHan, loi: string | null) => void }) {
  const cu0 = !gt.ngayThuong || !gt.cuoiTuan;
  const dau = { nt: String(gt.ngayThuong || GIOI_HAN_MD.ngayThuong), ct: String(gt.cuoiTuan || GIOI_HAN_MD.cuoiTuan), l: String(gt.moiLuot || LUOT_MD) };
  const [chu, setChu] = useState(dau);
  const [khongNghi, setKhongNghi] = useState(!gt.moiLuot);
  const [loi, setLoi] = useState<string | null>(null);
  // giá trị MỚI NHẤT (bấm − / + liên tiếp rất nhanh không mất bước: đọc từ ref, không từ state của lần vẽ trước)
  const cur = useRef({ chu: dau, kn: !gt.moiLuot });
  /** tính lại giới hạn từ các ô + ô tick, báo lên màn */
  const bao = (c: typeof chu, kn: boolean) => {
    const nt = docPhut(c.nt, KHOANG_NGAY, true), ct = docPhut(c.ct, KHOANG_NGAY, true), l = docPhut(c.l, KHOANG_LUOT);
    const loiLuot = kn ? null : !l.phut ? `Từ ${KHOANG_LUOT.min} đến ${KHOANG_LUOT.max} phút` : l.loi;
    const e = nt.loi ?? ct.loi ?? loiLuot;
    setLoi(e);
    doi({ ngayThuong: nt.phut, cuoiTuan: ct.phut, moiLuot: kn ? 0 : l.phut }, e);
  };
  // Con cũ không giới hạn ngày: ô đã đổi sang 60 / 90 ⇒ báo màn có thay đổi chờ lưu
  useEffect(() => { if (cu0) bao(cur.current.chu, cur.current.kn); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const dat = (c: typeof chu, kn: boolean) => { cur.current = { chu: c, kn }; setChu(c); setKhongNghi(kn); bao(c, kn); };
  const go = (k: "nt" | "ct" | "l", s: string) => dat({ ...cur.current.chu, [k]: soNguyenGo(s) }, cur.current.kn);
  const buoc = (k: "nt" | "ct" | "l", h: 1 | -1) => {
    const kh = k === "l" ? KHOANG_LUOT : KHOANG_NGAY;
    const n = buocPhut(docPhut(cur.current.chu[k], kh).phut, h, kh);
    go(k, String(n));
  };
  const tick = () => {
    const kn = !cur.current.kn;
    const c = cur.current.chu;
    // bỏ tick mà ô đang trống / 0 ⇒ quay về 30 phút
    dat(!kn && !docPhut(c.l, KHOANG_LUOT).phut ? { ...c, l: String(LUOT_MD) } : c, kn);
  };
  const phutL = docPhut(chu.l, KHOANG_LUOT).phut;
  const choi = khongNghi ? "…" : `${phutL || "…"} phút`;
  const quyNgay = (s: string) => { const p = docPhut(s, KHOANG_NGAY, true).phut; return p ? quyRaTieng(p) : "chưa nhập"; };
  return (
    <>
      <View style={theKem}>
        <Hoi ic="dongho" chu="Mỗi ngày chơi bao lâu?" />
        <DongPhut nhan="Thứ 2 – Thứ 6" quy={quyNgay(chu.nt)} chu={chu.nt} doi={(s) => go("nt", s)} nhanO="Số phút ngày thường"
          tru={() => buoc("nt", -1)} cong={() => buoc("nt", 1)} />
        <DongPhut nhan="Thứ 7, Chủ nhật" quy={quyNgay(chu.ct)} chu={chu.ct} doi={(s) => go("ct", s)} nhanO="Số phút cuối tuần"
          tru={() => buoc("ct", -1)} cong={() => buoc("ct", 1)} />
        {cu0 ? <Chu co={12.5} mau={M.chu2}>Trước đây chưa giới hạn giờ mỗi ngày — đang gợi ý 60 và 90 phút; bấm Lưu để áp dụng, chưa lưu thì hồ sơ con vẫn ghi «Không giới hạn».</Chu> : null}
      </View>
      <View style={theKem}>
        <Hoi ic="dong_ho_cat" chu="Chơi liền bao lâu thì nghỉ?" />
        <DongPhut nhan="Chơi liền" quy={khongNghi ? "không nghỉ" : phutL ? quyRaTieng(phutL) : "chưa nhập"} chu={chu.l} doi={(s) => go("l", s)} nhanO="Số phút mỗi lần chơi"
          tru={() => buoc("l", -1)} cong={() => buoc("l", 1)} mo={khongNghi} />
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 8, borderRadius: 18, backgroundColor: M.xamSoft,
          boxShadow: BONG.lom, opacity: khongNghi ? 0.4 : 1 }}>
          <BuocMinh ic="game" chu={`Chơi ${choi}`} />
          <Chu kieu="rat" co={18} mau={M.chinh} style={{ marginTop: 7 }}>→</Chu>
          <BuocMinh ic="khoa" chu={`Nghỉ ${choi}`} />
          <Chu kieu="rat" co={18} mau={M.chinh} style={{ marginTop: 7 }}>→</Chu>
          <BuocMinh ic="game" chu="Chơi tiếp" />
        </View>
        <Pressable onPress={tick} accessibilityRole="checkbox" accessibilityState={{ checked: khongNghi }} accessibilityLabel="Không cần nghỉ"
          style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingLeft: 2, alignSelf: "flex-start" }}>
          <View style={{ width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: khongNghi ? M.chinh : M.ranh,
            boxShadow: khongNghi ? BONG.ngoc : `0px 0px 0px 2px ${M.vien}, ${BONG.lom}` }}>
            {khongNghi ? <Chu kieu="rat" co={13} mau="#FFFBF5">✓</Chu> : null}
          </View>
          <Chu kieu="rat" co={12.5} mau={M.chu3}>Không cần nghỉ</Chu>
        </Pressable>
      </View>
      {loi ? <Chu kieu="dam" co={13} mau={M.loi} style={{ marginHorizontal: 4 }}>{loi}</Chu> : null}
    </>
  );
}
