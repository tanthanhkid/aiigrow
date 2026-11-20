// Thành phần DÙNG CHUNG theo «Quy tắc chung» của issue #492 (Bàn 20/11) — chỉ viết ở đây, các màn khác import:
//  · HangChonBe  — hàng chọn bé: ảnh tròn chữ cái + chip sao dưới tên (bé nợ ⇒ «−20 sao» chữ đỏ #A2412C trên chip lõm kem); tuỳ chọn «Tất cả».
//  · ChipNo — chip sao khi nợ (= so-sao › VienSao).
//  · HoiLai      — hộp hỏi lại (xoá / gỡ / rời): nút phụ luôn «Giữ lại», nút đỏ nêu rõ đối tượng.
//  · ChipMuc     — hàng chip chọn mức (sao, giờ khoá) luôn có «Tự chọn…» (nhập số).
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { BONG, KHOI } from "./clay";
import { saoTu, VienSao } from "./so-sao";
import { DaiCon } from "./ui-viec";
import { BangTruot, BaoLoi, Chu, Icon, Icon3D, M, Nut, ONhap, Rob, type LinhVat, type TenIcon } from "./ui";

/** Chip sao dưới tên bé: «⭐ 35 sao» vàng; nợ ⇒ «−20 sao» chữ đỏ #A2412C trên chip lõm kem (vẽ ở so-sao › VienSao). `n` = số sao (âm = nợ) hoặc `s` = trạng thái đầy đủ. */
export function ChipNo(p: Parameters<typeof VienSao>[0]) { return <VienSao {...p} />; }

type Be = { id: string; ten: string; avatar?: string | null; sao?: number; soDu?: number | null; no?: number; phutCon?: number; yeuCauCho?: number };

/**
 * Hàng chọn bé (Bàn: ảnh tròn chữ cái A/M/N/K + chip sao dưới tên). Thay mọi kiểu pill «Tất cả / Bảo Anh / …».
 * `chon` = id bé đang chọn (null/"" khi chọn «Tất cả»); `tatCa` = hiện ô «Tất cả» đầu hàng (bấm ⇒ doi(null)).
 */
export function HangChonBe<T extends Be>({ ds, chon, doi, tatCa, them, so, ic, nhanSo, tenNgan }: {
  ds: T[]; chon: string | null | undefined; doi: (c: T | null) => void; tatCa?: boolean; them?: () => void;
  so?: Record<string, number>; ic?: Record<string, TenIcon | null>; nhanSo?: string; /** rút tên còn 2 từ cuối */ tenNgan?: boolean;
}) {
  const rut = (t: string) => (tenNgan ? t.trim().split(/\s+/).slice(-2).join(" ") : t);
  const mucDo = Object.fromEntries(ds.map((x) => [x.id, <ChipNo key={x.id} s={saoTu(x)} />]));
  const dsHien = ds.map((x) => ({ ...x, ten: rut(x.ten) }));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }} accessibilityRole="tablist">
      {tatCa ? (
        <Pressable onPress={() => doi(null)} accessibilityRole="tab" accessibilityState={{ selected: !chon }} accessibilityLabel="Tất cả" style={{ width: 72, alignItems: "center", gap: 5, paddingVertical: 6 }}>
          <View style={[{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: M.nut, borderWidth: 3, borderColor: !chon ? M.dauSach : "transparent" }]}>
            <Icon3D ten="nha" co={24} />
          </View>
          <Chu kieu={!chon ? "den" : "rat"} co={13} mau={!chon ? M.chinhInk : M.chu2} dong={1}>Tất cả</Chu>
        </Pressable>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <DaiCon ds={dsHien} chon={chon} doi={(x) => doi(ds.find((d) => d.id === x.id) ?? null)} duoi={mucDo} so={so} ic={ic} nhanSo={nhanSo} them={them} />
      </View>
    </View>
  );
}

/**
 * Hộp hỏi lại (Bàn: Grow, tiêu đề «Xoá quà Đi ăn kem?», câu giải thích, thẻ đối tượng, nút đỏ nêu đối tượng, «Giữ lại»).
 * `nutDo` PHẢI nêu đối tượng («Xoá quà Đi ăn kem», «Gỡ máy iPad», «Rời nhà của 4 con»); nút phụ luôn «Giữ lại».
 */
export function HoiLai({ mo, dong, tieu, phu, the, nutDo, lamDo, dangChay, loi, lv = "chi", children }: {
  mo: boolean; dong: () => void; tieu: string; phu?: string; /** thẻ đối tượng dưới câu giải thích */ the?: ReactNode;
  nutDo: string; lamDo: () => void; dangChay?: boolean; loi?: string | null; lv?: LinhVat; children?: ReactNode;
}) {
  return (
    <BangTruot mo={mo} dong={dong} tieu={tieu} giua dauBang={<View style={{ alignItems: "center" }}><Rob ten={lv} co={110} /></View>}>
      {phu ? <Chu kieu="dam" co={14.5} mau={M.chu2} style={{ textAlign: "center", marginTop: -4 }}>{phu}</Chu> : null}
      {the ? <View style={[{ padding: 12, borderRadius: 22, backgroundColor: M.the }, KHOI.nho]}>{the}</View> : null}
      {children}
      <BaoLoi loi={loi} />
      <Nut chu={nutDo} loai="do" rong dangChay={dangChay} bam={lamDo} />
      <Nut chu="Giữ lại" loai="vien" rong bam={dong} />
    </BangTruot>
  );
}

/**
 * Chip chọn mức (sao 10·15·30, giờ khoá …) + «Tự chọn…»: bấm ⇒ ô nhập số. `gia` = mức đang chọn (null chưa chọn); số ngoài danh sách hiện ở ô «Tự chọn · N».
 * `donVi` hiện dưới số («sao», «phút»); `toiDa` chặn số nhập.
 */
export function ChipMuc({ muc, gia, doi, donVi = "sao", toiDa = 999, nhanTuChon = "Tự chọn…" }: {
  muc: number[]; gia: number | null; doi: (n: number) => void; donVi?: string; toiDa?: number; nhanTuChon?: string;
}) {
  const [nhap, setNhap] = useState(false);
  const [chu, setChu] = useState("");
  const ngoai = gia !== null && !muc.includes(gia);
  const xong = () => { const n = parseInt(chu, 10); if (n > 0) doi(Math.min(n, toiDa)); setNhap(false); setChu(""); };
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
        {muc.map((x) => {
          const on = x === gia;
          return (
            <Pressable key={x} onPress={() => { setNhap(false); doi(x); }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${x} ${donVi}`}
              style={[{ flex: 1, minHeight: 64, borderRadius: 22, alignItems: "center", justifyContent: "center" }, on ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.xamSoft, boxShadow: BONG.lom }]}>
              <Chu kieu="tieu7" co={24} so mau={on ? M.diem : M.chu} style={{ lineHeight: 26 }}>{String(x)}</Chu>
              <Chu kieu="dam7" co={12} mau={on ? M.chinhSoft : M.chu3}>{donVi}</Chu>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setNhap((v) => !v)} accessibilityRole="radio" accessibilityState={{ checked: ngoai || nhap }} accessibilityLabel={nhanTuChon}
          style={[{ flex: 1.2, minHeight: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 6 },
            ngoai || nhap ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.xamSoft, boxShadow: BONG.lom }]}>
          {ngoai ? <Chu kieu="tieu7" co={24} so mau={M.diem} style={{ lineHeight: 26 }}>{String(gia)}</Chu> : <Icon ten="but" mau={nhap ? "#FFFBF5" : M.chu} co={16} />}
          <Chu kieu="rat" co={12.5} mau={ngoai || nhap ? "#FFFBF5" : M.chu} dong={1}>{ngoai ? donVi : nhanTuChon}</Chu>
        </Pressable>
      </View>
      {nhap ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <ONhap nhan={`Số ${donVi}`} value={chu} onChangeText={(t) => setChu(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder={`Số ${donVi}`} onSubmitEditing={xong} autoFocus />
          </View>
          <Nut chu="Chọn" nho bam={xong} tat={!(parseInt(chu, 10) > 0)} />
        </View>
      ) : null}
    </View>
  );
}
