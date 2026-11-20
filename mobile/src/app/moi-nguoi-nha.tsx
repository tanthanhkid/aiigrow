// Mời người nhà (thiết kế 14/11 bm-ca-nha/04 them-5hzkl6p5 = bm-cai-dat/03 «Mời người nhà» → 05 «Đã mời» / bm-cai-dat/07 «Chưa có app, gửi link»):
// SĐT hoặc email, «<tên> làm được như bạn — Cho vay sao, duyệt việc, đổi cài đặt», «Gửi lời mời». 14/11: thiết kế bỏ chọn quyền khi mời (chỉ còn
// «làm được như bạn») ⇒ luôn mời quyền Ba Mẹ; người «Người trông giúp» cũ vẫn giữ quyền, đổi ở màn Thành viên. «Chọn từ danh bạ» chưa làm. Không mã mời: người được mời đăng nhập bằng đúng SĐT / email là thấy lời mời (moi/cho-toi),
// hoặc bấm link. Máy chủ chưa gửi SMS / email và chưa biết người được mời có app chưa ⇒ «… chưa có app? Xem cách gửi link» gửi lời mời rồi mở hàng
// chia sẻ (Zalo / Tin nhắn, câu soạn sẵn `chiaSe`).
// #325 (bàn them-5hzkl6p5@v7 = them-0uobhmvh, them-hfd2drjy@v9 = them-wewdno56): số điện thoại hiện «0909 876 543»; nút gửi icon 3D; «Đã mời» có ô sân
// ngọc (Grow + dấu tick), viên cam «Đang chờ … bấm vào», chỉ «Xong, về Cả nhà» + «Huỷ lời mời» (gửi link nằm ở «… chưa có app?»).
// `?moi=<id>`: mở «Đã mời» của lời mời đang chờ (tab Cả nhà: chạm hàng «Chưa nhận lời mời» / «Gửi lại» — data-toi them-hfd2drjy).
// #325 bm-cai-dat (bàn them-mflye65x@v6 «B3 Đã mời, <tên> chưa có app»): «… chưa có app? Xem cách gửi link» tạo lời mời rồi mở màn «Mời <tên>» —
// Grow «<tên> chưa có app, gửi link nha!», «<tên> chưa có AiiGrow», thẻ «Tin sẽ gửi cho <tên>» (câu + link mời thật của máy chủ), «Gửi link cho <tên> qua
// Zalo» / «Gửi bằng SMS hoặc email» (cùng mở hàng chia sẻ của máy). Lùi ⇒ «Đã mời» (lời mời đã tạo, huỷ ở đó).
import { useState } from "react";
import { Pressable, Share, TextInput, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { bm, type GiaDinh } from "@/lib/api";
import { type DsThanhVien, type Quyen, type ToiCaNha } from "@/lib/ca-nha";
import { HaiTheVai } from "@/lib/ca-nha-ui";
import { MucTieu, veHoac } from "@/lib/ui-bm3";
import { BONG, KHOI, KHOI_HERO } from "@/lib/clay";
import { Avt, BaoLoi, Chu, F, Icon, Icon3D, M, Man, NhanMen, Nut, Rob, useLam, useTai } from "@/lib/ui";
import { mauCon } from "@/lib/hang-ngay";

type KqMoi = { id: string; tenGoi: string | null; dinhDanh: string | null; quyen: Quyen; chiaSe: { tieuDe: string; noiDung: string; lienKet: string } };
/** như máy chủ (auth.ts › chuanDinhDanh): bỏ cách / chấm / gạch / ngoặc, +84 / 84 → 0, đúng 10 số */
const chuanSdt = (t: string) => { let s = t.replace(/[\s.\-()]/g, ""); if (s.startsWith("+84")) s = "0" + s.slice(3); else if (/^84\d{9}$/.test(s)) s = "0" + s.slice(2); return s; };
const SDT = /^0\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** «0909876543» → «0909 876 543» (đang gõ: chia nhóm 4-3-3 theo số đã gõ); chữ khác số (+84, email) giữ nguyên. */
/** Ô SĐT: giữ đúng chữ hiện trên ô (giá trị lưu = giá trị hiển thị) — chỉ nhận số / cách / + . - ( ), số bắt đầu bằng 0 cắt ở 10 chữ số
 *  (bỏ số gõ thừa, không giấu trong state). Tách nhóm «0909 876 543» khi rời ô. */
const catSdt = (t: string) => {
  const s = t.replace(/[^\d\s+.\-()]/g, "");
  if (!/^\s*0/.test(s)) return s;
  let n = 0;
  return s.replace(/\d/g, (c) => (++n <= 10 ? c : "")).replace(/\s+$/, (m) => (n >= 10 ? "" : m));
};
const soNhom = (t: string) => (/^0[\d\s]*$/.test(t) ? t.replace(/\s/g, "").slice(0, 10).replace(/^(\d{4})(\d{1,3})?(\d{1,3})?$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" ")) : t);

export default function MoiNguoiNha() {
  const { moi } = useLocalSearchParams<{ moi?: string }>();
  const { d } = useTai(async () => {
    const [toi, g, tv] = await Promise.all([bm.goi<ToiCaNha>("toi"), bm.goi<GiaDinh>("gia-dinh"), moi ? bm.goi<DsThanhVien>("thanh-vien") : null]);
    return { toi: toi.baMe.ten, con: g.con.map((c) => c.ten), mauCon: g.con.map((c, i) => mauCon(c.avatar, i)), cho: tv?.loiMoi.find((m) => m.id === moi) ?? null };
  });
  const [cach, setCach] = useState<"sdt" | "email">("sdt");
  const [dd, setDd] = useState("");
  const [ten, setTen] = useState("");
  const [quyen, setQuyen] = useState<Quyen>("ba_me");     // #492: chọn vai lúc mời (bàn them-0uobhmvh) — «Như Ba Mẹ» chọn sẵn
  const [kq, setKq] = useState<KqMoi | null>(null);
  const [guiLinkMo, setGuiLinkMo] = useState(false);     // màn «Mời <tên>» (B3) sau «… chưa có app?»
  // bề ngang ô sân B3 (màn trừ lề 16 hai bên, tối đa như khung 390): bong bóng ≤ 52 %, Grow co lại cho vừa phần còn lại — màn hẹp không đè chữ
  const rongSan = Math.min(useWindowDimensions().width, 390) - 32;
  const { lam, loi, dangChay } = useLam();
  const ve = () => veHoac("/cai-dat");
  const sach = cach === "sdt" ? chuanSdt(dd) : dd.trim();
  const hop = cach === "sdt" ? SDT.test(sach) : EMAIL.test(sach);
  const [dangGo, setDangGo] = useState(false);
  // báo sai độ dài: rời ô mà chưa đúng, hoặc đang gõ đã đủ/quá 10 số mà vẫn sai (vd không bắt đầu bằng 0)
  const saiDai = !!dd.trim() && !hop && (!dangGo || (cach === "sdt" && sach.replace(/\D/g, "").length >= 10));
  const goi = ten.trim() || (hop ? sach : "");
  const tenCon = d?.con.length ? d.con.join(", ") : "các con";
  const soCon = d?.con.length ? `${d.con.length} bé` : "các con";

  const gui = () => lam(async () => {
    const r = await bm.goi<KqMoi>("thanh-vien/moi", { dinhDanh: sach, quyen, tenGoi: ten.trim() || undefined });
    setKq(r);
  });
  const chiaSe = (r: KqMoi | null = kq) => r && Share.share({ title: r.chiaSe.tieuDe, message: r.chiaSe.noiDung }).catch(() => {});
  // «<tên> chưa có app? Xem cách gửi link»: gửi lời mời rồi sang màn «Mời <tên>» (B3) — nút ở đó mở hàng chia sẻ (Zalo, Tin nhắn, email…)
  const guiLink = () => lam(async () => {
    const r = await bm.goi<KqMoi>("thanh-vien/moi", { dinhDanh: sach, quyen, tenGoi: ten.trim() || undefined });
    setKq(r);
    setGuiLinkMo(true);
  });
  const daMoi = kq ?? d?.cho ?? null;
  const huy = () => lam(async () => {
    if (daMoi) await bm.goi(`thanh-vien/moi/${daMoi.id}/huy`, {});
    ve();
  });

  if (kq && guiLinkMo) {
    const ai = kq.tenGoi || kq.dinhDanh || "người nhà";
    const lk = kq.chiaSe.lienKet;
    // câu máy chủ soạn («… Bấm để vào nhà: <link>») — link hiện riêng ở thẻ dưới
    const cau = kq.chiaSe.noiDung.replace(lk, "").replace(/[\s:]+$/, "") + ".";
    return (
      <Man lui={{ chu: "", bam: () => setGuiLinkMo(false) }} tieu={`Mời ${ai}`} day={<>
        <Nut chu={`Gửi link cho ${ai} qua Zalo`} ic="chia_se" rong bam={() => chiaSe()} />
        <Pressable onPress={() => chiaSe()} accessibilityRole="button" style={{ minHeight: 46, alignItems: "center", justifyContent: "center" }}>
          <Chu kieu="rat" co={15} mau={M.chinhInk}>Gửi bằng SMS hoặc email</Chu>
        </Pressable>
      </>}>
        {/* bàn .san: ô ngọc cao 196, bong bóng trắng trái (15/20, chữ ≤ 170), Grow «chỉ» 170 tràn mép phải-dưới */}
        <View style={[{ height: 196, borderRadius: 36, overflow: "hidden", ...KHOI_HERO }]}>
          <View style={{ position: "absolute", right: -4, bottom: -24 }}><Rob ten="chi" co={Math.min(170, Math.round(rongSan * 0.48) - 8)} /></View>
          <View style={{ position: "absolute", left: 18, top: 30, maxWidth: Math.min(202, Math.round(rongSan * 0.52)), paddingVertical: 11, paddingHorizontal: 16, borderRadius: 22, backgroundColor: M.the, boxShadow: BONG.nho }}>
            <Chu kieu="dam7" co={15} style={{ lineHeight: 20 }}>{`${ai} chưa có app, gửi link nha!`}</Chu>
          </View>
        </View>
        <View style={{ alignItems: "center", gap: 6, marginTop: 4 }}>
          <Chu kieu="rat" co={26} style={{ textAlign: "center", letterSpacing: -0.5, lineHeight: 32 }}>{`${ai} chưa có AiiGrow`}</Chu>
          <Chu co={15} mau={M.chu2} style={{ textAlign: "center", lineHeight: 21 }}>{`${ai} bấm link, tải app và đăng ký\nlà vào nhà ngay.`}</Chu>
        </View>
        {/* bàn .zalo: thẻ «Tin sẽ gửi cho <tên>» — bong bóng ngọc nhạt + thẻ link trắng (icon nhà, «<Ba Mẹ> mời bạn vào nhà», địa chỉ link) */}
        <View style={[{ padding: 12, borderRadius: 28, backgroundColor: M.the }, KHOI.the]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Avt ten={d?.toi ?? "Ba Mẹ"} mau={M.chinh} co={28} />
            <Chu kieu="rat" co={13} mau={M.chu2}>{`Tin sẽ gửi cho ${ai}`}</Chu>
          </View>
          <View style={{ marginTop: 8, marginLeft: 36, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, borderTopLeftRadius: 4, backgroundColor: M.chinhSoft, gap: 8 }}>
            <Chu co={14} style={{ lineHeight: 19 }}>{cau}</Chu>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 14, backgroundColor: M.the }}>
              <Icon3D ten="nha" co={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Chu kieu="rat" co={14} dong={1}>{`${d?.toi ?? "Ba Mẹ"} mời bạn vào nhà`}</Chu>
                <Chu kieu="rat" co={12.5} mau={M.chinhInk} dong={1}>{lk.replace(/^https?:\/\//, "").split("?")[0]}</Chu>
              </View>
            </View>
          </View>
        </View>
        <BaoLoi loi={loi} />
      </Man>
    );
  }

  if (daMoi) {
    const ai = daMoi.tenGoi || daMoi.dinhDanh || "người nhà";
    return (
      <Man day={<>
        <Nut chu="Về Cả nhà" rong bam={ve} />
        <Pressable onPress={huy} disabled={dangChay} accessibilityRole="button" style={{ minHeight: 46, alignItems: "center", justifyContent: "center" }}>
          <Chu kieu="rat" co={15} mau={M.chu3}>Huỷ lời mời</Chu>
        </Pressable>
      </>}>
        {/* bàn .san: ô ngọc bo 36 cao 270, Grow «xong» 214 tràn đáy, dấu tick tròn ngọc viền trắng góc phải */}
        <View style={[{ height: 270, borderRadius: 36, overflow: "hidden", ...KHOI_HERO }]}>
          <View style={{ position: "absolute", left: "50%", bottom: -20, marginLeft: -107 }}><Rob ten="xong" co={214} /></View>
          <View style={{ position: "absolute", right: 64, top: 40, width: 56, height: 56, borderRadius: 28, backgroundColor: M.ok, borderWidth: 5, borderColor: "#FFFBF5",
            alignItems: "center", justifyContent: "center", boxShadow: BONG.ngoc }}>
            <Icon ten="tick" mau={M.chu} co={28} />
          </View>
        </View>
        <View style={{ alignItems: "center", gap: 6, marginTop: 4 }}>
          <Chu kieu="rat" co={26} style={{ textAlign: "center", letterSpacing: -0.5 }}>{`Đã mời ${ai}!`}</Chu>
          {/* bàn: «… bấm vào thông báo là vào nhà» — máy chủ chưa đẩy thông báo tới máy người được mời ⇒ nói đúng cách vào: mở AiiGrow bằng SĐT / email */}
          <Chu co={15} mau={M.chu2} style={{ textAlign: "center" }}>{`${ai} mở AiiGrow bằng ${daMoi.dinhDanh ? soNhom(daMoi.dinhDanh) : "SĐT / email này"} là thấy lời mời, không cần nhập mã gì cả.`}</Chu>
        </View>
        <Chu kieu="rat" co={13.5} mau={M.chu3} style={{ marginTop: 6, marginHorizontal: 6 }}>{`Điện thoại ${ai} sẽ hiện:`}</Chu>
        <View style={[{ padding: 14, borderRadius: 24, backgroundColor: M.the, gap: 4 }, KHOI.the]} accessible accessibilityLabel={`Thông báo mẫu: ${d?.toi ?? "Ba Mẹ"} mời bạn vào nhà`}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: M.chinhSoft, alignItems: "center", justifyContent: "center" }}><Icon3D ten="nha" co={18} /></View>
            <Chu kieu="dam" co={12.5} mau={M.chu2} style={{ flex: 1 }}>AiiGrow</Chu>
            <Chu kieu="dam" co={12} mau={M.chu2}>bây giờ</Chu>
          </View>
          <Chu kieu="rat" co={15}>{`${d?.toi ?? "Ba Mẹ"} mời bạn vào nhà`}</Chu>
          <Chu co={13.5} mau={M.chu2}>{`Cùng trông ${soCon} nhà mình. Bấm để vào.`}</Chu>
        </View>
        {/* bàn .cho: viên đào cao 36, chấm cam có quầng, chữ nâu 14/800 */}
        <View style={[{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: M.canhSoft, marginTop: 4 }, KHOI.nho]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: M.badge, boxShadow: "0 0 0 4px rgba(255,117,31,.2)" }} />
          <Chu kieu="rat" co={14} mau={M.canh}>{`Đang chờ ${ai} bấm vào`}</Chu>
        </View>
        <BaoLoi loi={loi} />
      </Man>
    );
  }

  return (
    // thiết kế: tiêu đề «Mời người nhà» ở hàng đầu (cạnh nút lùi); nút «Gửi lời mời cho <tên>» + «… chưa có app? Xem cách gửi link» ngay dưới thẻ quyền
    <Man lui={{ chu: "", bam: ve }} tieu="Mời người nhà">
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 30, backgroundColor: M.nut, ...KHOI.heroThe }}>
        <View style={{ flexDirection: "row" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {[d?.toi ?? "Ba Mẹ", ...(d?.con ?? [])].slice(0, 5).map((t, i) => (
            // Avt tự chọn màu chữ đủ tương phản trên nền (cổng TUONG-PHAN)
            <View key={i} style={{ marginLeft: i ? -6 : 0, borderRadius: 25, borderWidth: 3, borderColor: M.nut }}>
              <Avt ten={t} mau={i ? d?.mauCon[i - 1] ?? mauCon(null, i - 1) : M.chinh} co={44} />
            </View>
          ))}
          <View style={{ width: 50, height: 50, borderRadius: 25, marginLeft: 4, borderWidth: 2.5, borderStyle: "dashed", borderColor: M.diem, alignItems: "center", justifyContent: "center" }}>
            <Icon ten="cong" mau={M.diem} co={22} />
          </View>
        </View>
        <Chu kieu="rat" co={14} mau={M.diem} style={{ textAlign: "center" }}>{`Cùng trông ${d?.con.length ? `${d.con.length} con` : tenCon} với ${d?.toi ?? "bạn"}`}</Chu>
      </View>
      <View style={{ flexDirection: "row", gap: 4, backgroundColor: M.xamSoft, padding: 5, borderRadius: 22, boxShadow: BONG.lom }} accessibilityRole="tablist">
        {(["sdt", "email"] as const).map((k) => (
          <NhanMen key={k} onPress={() => { setCach(k); setDd(""); }} accessibilityRole="tab" accessibilityState={{ selected: cach === k }} muc="chip" sang
            style={[{ flex: 1, minHeight: 44, borderRadius: 17, alignItems: "center", justifyContent: "center" }, cach === k && { backgroundColor: M.the, ...KHOI.nho }]}>
            <Chu kieu="rat" co={14.5} mau={cach === k ? M.chinhInk : M.chu2}>{k === "sdt" ? "Số điện thoại" : "Email"}</Chu>
          </NhanMen>
        ))}
      </View>
      <View style={{ height: 56, borderRadius: 28, backgroundColor: M.xamSoft, boxShadow: BONG.lom, paddingHorizontal: 20, justifyContent: "center" }}>
        <TextInput value={dd} onChangeText={(t) => setDd(cach === "sdt" ? catSdt(t) : t)} onFocus={() => setDangGo(true)}
          onBlur={() => { setDangGo(false); if (cach === "sdt" && SDT.test(chuanSdt(dd))) setDd(soNhom(chuanSdt(dd))); }} placeholder={cach === "sdt" ? "0909 876 543" : "ten@email.com"} placeholderTextColor={M.chu3}
          keyboardType={cach === "sdt" ? "phone-pad" : "email-address"} autoCapitalize="none" autoComplete={cach === "sdt" ? "tel" : "email"}
          accessibilityLabel={cach === "sdt" ? "Số điện thoại người được mời" : "Email người được mời"}
          style={{ fontFamily: F.dam7, fontSize: 20, letterSpacing: 0.3, color: M.chu }} />
      </View>
      {saiDai ? <Chu kieu="dam" co={13} mau={M.loi} style={{ marginHorizontal: 8, marginTop: -4 }}>
        {cach === "sdt" ? `Số điện thoại cần đúng 10 số, bắt đầu bằng 0 (đang có ${chuanSdt(dd).replace(/\D/g, "").length} số)` : "Email chưa đúng — ví dụ ten@email.com"}</Chu> : null}
      {/* «Gọi là gì trong nhà?» không có trên thiết kế (thiết kế lấy tên từ danh bạ — «Chọn từ danh bạ» chưa làm) ⇒ giữ ô lõm nhỏ để có tên trên lời mời */}
      <View style={{ height: 50, borderRadius: 25, backgroundColor: M.xamSoft, boxShadow: BONG.lom, paddingHorizontal: 20, justifyContent: "center" }}>
        <TextInput value={ten} onChangeText={setTen} placeholder="Gọi là gì trong nhà? (Ba Tuấn, Bà nội…)" placeholderTextColor={M.chu3} maxLength={30}
          accessibilityLabel="Gọi là gì trong nhà" style={{ fontFamily: F.thuong, fontSize: 15.5, color: M.chu, paddingVertical: 12 }} />
      </View>
      {/* #492 bàn them-0uobhmvh@v14: «<tên> làm được gì?» — 2 thẻ chọn vai; Chỉ trông con: xem, duyệt việc, cho vay sao (máy chủ chặn đổi luật, mua quà, mời người, ghép máy) */}
      <MucTieu chu={`${ten.trim() || "Người được mời"} làm được gì?`} />
      <HaiTheVai quyen={quyen} doi={setQuyen} />
      <BaoLoi loi={loi} />
      <View style={{ marginTop: 6 }}><Nut chu={goi ? `Gửi lời mời cho ${goi}` : "Gửi lời mời"} ic="gui" ic3d rong dangChay={dangChay} tat={!hop} bam={gui} /></View>
      <Pressable onPress={guiLink} disabled={!hop || dangChay} accessibilityRole="button" style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
        <Chu kieu="dam" co={14} mau={M.chu2}>{`${ten.trim() || "Người nhà"} chưa có app? `}<Chu kieu="rat" co={14} mau={hop ? M.chinhInk : M.chu3}>Xem cách gửi link</Chu></Chu>
      </Pressable>
    </Man>
  );
}

