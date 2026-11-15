// them-pxgipoxg (Lần đầu) / bm1-may-moi (Ghép thêm máy) «Máy X đã ghép!» (thiết kế chốt 15/11, #267): tiêu đề «Ghép máy», máy + Grow + dấu tick,
// «Tên máy Ba Mẹ sẽ thấy» (ô sửa tên + «Tên gốc: …» + «✓ Chưa trùng máy nào trong nhà» + gợi ý tên), rồi:
//  · máy riêng: 3 ô «N app Tính phút» · «N app Không tính phút» · «1 sao = 1 phút chơi» + thẻ «Theo danh sách · máy riêng <bé>»;
//  · máy chung: thẻ từng bé (sao + chế độ) + «Luật đi theo bé đang dùng · Chơi trên máy này chỉ trừ sao của bé đó».
// «Lưu tên & xong» (POST may/:id/doi-ten khi tên đổi), «+ Ghép thêm máy khác». Dữ liệu: GET may/:id/tuan-thu (tên, nền, conDs) + con/:id/thiet-lap
// (chế độ từng bé) + GET luat (đếm app Tính phút / Không tính phút) + gia-dinh (sao từng bé) + tuan-thu (tên trùng).
import { cheDoTu } from "@/lib/app-web";
import { useRef, useState, type ComponentRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { bm, chuanHoaTen, type ChiTietTuanThu, type GiaDinh, type TuanThuMay } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { tomTat } from "@/lib/ghep-may";
import { tenGoi } from "@/lib/hang-ngay";
import { DauMan, LienKet } from "@/lib/lan-dau";
import { AvtCon, conCuaMay, hinhMay, nganTen, SaoNho } from "@/lib/may-nhieu-con";
import { laWeb } from "@/lib/ui-bm3";
import { BaoLoi, Chu, F, Icon3D, M, Man, Nut, Rob, useLam, useTai, type TenIcon } from "@/lib/ui";

type Luat = { child_id: string | null; muc: string; ten?: string | null; loai: string };
const LOAI: Record<string, string> = { windows: "Laptop", mac: "Máy Mac", ios: "iPad", android: "Điện thoại" };

export default function DaGhep() {
  const p = useLocalSearchParams<{ con?: string; may?: string; nguon?: string }>();
  const con = String(p.con ?? "");
  const mayId = p.may ? String(p.may) : "";
  const nguon = p.nguon === "them" ? "them" : "lan-dau";
  const { d } = useTai(async () => {
    const [m, g, luat, tt] = await Promise.all([mayId ? bm.goi<ChiTietTuanThu>(`may/${mayId}/tuan-thu`).catch(() => null) : null, bm.goi<GiaDinh>("gia-dinh").catch(() => null),
      bm.goi<{ ds: Luat[] }>("luat").catch(() => null), bm.goi<{ ds: TuanThuMay[] }>("tuan-thu").catch(() => null)]);
    const caNha = (g?.con ?? []).map((x) => ({ id: x.id, ten: x.ten, avatar: x.avatar }));
    const conDs = m ? conCuaMay(m, caNha) : caNha.filter((x) => x.id === con);
    const ids = conDs.length ? conDs.map((x) => x.id) : con ? [con] : [];
    const tl = await Promise.all(ids.map((id) => tomTat(id).catch(() => null)));
    return { m, conDs, tl, luat: luat?.ds ?? [], khac: (tt?.ds ?? []).filter((x) => x.id !== mayId), sao: (id: string) => g?.con.find((x) => x.id === id)?.soDu ?? null };
  });
  const [tenMoi, setTenMoi] = useState<string | null>(null);
  const [goc, setGoc] = useState<string | null>(null);
  const o = useRef<ComponentRef<typeof TextInput>>(null);
  const { lam, loi, dangChay } = useLam();
  if (d?.m && goc === null) setGoc(d.m.ten);           // tên agent đặt lúc ghép (giữ để hiện «Tên gốc»)
  const chung = (d?.conDs.length ?? 0) >= 2;
  const be = d?.conDs[0] ?? null;
  const tenBe = be ? tenGoi(be.ten) : d?.tl[0]?.ten ? tenGoi(d.tl[0].ten) : "con";
  const tenMay = tenMoi ?? d?.m?.ten ?? "";
  const ten = chuanHoaTen(tenMay);
  // so trùng sau khi bỏ hậu tố « · <hệ điều hành>» (agent cũ gắn vào tên máy)
  const trung = ten ? d?.khac.find((x) => chuanHoaTen(nganTen(x.ten)) === chuanHoaTen(nganTen(ten))) : undefined;
  const moHet = cheDoTu(d?.tl[0]) === "mo_het";
  // đếm app theo nhóm của bé (máy riêng): luật riêng bé + luật cả nhà, bỏ trang web; «giai_tri» = Tính phút (trả bằng sao), «hoc» = Không tính phút
  const dem = (loai: string) => new Set((d?.luat ?? []).filter((l) => (!l.child_id || l.child_id === be?.id) && l.loai === loai && !laWeb(l.muc)).map((l) => (l.ten || l.muc).toLowerCase())).size;
  const xong = () => (nguon === "lan-dau" ? router.replace({ pathname: "/thiet-lap/xong", params: { con } }) : router.replace({ pathname: "/may", params: con ? { con } : {} }));
  const luuXong = () => lam(async () => {
    if (d?.m && ten && ten !== chuanHoaTen(d.m.ten)) await bm.goi(`may/${mayId}/doi-ten`, { ten });
    xong();
  });
  const loaiMay = d?.m ? (chung ? "Máy tính" : LOAI[d.m.nen] ?? "Máy") : "Máy";
  const goiY = chung ? ["Máy phòng khách", "Máy tính chung"] : [`${loaiMay} phòng khách`];
  const oLuat = (ic: TenIcon, so: string, nhan: string) => (
    <View style={[{ flex: 1, minHeight: 80, borderRadius: 24, backgroundColor: "#f7f6f3", alignItems: "center", justifyContent: "center", gap: 2, paddingVertical: 8 }, KHOI.the]}>
      <Icon3D ten={ic} co={26} />
      <Chu kieu="rat" co={16} so dong={1}>{so}</Chu><Chu kieu="dam7" co={12} mau="#565c59" dong={1}>{nhan}</Chu>
    </View>
  );
  const chip = (chu: string, bam: () => void, phu?: string) => (
    <Pressable key={chu} onPress={bam} accessibilityRole="button" style={{ minHeight: 40, paddingHorizontal: 13, borderRadius: 20, backgroundColor: "#fff", justifyContent: "center", ...KHOI.nho }}>
      <Chu kieu="rat" co={13} mau="#3a403d">{phu ? <Chu kieu="rat" co={13} mau="#565c59">{`${phu} `}</Chu> : null}{chu}</Chu>
    </Pressable>
  );
  return (
    <Man dau={<DauMan tieu="Ghép máy" ve="/" khongLui={nguon === "lan-dau"} />}
      day={<><BaoLoi loi={loi} /><Nut chu="Lưu tên & xong" ic="tick" ic3d rong dangChay={dangChay} tat={!!d?.m && !ten} bam={luuXong} />
        <LienKet chu="+ Ghép thêm máy khác" bam={() => router.push({ pathname: "/may/them", params: con ? { con } : {} })} /></>}>
      {/* máy (khung than chì) + Grow «xong» + dấu tick 3D */}
      <View style={{ alignItems: "center" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={{ width: 120, height: 128, borderRadius: 24, borderWidth: 8, borderColor: "#1d2321", backgroundColor: "#dcebe6", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <Rob ten="xong" co={104} />
        </View>
        <View style={{ position: "absolute", top: -10, left: "50%", marginLeft: 36 }}><Icon3D ten="tick" co={52} /></View>
      </View>
      <View style={{ alignItems: "center", gap: 2 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: M.chu, textAlign: "center" }}>
          {chung ? `${ten || "Máy chung"} đã ghép!` : `Máy ${tenBe} đã ghép!`}
        </Text>
        <Chu kieu="rat" co={13.5} mau={M.chinhInk} style={{ textAlign: "center" }}>{chung ? `Dùng chung ${d?.conDs.length} bé · mỗi bé chọn tên + PIN để vào` : "Máy con đã nhận luật · giờ đặt tên cho dễ nhận"}</Chu>
      </View>
      {d?.m ? (
        <View style={[{ padding: 16, borderRadius: 28, backgroundColor: "#f7f6f3", gap: 8 }, KHOI.the]}>
          <Chu kieu="rat" co={14} mau="#3a403d" style={{ marginHorizontal: 6 }}>Tên máy Ba Mẹ sẽ thấy</Chu>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingLeft: 10, paddingRight: 4, borderRadius: 26, backgroundColor: "#ecebe7", boxShadow: BONG.lom }}>
            <Icon3D ten={hinhMay(d.m.nen, chung)} co={30} />
            <TextInput ref={o} value={tenMay} onChangeText={(t) => setTenMoi(t.slice(0, 80))} accessibilityLabel="Tên máy" placeholder="VD: Laptop của Bảo Anh" autoCapitalize="sentences"
              style={{ flex: 1, minWidth: 0, fontFamily: F.rat, fontSize: 17, color: M.chu, paddingVertical: 8 }} />
            <Pressable onPress={() => o.current?.focus()} accessibilityRole="button" accessibilityLabel="Sửa tên" style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Icon3D ten="but" co={22} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", columnGap: 8, marginHorizontal: 6 }}>
            {goc ? <Chu kieu="dam7" co={12} mau="#565c59">{`Tên gốc: ${goc}`}</Chu> : null}
            {ten ? <Chu kieu="rat" co={12} mau={trung ? "#8a3c0c" : M.chinhInk}>{trung ? `! Trùng tên ${trung.ten}` : "✓ Chưa trùng máy nào trong nhà"}</Chu> : null}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {!chung && ten && !/phòng ngủ$/.test(ten) ? chip("· phòng ngủ", () => setTenMoi(`${ten} phòng ngủ`), "Thêm") : null}
            {goiY.filter((x) => x !== ten).map((x) => chip(x, () => setTenMoi(x)))}
          </View>
        </View>
      ) : null}
      {chung ? (
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {d!.conDs.map((c, k) => {
            const s = d!.sao(c.id);
            return (
              <View key={c.id} style={[{ flexGrow: 1, flexBasis: "45%", minHeight: 80, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 24, backgroundColor: "#f7f6f3" }, KHOI.the]}>
                <AvtCon c={c} co={36} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Chu kieu="rat" co={15} dong={1}>{tenGoi(c.ten)}</Chu>
                  {s != null ? <SaoNho n={s} /> : null}
                  <Chu kieu="dam7" co={12} mau="#565c59" dong={1}>{cheDoTu(d!.tl[k]) === "mo_het" ? "Mở hết" : "Theo danh sách"}</Chu>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {moHet ? oLuat("game", "Mọi app", "mở hết") : oLuat("game", `${dem("giai_tri")} app`, "Tính phút")}
          {oLuat("sach", moHet ? "—" : `${dem("hoc")} app`, "Không tính phút")}
          {oLuat("sao", "1 sao", "= 1 phút chơi")}
        </View>
      )}
      <View style={[{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingLeft: 10, paddingRight: 14, paddingVertical: 8, borderRadius: 26, backgroundColor: "#f7f6f3" }, KHOI.the]}>
        <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: "#dcebe6", boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}><Icon3D ten="khien" co={24} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={14} dong={1}>{chung ? "Luật đi theo bé đang dùng" : `${moHet ? "Mở hết" : "Theo danh sách"} · máy riêng ${tenBe}`}</Chu>
          <Chu kieu="dam" co={12.5} mau="#3a403d" dong={2}>{chung ? "Chơi trên máy này chỉ trừ sao của bé đó" : moHet ? "Mọi app, web đều mở" : "Chỉ mở app, web Ba Mẹ đã thêm"}</Chu>
        </View>
      </View>
    </Man>
  );
}
