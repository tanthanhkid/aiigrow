// bm1-moi «<Mẹ Lan> mời bạn vào nhà» (thiết kế chốt 04/11, L6): người được mời đã có phiên (vừa đăng ký / đăng nhập) — lời mời gửi tới
// đúng SĐT / email của mình (GET moi/cho-toi) hoặc link mời (?ma) ⇒ MỘT nút «Vào nhà cùng …» (POST moi/nhan). «Không phải tôi» ⇒ tạo nhà mới.
// #877: tài khoản đã có nhà vẫn vào được — hiện «Nhà của bạn đang có N bé, M máy, K người lớn» (GET moi/nha-cu); là người lớn duy nhất ⇒ chọn
// «Mang các bé theo» (mặc định) / «Bỏ nhà cũ»; nhà cũ còn người lớn khác ⇒ chỉ mình rời, các bé và máy ở lại.
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { bm } from "@/lib/api";
import { DauMan, INK2, KIM, LienKet, VANG_NAU } from "@/lib/lan-dau";
import { useState } from "react";
import { Bao, BaoLoi, CanhGiua, ChoTai, F, IconNet, LV, Man, M, Nut, OChon, useLam, useTai, type TenIcon } from "@/lib/ui";
import { cauNhaCu, type NhaCu, cauTrong, dauTen, ma0, noiTen, type XemMoi } from "@/lib/moi";
import { BONG } from "@/lib/clay";

type LoiMoiToi = XemMoi & { id: string };
type Huong = "mang_theo" | "bo_nha_cu";

export default function VaoNha() {
  const { ma } = useLocalSearchParams<{ ma?: string }>();
  const m = ma0(ma);
  const { d, loi, matMang, tai } = useTai(async () => {
    const [cho, toi, nc] = await Promise.all([bm.goi<{ ds: LoiMoiToi[]; chiQuaLink?: boolean }>("moi/cho-toi"), bm.goi<{ baMe: { dinhDanh?: string; dinh_danh?: string } }>("toi"),
      bm.goi<NhaCu>("moi/nha-cu")]);
    // mở từ link mời ⇒ đúng lời mời của link đó, không lấy lời mời khác gửi tới số này
    let x: (LoiMoiToi & { quaLink?: boolean }) | null = m ? { ...(await bm.goi<XemMoi>(`moi/${encodeURIComponent(m)}`)), id: "", quaLink: true } : cho.ds[0] ?? null;
    return { x, dinhDanh: toi.baMe.dinhDanh ?? toi.baMe.dinh_danh ?? "", nhaCu: nc, coNha: (nc.soBe > 0 || nc.soMay > 0 || nc.soNguoiLon > 1), chiQuaLink: !!cho.chiQuaLink };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const [huong, setHuong] = useState<Huong>("mang_theo");
  if (!d) return <Man dau={<DauMan ve="/" />}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const x = d.x;
  if (!x) {
    return (
      <Man dau={<DauMan ve="/" />} day={<><Nut chu="Tải lại" loai="vien" rong bam={tai} /><Nut chu="Tạo nhà mới cho con mình" rong bam={() => router.replace("/thiet-lap/ten-con")} /></>}>
        {/* tài khoản Facebook: máy chủ không khớp lời mời theo email (email Facebook chưa chắc đã xác minh) ⇒ chỉ nhận qua link mời */}
        <CanhGiua lv="cho" tieu="Chưa thấy lời mời" loi={d.chiQuaLink
          ? "Tài khoản Facebook nhận lời mời bằng link: nhờ người nhà gửi link mời (Cả nhà › Mời người nhà) rồi mở link đó trên máy này."
          : `Nhờ người nhà mời đúng ${d.dinhDanh.includes("@") ? "email" : "số"} ${d.dinhDanh} trong app AiiGrow (Cả nhà › Mời người nhà), rồi bấm Tải lại.`} />
      </Man>
    );
  }
  const ai = x.nguoiMoi ?? x.tenGiaDinh;
  const con = x.tenCon ?? [];
  const trongGiup = x.quyen === "trong_giup";
  // «Chỉ trông con» không mang các bé sang nhà người mời được ⇒ chỉ còn «Bỏ nhà cũ», phải tự chọn (không chọn sẵn việc xoá)
  const huongThat: Huong | null = trongGiup ? (huong === "bo_nha_cu" ? "bo_nha_cu" : null) : huong;
  const canChon = d.nhaCu.laNguoiLonDuyNhat && (d.nhaCu.soBe > 0 || d.nhaCu.soMay > 0);
  const bamDuoc = !canChon || (huongThat !== null && !(huongThat === "bo_nha_cu" && d.nhaCu.soMay > 0));   // bỏ nhà còn máy ⇒ máy chủ từ chối: tắt nút
  const vao = () => lam(async () => {
    const chonHuong = canChon && huongThat ? { huong: huongThat } : {};
    await bm.goi("moi/nhan", { ...(x.id ? { id: x.id } : { ma: m }), ...chonHuong });
    router.replace("/hom-nay");
  });
  const viec: [TenIcon, string][] = x.quyen === "ba_me"
    ? [["dongho", "Xem con\ndùng máy"], ["chuong", "Duyệt khi\ncon xin"], ["banhrang", "Đổi\ncài đặt"]]
    : [["dongho", "Xem con\ndùng máy"], ["chuong", "Duyệt khi\ncon xin"], ["khoa", "Khoá máy\nkhi cần"]];
  const chuCai = [ai, ...con.slice(0, 4)];
  const nho = chuCai.length > 4;   // 5 viên cho vừa màn 320
  return (
    <Man dau={<View style={{ height: 4 }} />} dayStyle={{ paddingTop: 0, paddingBottom: 22, gap: 6 }}
      day={<><BaoLoi loi={loiLam} /><Nut chu={`Vào nhà cùng ${ai}`} rong lon dangChay={dangChay} tat={!bamDuoc} bam={vao} />
        <LienKet chu={d.coNha ? "Ở lại nhà mình" : "Không phải tôi"} mau={VANG_NAU} kieu="rat" co={15} bam={() => router.replace(d.coNha ? "/" : "/thiet-lap/ten-con")} /></>}>
      {/* bàn bm1-moi (v18): sân navy 320 bo 36 viền vàng mờ; hàng chữ cái (người mời + tối đa 4 bé, viên kem 54 viền navy 4, chồng -5) + «T» (bạn, vàng kim, viền vàng mật);
          Grow chỉ tay 190 đứng đáy; tiêu đề 28/34; 3 thẻ việc cao 112 bo 24 với icon nét trong ô lõm 48 */}
      <View style={{ height: 320, marginTop: 12, borderRadius: 36, backgroundColor: M.chu, overflow: "hidden", boxShadow: `${BONG.the}, inset 0px 0px 0px 1px rgba(244,199,106,0.35)` }}>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: -40, alignItems: "center" }}>
          <Image cachePolicy="memory-disk" source={LV.chi} style={{ width: 190, height: 190 * 707 / 520 }} contentFit="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        </View>
        <View style={{ position: "absolute", left: 0, right: 0, top: 30, flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
          {chuCai.map((t, i) => (
            <View key={t + i} style={{ width: nho ? 46 : 54, height: nho ? 46 : 54, marginHorizontal: -5, borderRadius: nho ? 23 : 27, borderWidth: 4, borderColor: M.chu, backgroundColor: M.nen, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.rat, fontSize: nho ? 18 : 21, color: M.chu }}>{dauTen(t)}</Text>
            </View>
          ))}
          <View style={{ width: 62, height: 62, marginLeft: 8, borderRadius: 31, backgroundColor: "#D9AE57", backgroundImage: KIM, alignItems: "center", justifyContent: "center",
            boxShadow: `0px 0px 0px 3px ${M.chu}, 0px 0px 0px 5px #D9AE57` } as never}>
            <Text style={{ fontFamily: F.rat, fontSize: 24, color: M.chu }}>T</Text>
          </View>
        </View>
      </View>
      <View style={{ marginTop: 6, alignItems: "center" }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.tieu, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: M.chu, textAlign: "center" }}>{`${ai} mời bạn vào nhà`}</Text>
        <Text style={{ marginTop: 6, fontFamily: F.thuong, fontSize: 15, lineHeight: 21, color: INK2, textAlign: "center" }}>{con.length ? cauTrong(con, true) : x.tenQuyen ? `Quyền ${x.tenQuyen}` : x.tenGiaDinh}</Text>
      </View>
      {d.nhaCu && d.coNha ? <NhaCuXacNhan nc={d.nhaCu} huong={huongThat} doi={setHuong} trongGiup={trongGiup} /> : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
        {viec.map(([ic, chu]) => (
          <View key={chu} style={{ flex: 1, height: 112, borderRadius: 24, backgroundColor: M.nen, boxShadow: BONG.the, alignItems: "center", justifyContent: "center", gap: 8 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#E3D9CB", alignItems: "center", justifyContent: "center", boxShadow: "inset 4px 4px 8px rgba(120,98,70,0.28), inset -4px -4px 8px #FFFBF5" }}><IconNet ten={ic} mau={M.chu} co={26} /></View>
            <Text style={{ fontFamily: F.rat, fontSize: 13.5, lineHeight: 18, color: M.chu, textAlign: "center" }}>{chu}</Text>
          </View>
        ))}
      </View>
    </Man>
  );
}

/** Bước xác nhận khi tài khoản đã có nhà riêng (#877). */
function NhaCuXacNhan({ nc, huong, doi, trongGiup }: { nc: NhaCu; huong: Huong | null; doi: (h: Huong) => void; trongGiup: boolean }) {
  const coDuLieu = nc.soBe > 0 || nc.soMay > 0;
  if (!nc.laNguoiLonDuyNhat) {
    return <Bao loai="lam" ic="nha" tieu={cauNhaCu(nc)} loi={`Bạn chỉ rời nhà cũ, các bé và máy ở lại với người nhà còn lại${nc.laChu ? "; quyền chủ nhà chuyển cho Ba Mẹ còn lại" : ""}.`} />;
  }
  if (!coDuLieu) return null;
  return (
    <View style={{ gap: 8, marginTop: 6 }}>
      <Bao loai="lam" ic="nha" tieu={cauNhaCu(nc)} loi={nc.tenBe.length ? `Các bé: ${noiTen(nc.tenBe, true)}` : undefined} />
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {trongGiup ? <Bao tieu="Chưa mang các bé theo được" loi="Lời mời chỉ có quyền «Chỉ trông con». Nhờ người mời gửi lại quyền «Như Ba Mẹ», hoặc bỏ nhà cũ." /> : <OChon chon={huong === "mang_theo"} bam={() => doi("mang_theo")} tieu="Mang các bé theo vào nhà mới" phu="Bé, máy, nhiệm vụ, sao, quà, lịch, luật, nhật ký đều sang nhà mới" />}
        <OChon chon={huong === "bo_nha_cu"} bam={() => doi("bo_nha_cu")} tieu="Bỏ nhà cũ" phu="Xoá nhà cũ kèm toàn bộ dữ liệu" />
      </View>
      {huong === "bo_nha_cu" ? <Bao loai="loi" tieu="Không hoàn tác được" loi={nc.soMay > 0 ? `Nhà cũ còn ${nc.soMay} máy đã ghép — gỡ máy trước khi bỏ nhà, hoặc chọn mang các bé theo.` : "Các bé và mọi dữ liệu của nhà cũ sẽ bị xoá hẳn."} /> : null}
    </View>
  );
}
