// Mời người nhà (thiết kế chốt bm-cai-dat/04 «Mời người nhà» → 05 «Đã mời» / 08 «Chưa có app, gửi link»): SĐT hoặc email, chọn 1 trong 2 quyền
// (Ba Mẹ / Người trông giúp — S2 L6), «Gửi lời mời». Không mã mời: người được mời đăng nhập bằng đúng SĐT / email là thấy lời mời (moi/cho-toi),
// hoặc bấm link. Máy chủ chưa gửi SMS / email và chưa biết người được mời có app chưa ⇒ màn «Đã mời» gộp luôn bước «gửi link» của thiết kế (08):
// nút gửi link qua Zalo / Tin nhắn (share sheet, câu soạn sẵn `chiaSe`).
import { useState } from "react";
import { Pressable, Share, TextInput, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { IC_QUYEN, MO_TA_QUYEN, TEN_QUYEN, chuDau, type Quyen, type ToiCaNha } from "@/lib/ca-nha";
import { veHoac } from "@/lib/ui-bm3";
import { BONG, KHOI } from "@/lib/clay";
import { BaoLoi, Chu, F, Icon, Icon3D, M, MAU_CON, Man, NhanMen, Nut, Rob, useLam, useTai } from "@/lib/ui";

type KqMoi = { id: string; tenGoi: string | null; dinhDanh: string | null; quyen: Quyen; chiaSe: { tieuDe: string; noiDung: string; lienKet: string } };
/** như máy chủ (auth.ts › chuanDinhDanh): bỏ cách / chấm / gạch / ngoặc, +84 / 84 → 0, đúng 10 số */
const chuanSdt = (t: string) => { let s = t.replace(/[\s.\-()]/g, ""); if (s.startsWith("+84")) s = "0" + s.slice(3); else if (/^84\d{9}$/.test(s)) s = "0" + s.slice(2); return s; };
const SDT = /^0\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function MoiNguoiNha() {
  const { d } = useTai(async () => {
    const [toi, g] = await Promise.all([bm.goi<ToiCaNha>("toi"), bm.goi<GiaDinh>("gia-dinh")]);
    return { toi: toi.baMe.ten, con: g.con.map((c) => c.ten) };
  });
  const [cach, setCach] = useState<"sdt" | "email">("sdt");
  const [dd, setDd] = useState("");
  const [ten, setTen] = useState("");
  const [quyen, setQuyen] = useState<Quyen>("ba_me");
  const [kq, setKq] = useState<KqMoi | null>(null);
  const { lam, loi, dangChay } = useLam();
  const ve = () => veHoac("/cai-dat");
  const sach = cach === "sdt" ? chuanSdt(dd) : dd.trim();
  const hop = cach === "sdt" ? SDT.test(sach) : EMAIL.test(sach);
  const goi = ten.trim() || (hop ? sach : "");
  const tenCon = d?.con.length ? d.con.join(", ") : "các con";

  const gui = () => lam(async () => {
    const r = await bm.goi<KqMoi>("thanh-vien/moi", { dinhDanh: sach, quyen, tenGoi: ten.trim() || undefined });
    setKq(r);
  });
  const chiaSe = (r: KqMoi | null = kq) => r && Share.share({ title: r.chiaSe.tieuDe, message: r.chiaSe.noiDung }).catch(() => {});
  // «<tên> chưa có app? Xem cách gửi link»: gửi lời mời rồi mở luôn hàng chia sẻ (Zalo, Tin nhắn…) với link mời
  const guiLink = () => lam(async () => {
    const r = await bm.goi<KqMoi>("thanh-vien/moi", { dinhDanh: sach, quyen, tenGoi: ten.trim() || undefined });
    setKq(r);
    chiaSe(r);
  });
  const huy = () => lam(async () => {
    if (kq) await bm.goi(`thanh-vien/moi/${kq.id}/huy`, {});
    ve();
  });

  if (kq) {
    const ai = kq.tenGoi || kq.dinhDanh || "người nhà";
    return (
      <Man day={<>
        <Nut chu="Xong, về Cả nhà" rong bam={ve} />
        <Nut chu="Gửi link qua Zalo, tin nhắn" loai="vien" ic="gui" rong bam={() => chiaSe()} />
        <Pressable onPress={huy} accessibilityRole="button" style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
          <Chu kieu="rat" co={14.5} mau={M.chu3}>Huỷ lời mời</Chu>
        </Pressable>
      </>}>
        <View style={{ alignItems: "center", paddingTop: 20 }}>
          <View>
            <Rob ten="xong" co={170} />
            <View style={{ position: "absolute", right: 6, top: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center", boxShadow: BONG.ngoc }}>
              <Icon ten="tick" mau="#fff" co={24} />
            </View>
          </View>
          <Chu kieu="rat" co={26} style={{ marginTop: 8, textAlign: "center", letterSpacing: -0.4 }}>{`Đã mời ${ai}!`}</Chu>
          <Chu co={15} mau={M.chu2} style={{ marginTop: 6, textAlign: "center" }}>{`${ai} mở AiiGrow bằng ${kq.dinhDanh ?? "SĐT / email này"} là thấy lời mời, bấm một nút là vào nhà — không cần nhập mã gì cả.`}</Chu>
        </View>
        <Chu kieu="rat" co={13.5} mau={M.chu3} style={{ marginTop: 6, marginHorizontal: 6 }}>{`Điện thoại ${ai} sẽ hiện:`}</Chu>
        <View style={{ padding: 14, borderRadius: 22, backgroundColor: M.chu, gap: 4, boxShadow: BONG.toi }} accessible accessibilityLabel={`Thông báo mẫu: ${d?.toi ?? "Ba Mẹ"} mời bạn vào nhà`}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: M.chinhSoft, alignItems: "center", justifyContent: "center" }}><Icon3D ten="nha" co={18} /></View>
            <Chu kieu="dam" co={12.5} mau="#d9dedc" style={{ flex: 1 }}>AiiGrow</Chu>
            <Chu co={12} mau="#d9dedc">bây giờ</Chu>
          </View>
          <Chu kieu="rat" co={15} mau="#fff">{`${d?.toi ?? "Ba Mẹ"} mời bạn vào nhà`}</Chu>
          <Chu co={13.5} mau="#eef1f0">{`Cùng trông ${tenCon}. Bấm để vào.`}</Chu>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: M.diem }} />
          <Chu kieu="dam" co={13.5} mau={M.chu2}>{`Đang chờ ${ai} bấm vào`}</Chu>
        </View>
        <BaoLoi loi={loi} />
      </Man>
    );
  }

  return (
    <Man lui={{ chu: "", bam: ve }} day={<>
      <BaoLoi loi={loi} />
      <Nut chu={goi ? `Gửi lời mời cho ${goi}` : "Gửi lời mời"} rong dangChay={dangChay} tat={!hop} bam={gui} />
      <Pressable onPress={guiLink} disabled={!hop || dangChay} accessibilityRole="button" style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
        <Chu kieu="dam" co={13.5} mau={M.chu3}>{`${ten.trim() || "Người nhà"} chưa có app? `}<Chu kieu="rat" co={13.5} mau={hop ? M.chinhInk : M.chu3}>Gửi link mời</Chu></Chu>
      </Pressable>
    </>}>
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 18, paddingHorizontal: 16, borderRadius: 30, backgroundColor: M.chinhSoft, ...KHOI.the }}>
        <View style={{ flexDirection: "row" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {[d?.toi ?? "Ba Mẹ", ...(d?.con ?? [])].slice(0, 3).map((t, i) => (
            <View key={i} style={{ width: 54, height: 54, borderRadius: 27, marginLeft: i ? -10 : 0, borderWidth: 3, borderColor: M.nen, backgroundColor: MAU_CON[(i + 2) % MAU_CON.length],
              alignItems: "center", justifyContent: "center" }}>
              <Chu kieu="rat" co={20} mau="#fff">{chuDau(t)}</Chu>
            </View>
          ))}
          <View style={{ width: 54, height: 54, borderRadius: 27, marginLeft: -10, borderWidth: 3, borderColor: M.nen, backgroundColor: M.chinhSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon ten="cong" mau={M.chinhInk} co={22} />
          </View>
        </View>
        <Chu kieu="rat" co={14} mau={M.chinhInk} style={{ textAlign: "center" }}>{`Bạn cùng trông ${tenCon}`}</Chu>
      </View>
      <Chu kieu="rat" co={26} style={{ letterSpacing: -0.5, marginHorizontal: 4, marginTop: 4 }}>Mời người nhà</Chu>
      <View style={{ flexDirection: "row", gap: 4, backgroundColor: M.xamSoft, padding: 5, borderRadius: 22, boxShadow: BONG.lom }} accessibilityRole="tablist">
        {(["sdt", "email"] as const).map((k) => (
          <NhanMen key={k} onPress={() => { setCach(k); setDd(""); }} accessibilityRole="tab" accessibilityState={{ selected: cach === k }} muc="chip" sang
            style={[{ flex: 1, minHeight: 44, borderRadius: 17, alignItems: "center", justifyContent: "center" }, cach === k && { backgroundColor: "#fff", ...KHOI.nho }]}>
            <Chu kieu="rat" co={14.5} mau={cach === k ? M.chinhInk : M.chu2}>{k === "sdt" ? "Số điện thoại" : "Email"}</Chu>
          </NhanMen>
        ))}
      </View>
      <View style={{ minHeight: 56, borderRadius: 22, backgroundColor: M.xamSoft, boxShadow: BONG.lom, paddingHorizontal: 18, justifyContent: "center" }}>
        <TextInput value={dd} onChangeText={setDd} placeholder={cach === "sdt" ? "0909 876 543" : "ten@email.com"} placeholderTextColor={M.chu3}
          keyboardType={cach === "sdt" ? "phone-pad" : "email-address"} autoCapitalize="none" autoComplete={cach === "sdt" ? "tel" : "email"}
          accessibilityLabel={cach === "sdt" ? "Số điện thoại người được mời" : "Email người được mời"}
          style={{ fontFamily: F.dam, fontSize: 17, color: M.chu, paddingVertical: 14 }} />
      </View>
      <View style={{ minHeight: 52, borderRadius: 22, backgroundColor: "#fff", ...KHOI.nho, paddingHorizontal: 18, justifyContent: "center" }}>
        <TextInput value={ten} onChangeText={setTen} placeholder="Gọi là gì trong nhà? (Ba Tuấn, Bà nội…)" placeholderTextColor={M.chu3} maxLength={30}
          accessibilityLabel="Gọi là gì trong nhà" style={{ fontFamily: F.thuong, fontSize: 15.5, color: M.chu, paddingVertical: 12 }} />
      </View>
      <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6, marginTop: 4 }}>Cho làm gì</Chu>
      <View style={{ flexDirection: "row", gap: 10 }} accessibilityRole="radiogroup">
        {(["ba_me", "trong_giup"] as const).map((q) => (
          <NhanMen key={q} onPress={() => setQuyen(q)} accessibilityRole="radio" accessibilityState={{ checked: quyen === q }} accessibilityLabel={`${TEN_QUYEN[q]}, ${MO_TA_QUYEN[q]}`}
            muc="khoi" sang style={[{ flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 16, gap: 4, borderRadius: 24, backgroundColor: M.the, ...KHOI.the },
              quyen === q && { boxShadow: `0px 0px 0px 3px ${M.chinh}, ${BONG.the}` }]}>
            <Icon3D ten={IC_QUYEN[q]} co={30} />
            <Chu kieu="rat" co={14.5}>{TEN_QUYEN[q]}</Chu>
            <Chu kieu="dam" co={12} mau={M.chu3}>{MO_TA_QUYEN[q]}</Chu>
          </NhanMen>
        ))}
      </View>
    </Man>
  );
}

