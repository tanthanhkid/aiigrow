// Mảnh giao diện MỚI của thiết kế chốt 06/11 (thanh bước 5 chấm, ô PIN 4 số, dòng quà, ô mã mở máy) — chỉ THÊM, không đổi thành phần cũ.
// Màu / bóng / men lấy token Clay (mau.ts, clay.ts), không chép CSS thô của HTML thiết kế.
import { useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Pressable, TextInput, View } from "react-native";
import { BONG, KHOI } from "./clay";
import { locPin, icQua, phuQua, type QuaS3 } from "./s3";
import { Chu, Icon, Icon3D, M, Nhan, NhanMen, type TenIcon } from "./ui";

// ---------------------------------------------------------------- thanh 5 bước Lần đầu (Con → Nhiệm vụ → Quà → Giờ → Máy)

const BUOC5: { ic: TenIcon; ten: string }[] = [
  { ic: "nguoi", ten: "Con" }, { ic: "sao", ten: "Nhiệm vụ" }, { ic: "qua", ten: "Quà" }, { ic: "dongho", ten: "Giờ" }, { ic: "may_tinh", ten: "Máy" },
];
/** Thanh tiến độ 5 chấm (bm1-ob-ten-con … them-z8femhpg, 06/11): bước xong có tick, bước đang làm viền ngọc. */
export function ThanhBuoc5({ dang, ic }: { dang: number; /** đổi icon bước đang làm (vd «khien» ở màn Chọn app) */ ic?: TenIcon }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="progressbar" accessibilityLabel={`Bước ${dang + 1} trên 5: ${BUOC5[dang]?.ten ?? ""}`}>
      {BUOC5.map((b, i) => (
        <View key={b.ten} style={[{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
          i === dang ? { backgroundColor: "#dcebe6", boxShadow: `0px 0px 0px 2.5px ${M.chinh}, ${BONG.nho}` } : { backgroundColor: "#e6e5e1", boxShadow: BONG.lom }]}>
          <View style={{ opacity: i <= dang ? 1 : 0.45 }}><Icon3D ten={i < dang ? "tick" : i === dang && ic ? ic : b.ic} co={19} /></View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- ô PIN 4 số

/**
 * 4 ô lõm (thiết kế .o4): ô đã có số / ô đang gõ viền ngọc. Một TextInput trong suốt phủ lên cả hàng nhận bàn phím số (dán được cả 4 số).
 * `an` ⇒ hiện «•» thay số (PIN đang dùng / Ẩn-Hiện). Không `doi` ⇒ chỉ hiển thị.
 */
export function OPin({ gia, doi, an, nhan, tuDong }: { gia: string; doi?: (v: string) => void; an?: boolean; nhan: string; tuDong?: boolean }) {
  const o = useRef<ComponentRef<typeof TextInput>>(null);
  const [focus, setFocus] = useState(false);
  return (
    <Pressable onPress={() => o.current?.focus()} disabled={!doi} accessibilityLabel={nhan} style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
      {[0, 1, 2, 3].map((i) => {
        const so = gia[i];
        const dang = !!doi && focus && (i === gia.length || (gia.length === 4 && i === 3));
        return (
          // thiết kế 14/11 (.o4 / PIN của con): ô LÕM xám bo 20 cả khi đã có số; ô đang gõ viền ngọc
          <View key={i} style={{ flex: 1, maxWidth: 84, height: 58, borderRadius: 20, backgroundColor: "#ecebe7", alignItems: "center", justifyContent: "center",
            boxShadow: dang ? `0px 0px 0px 2.5px ${M.chinh}, ${BONG.lom}` : BONG.lom }}>
            <Chu kieu="rat" co={26} so>{so ? (an ? "•" : so) : ""}</Chu>
          </View>
        );
      })}
      {doi ? (
        <TextInput ref={o} value={gia} onChangeText={(t) => doi(locPin(t))} keyboardType="number-pad" maxLength={4} autoFocus={tuDong}
          textContentType="oneTimeCode" autoComplete="off" secureTextEntry={false} accessibilityLabel={nhan} caretHidden
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, opacity: 0.011, color: "transparent" }} />
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------- dòng quà

/** Ô hình quà (thiết kế .h: vuông bo 14, nền lõm nhạt, icon 3D). */
export const OHinhQua = ({ ic, co = 46 }: { ic: string; co?: number }) => (
  <View style={{ width: co, height: co, borderRadius: 14, backgroundColor: "#f6f1e6", alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
    <Icon3D ten={ic as TenIcon} co={Math.round(co * 0.66)} />
  </View>
);

/** Ô hình quà TO giữa bảng «Trao quà cho con» (them-5otw85h4 .hinh: 110×110, bo 34, nền vàng nhạt, khối clay, icon 72). */
export const OHinhQuaTo = ({ ic }: { ic: string }) => (
  <View style={{ alignSelf: "center", width: 110, height: 110, borderRadius: 34, backgroundColor: "#fdeab0", alignItems: "center", justifyContent: "center", ...KHOI.the }}>
    <Icon3D ten={ic as TenIcon} co={72} />
  </View>
);

/** Nhãn sao vàng «⭐ 100 sao». */
export const GiaSao = ({ n, chu }: { n: number; chu?: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 6, paddingRight: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: M.diemSoft }}>
    <Icon3D ten="sao" co={16} /><Chu kieu="rat" co={13.5} mau={M.diemInk} so>{chu ?? `${n.toLocaleString("vi-VN").replace(/,/g, ".")} sao`}</Chu>
  </View>
);

/** Một dòng quà ở «Danh sách quà» (them-473f52w6): hình · tên + dòng phụ (điều kiện = nhãn ngọc «Ba Mẹ trao» / «Chỉ cuối tuần») · giá · ›. */
export function DongQua({ q, bam, dau, phai }: { q: QuaS3; bam?: () => void; dau?: boolean; phai?: ReactNode }) {
  const p = phuQua(q);
  return (
    <Pressable onPress={bam} disabled={!bam} accessibilityRole={bam ? "button" : undefined} accessibilityLabel={`${q.ten}, ${q.sao} sao${p.chu ? `, ${p.chu}` : ""}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 68, paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: dau ? 0 : 1, borderTopColor: "#efefec" }}>
      <OHinhQua ic={icQua(q)} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15.5} dong={1}>{q.ten}</Chu>
        {p.chu ? (p.nhan ? <View style={{ alignSelf: "flex-start", marginTop: 3 }}><Nhan chu={p.chu} loai="ok" /></View>
          : <Chu co={13} mau={M.chu3} dong={2}>{p.chu}</Chu>) : null}
        {q.dangGiu ? <Chu co={12.5} mau={M.chinhInk}>{`${q.dangGiu} phiếu đang chờ trao`}</Chu> : null}
      </View>
      {phai ?? <GiaSao n={q.sao} />}
      {bam ? <Icon ten="phai" co={16} mau={M.chu3} /> : null}
    </Pressable>
  );
}

/** Nút tròn «+» / «✓» chọn mẫu ở thư viện. */
export function NutCong({ chon, bam, nhan }: { chon: boolean; bam: () => void; nhan: string }) {
  return (
    <NhanMen onPress={bam} accessibilityRole="checkbox" accessibilityState={{ checked: chon }} accessibilityLabel={nhan} muc="chip" sang={!chon}
      style={[{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
        chon ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.the, ...KHOI.nho }]}>
      <Icon ten={chon ? "tick" : "cong"} co={18} mau={chon ? "#fff" : M.chinhInk} />
    </NhanMen>
  );
}

// ---------------------------------------------------------------- mã mở máy

/** 6 ô số to (them-rz77kk45): 3 ô · khoảng trống · 3 ô. */
export function OMa6({ so }: { so: string[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }} accessibilityRole="text"
      accessibilityLabel={`Mã ${so.slice(0, 3).join(" ")}, ${so.slice(3).join(" ")}`}>
      {so.map((c, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
          {i === 3 ? <View style={{ width: 10 }} /> : null}
          <View style={{ width: 44, height: 58, borderRadius: 14, backgroundColor: M.the, alignItems: "center", justifyContent: "center", ...KHOI.nho }}>
            <Chu kieu="rat" co={30} so>{c}</Chu>
          </View>
        </View>
      ))}
    </View>
  );
}
