// Sổ sao 15/11 (#263–#266 — máy chủ PR #269, docs/API.md «Sổ sao 15/11»): 1 sao = 1 phút «Tính phút», vay sao, số dư âm, cảnh báo nợ > 1.000.
// MỘT chỗ cho cách hiện sao của app Ba Mẹ (chốt 15/11):
//  • chưa nợ ⇒ «⭐ N sao» (viên vàng);
//  • đang nợ mà còn sao vay chưa tiêu ⇒ số chính «còn N sao = N phút chơi» (phutCon) + dòng «Đang nợ Ba Mẹ M sao»;
//  • tiêu hết ⇒ số âm «⭐ −M sao» viên cảnh báo (nền #ffe6d6, chữ #b34a06) + dòng «Đang nợ Ba Mẹ M sao · sao nhiệm vụ trả nợ trước».
// Bảng «Cho <Con> vay sao» (thiết kế them-6wjhze1d · them-y1r1eidm khi đang nợ > 1.000): 10 / 15 / 30 sao (mặc định 15), «Đang có … · vay xong sẽ nợ N sao»,
// dải nhắc nợ (không chặn) ⇒ POST con/:id/cho-vay hoặc yeu-cau/:id/dong-y {soSao}. Hoàn tác 60 giây: POST vay/:id/hoan-tac.
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { bm } from "./api";
import { BONG, HERO } from "./clay";
import { BangTruot, BaoLoi, Chu, Icon3D, M, Nut, useLam } from "./ui";

/** Trạng thái sao của một Con (máy chủ so-sao.ts › TrangThaiSao + tổng vay / đã trả). */
export type SaoCon = {
  /** số dư Con thấy — âm khi đang nợ */ sao: number;
  /** nợ Ba Mẹ còn lại */ no: number;
  /** sao tiêu được ngay = phút «Tính phút» còn chơi */ phutCon: number;
  saoVayChuaTieu?: number; hetSao?: boolean; /** nợ > 1.000 */ canhBaoNo?: boolean; tongVay?: number; daTraNo?: number;
};
/** Mốc cảnh báo nợ (máy chủ NGUONG_NO). */
export const NGUONG_NO = 1000;
export const MUC_VAY = [10, 15, 30] as const;
export const VAY_MAC_DINH = 15;
/** Sao tặng khởi đầu khi tạo hồ sơ Con (POST con / thiet-lap › saoKhoiDau): số nguyên 0…200, nút −/+ bước 10, mặc định 30 (#306). */
export { doiSaoKhoiDau, SAO_KHOI_DAU_BUOC, SAO_KHOI_DAU_MD, SAO_KHOI_DAU_TOI_DA } from "./sao-khoi-dau";

/** Số kiểu Việt: 1.020 · âm dùng dấu trừ thật «−» (U+2212). */
export const soVN = (n: number | null | undefined) => {
  const x = Math.round(Number(n ?? 0));
  return `${x < 0 ? "−" : ""}${String(Math.abs(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

/** Trạng thái sao từ một bản ghi Con (gia-dinh › con[], con/:id, vi) — máy chủ cũ không gửi `sao`/`no` ⇒ dựng từ `soDu` (không nợ). */
export function saoTu(x: Partial<SaoCon> & { soDu?: number | null } | null | undefined): SaoCon {
  const sao = x?.sao ?? x?.soDu ?? 0, no = Math.max(0, x?.no ?? 0);
  const phutCon = x?.phutCon ?? Math.max(0, sao + no);
  return { sao, no, phutCon, saoVayChuaTieu: x?.saoVayChuaTieu ?? Math.min(phutCon, no), hetSao: x?.hetSao ?? phutCon <= 0,
    canhBaoNo: x?.canhBaoNo ?? no > NGUONG_NO, tongVay: x?.tongVay, daTraNo: x?.daTraNo };
}

/** «thuong» chưa nợ · «vay» đang nợ, còn sao vay chưa tiêu · «am» tiêu hết, số âm. */
export type KieuSao = "thuong" | "vay" | "am";
export const kieuSao = (s: SaoCon): KieuSao => (s.no <= 0 ? "thuong" : s.phutCon > 0 ? "vay" : "am");

/** Chữ chính: «30 sao» · «còn 10 sao = 10 phút chơi» · «−20 sao». */
export function soChinh(s: SaoCon) {
  const k = kieuSao(s);
  return k === "vay" ? `còn ${soVN(s.phutCon)} sao = ${soVN(s.phutCon)} phút chơi` : `${soVN(k === "thuong" ? s.sao : -s.no)} sao`;
}
/** Dòng nợ: «Đang nợ Ba Mẹ 20 sao» (còn sao vay) / «… · sao nhiệm vụ trả nợ trước» (tiêu hết). Không nợ ⇒ null. */
export function cauNo(s: SaoCon) {
  const k = kieuSao(s);
  return k === "thuong" ? null : `Đang nợ Ba Mẹ ${soVN(s.no)} sao${k === "am" ? " · sao nhiệm vụ trả nợ trước" : ""}`;
}
/** Chữ viên nhỏ (dải avatar, danh sách): số dư Con thấy — còn sao vay chưa tiêu thì hiện số sao tiêu được. */
export const chuVien = (s: SaoCon) => `${soVN(kieuSao(s) === "vay" ? s.phutCon : kieuSao(s) === "am" ? -s.no : s.sao)} sao`;

const VANG = { nen: M.diemSoft, chu: M.diemInk }, CANH = { nen: M.canhSoft, chu: M.canh };
export const MAU_NO = CANH;

/** Viên sao nhỏ (thiết kế .be .diem / .diem.no): vàng khi còn sao, cảnh báo khi số âm. `n` (tuỳ chọn) = số thay cho trạng thái — viên «−39 sao». */
export function VienSao({ s, n, nho, chu }: { s?: SaoCon; n?: number; nho?: boolean; chu?: string }) {
  const am = n !== undefined ? n < 0 : s ? kieuSao(s) === "am" : false;
  const m = am ? CANH : VANG;
  const nhan = chu ?? (n !== undefined ? `${soVN(n)} sao` : s ? chuVien(s) : "");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "center", paddingVertical: nho ? 2 : 4, paddingLeft: nho ? 4 : 5, paddingRight: nho ? 7 : 9,
      borderRadius: 12, backgroundColor: m.nen }} accessible accessibilityLabel={nhan}>
      <Icon3D ten="sao" co={nho ? 13 : 16} />
      <Chu kieu="rat" co={nho ? 11.5 : 13} mau={m.chu} so dong={1}>{nhan}</Chu>
    </View>
  );
}

/** Số sao lớn ở thẻ con (Trang chủ bm2-trang-chu, Hồ sơ con): viên «⭐ 30 sao» / «⭐ −20 sao» (26/800) hoặc «còn N sao = N phút chơi» + dòng nợ. */
export function SoSaoLon({ s, co = 26, bamNo, toi }: { s: SaoCon; co?: number; bamNo?: () => void;
  /** nằm trên thẻ hero navy: số sao vàng mật HERO.phu (kể cả `vay`, còn sao tiêu được), CHỈ `am` (nợ, số âm) và dòng «Đang nợ …» cam san hô M.noHero; viên `am` nền trắng mờ 10% */ toi?: boolean }) {
  const k = kieuSao(s), m = toi ? { nen: HERO.vien, chu: HERO.chu } : k === "am" ? CANH : VANG, no = cauNo(s), mauNo = toi ? M.noHero : CANH.chu;
  return (
    <View style={{ gap: 6, alignItems: "flex-start" }}>
      {k === "vay" ? (
        <Chu kieu="tieu7" co={co} so mau={toi ? HERO.phu : undefined} style={{ letterSpacing: -0.6 }}>{soChinh(s)}</Chu>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingLeft: 8, paddingRight: 14, borderRadius: 20, backgroundColor: m.nen,
          boxShadow: toi ? undefined : k === "am" ? "inset 0px 1.5px 0px #fff, inset 0px -4px 8px -4px rgba(138,60,12,.18)" : "inset 0px 1.5px 0px #fff, inset 0px -4px 8px -4px rgba(110,67,0,.16)" }}
          accessible accessibilityLabel={soChinh(s)}>
          <Icon3D ten="sao" co={co} />
          {/* «Ánh kim»: số sao đúc Fraunces; trên hero navy là vàng (mẫu E `.am`) */}
          <Chu kieu="tieu7" co={co} mau={toi ? (k === "am" ? M.noHero : HERO.phu) : m.chu} so style={{ letterSpacing: -1 }}>{soChinh(s)}</Chu>
        </View>
      )}
      {no ? (
        bamNo ? (
          <Pressable onPress={bamNo} accessibilityRole="button" hitSlop={6} style={{ minHeight: 32, justifyContent: "center", alignSelf: "stretch" }}>
            <Chu kieu="rat" co={13} mau={mauNo}>{`${no} ›`}</Chu>
          </Pressable>
        ) : <Chu kieu="rat" co={13} mau={mauNo}>{no}</Chu>
      ) : null}
    </View>
  );
}

/** Dải nhắc / cảnh báo nợ (nền #ffe6d6, chữ #b34a06, icon cảnh báo): «Bảo Anh đã nợ quá 1.000 sao (đang nợ 1.020)». */
export function DaiNhacNo({ chu, phu }: { chu: string; phu?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22, backgroundColor: CANH.nen,
      boxShadow: "inset 0px 1.5px 0px #fff, 0px 8px 16px -12px rgba(138,60,12,.4)" }} accessibilityRole="alert">
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#fdf3e8", alignItems: "center", justifyContent: "center" }}><Icon3D ten="canh_bao" co={26} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={14} mau={CANH.chu}>{chu}</Chu>
        {phu ? <Chu kieu="dam" co={12.5} mau={CANH.chu}>{phu}</Chu> : null}
      </View>
    </View>
  );
}
/** «Bảo Anh đã nợ quá 1.000 sao (đang nợ 1.020)» khi đang nợ > 1.000, không thì null. */
export const cauNhacNo = (ten: string, no: number) => (no > NGUONG_NO ? `${ten} đã nợ quá ${soVN(NGUONG_NO)} sao (đang nợ ${soVN(no)})` : null);

/** GET con/:id/cho-vay/xem-truoc */
export type XemTruocVay = SaoCon & { ten: string; soSao: number; mucVay?: number[]; macDinh?: number; noSau: number; cau?: string; nhacNo: string | null; seCanhBao?: boolean };
/** POST con/:id/cho-vay — `id` = khoản vay (Hoàn tác). */
export type KqVay = SaoCon & { id: string; soSao: number; canhBaoNo: { cau: string; no: number; vuotMoc: boolean } | null };

/** Hoàn tác cho vay (60 giây, đúng người cho; 409 het_hoan_tac / da_tieu). */
export const hoanTacVay = (id: string) => bm.goi<SaoCon & { ok: boolean; soSaoHoan: number; tron: boolean }>(`vay/${id}/hoan-tac`, {});

/** Bảng trượt «Cho <Con> vay sao». `yeuCau` (lời xin vay của Con) ⇒ đồng ý lời xin với số sao đã chọn; không có ⇒ Ba Mẹ chủ động cho vay.
 *  `soSao` = số chọn sẵn (lời xin của Con) — không thuộc 10/15/30 thì thêm ô đó. `xong(kq)` sau khi cho vay (bảng đã đóng). */
export function BangChoVay({ mo, dong, con, ten, soSao, yeuCau, mucDich, quaId, xong }: {
  mo: boolean; dong: () => void; con: string; ten: string; soSao?: number | null; yeuCau?: string | null; mucDich?: "choi" | "qua"; quaId?: string | null;
  xong: (kq: { id: string; soSao: number; sau: SaoCon; truoc: SaoCon | null; canhBao: string | null }) => void;
}) {
  const muc = [...new Set([...MUC_VAY, ...(soSao && soSao > 0 ? [soSao] : [])])].sort((a, b) => a - b);
  const macDinh = soSao && soSao > 0 ? soSao : VAY_MAC_DINH;
  // số Ba Mẹ đã bấm chọn (null = mặc định); đóng bảng ⇒ về mặc định cho lần mở sau
  const [chonTay, setChonTay] = useState<number | null>(null);
  const chon = chonTay ?? macDinh, setChon = setChonTay;
  const [xt, setXt] = useState<XemTruocVay | null>(null);
  const { lam, loi, dangChay } = useLam();
  const dongBang = () => { setChonTay(null); dong(); };
  // mở bảng ⇒ đọc «đang có / đang nợ» mới nhất (máy chủ cũ không có đường này ⇒ bỏ dòng «Đang có»)
  useEffect(() => {
    if (!mo) return;
    let huy = false;
    bm.goi<XemTruocVay>(`con/${con}/cho-vay/xem-truoc?soSao=${macDinh}`).then((x) => { if (!huy) setXt(x); }, () => { if (!huy) setXt(null); });
    return () => { huy = true; };
  }, [mo, con, macDinh]);
  const s = xt ? saoTu(xt) : null;
  const noSau = s ? s.no + chon : null;
  const nhac = xt ? xt.nhacNo ?? cauNhacNo(ten, xt.no) : null;
  const cho = () => lam(async () => {
    const truoc = s;
    let id: string, sau: SaoCon, canh: string | null = null;
    if (yeuCau) {
      const r = await bm.goi<{ grantId?: string; vay?: KqVay }>(`yeu-cau/${yeuCau}/dong-y`, { soSao: chon });
      id = r.grantId ?? r.vay?.id ?? "";
      sau = r.vay ? saoTu(r.vay) : saoTu(truoc ? { sao: truoc.sao, no: truoc.no + chon, phutCon: truoc.phutCon + chon } : { sao: 0, no: chon, phutCon: chon });
      canh = r.vay?.canhBaoNo?.cau ?? null;
    } else {
      const r = await bm.goi<KqVay>(`con/${con}/cho-vay`, { soSao: chon, ...(mucDich ? { mucDich } : {}), ...(quaId ? { quaId } : {}) });
      id = r.id; sau = saoTu(r); canh = r.canhBaoNo?.cau ?? null;
    }
    dongBang();
    xong({ id, soSao: chon, sau, truoc, canhBao: canh });
  });
  return (
    <BangTruot mo={mo} dong={dongBang} tieu={`Cho ${ten} vay sao`} hinh="sao">
      <Chu kieu="dam" co={15} mau={M.chu2} style={{ textAlign: "center", marginTop: -4 }}>{`= ${soVN(chon)} phút chơi hoặc đổi quà\nSao nhiệm vụ của con sẽ trả nợ trước`}</Chu>
      {/* thiết kế .chon: ô lõm cao 76 — số 28/800 + «sao»; ô chọn ngọc */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }} accessibilityRole="radiogroup">
        {muc.map((x) => {
          const on = x === chon;
          return (
            <Pressable key={x} onPress={() => setChon(x)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${x} sao`}
              style={[{ flex: 1, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center" },
                on ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.xamSoft, boxShadow: BONG.lom }]}>
              <Chu kieu="tieu7" co={28} so mau={on ? M.diem : M.chu} style={{ lineHeight: 30 }}>{String(x)}</Chu>
              <Chu kieu="dam7" co={12.5} mau={on ? M.chinhSoft : M.chu3}>sao</Chu>
            </Pressable>
          );
        })}
      </View>
      {s && noSau !== null ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
          <Chu kieu="dam" co={13} mau={M.chu3}>Đang có</Chu>
          <VienSao s={s} />
          <Chu kieu="dam" co={13} mau={M.chu3}>· vay xong</Chu>
          <Chu kieu="rat" co={13} mau={CANH.chu}>{`sẽ nợ ${soVN(noSau)} sao`}</Chu>
        </View>
      ) : null}
      {nhac ? <DaiNhacNo chu={nhac} phu="Chỉ nhắc thôi · Ba Mẹ vẫn cho vay được" /> : null}
      <BaoLoi loi={loi} />
      <Nut chu={`Cho ${ten} vay ${soVN(chon)} sao`} rong dangChay={dangChay} bam={cho} />
      <Nut chu="Thôi" loai="vien" rong bam={dongBang} />
    </BangTruot>
  );
}

/** Mở màn kết quả «Đã cho <Con> vay N sao» (thiết kế them-3wp5ty1o) với «Hoàn tác». */
export function thamSoXongVay(k: { ten: string; con: string; id: string; soSao: number; sau: SaoCon; truoc: SaoCon | null; canhBao: string | null; may?: string | null }) {
  return {
    kieu: "vay", ten: k.ten, con: k.con, phut: String(k.soSao), grant: k.id, no: String(k.sau.no), sao: String(k.sau.sao), phutCon: String(k.sau.phutCon),
    ...(k.truoc ? { noTruoc: String(k.truoc.no) } : {}), ...(k.canhBao ? { canh: k.canhBao } : {}), ...(k.may ? { may: k.may } : {}),
  };
}

/** Sao kiếm được trả nợ lần lượt: với nợ `no` và các khoản `ds` (theo thứ tự), mỗi khoản trả bao nhiêu + nợ còn sau khoản đó. */
export function traNoLanLuot(no: number, ds: number[]) {
  return ds.reduce<{ tra: number; conNo: number }[]>((kq, s) => {
    const con = kq.length ? kq[kq.length - 1].conNo : Math.max(0, no);
    const tra = Math.min(s, con);
    return [...kq, { tra, conNo: con - tra }];
  }, []);
}
