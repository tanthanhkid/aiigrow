// bm1-moi «<Mẹ Lan> mời bạn vào nhà» (thiết kế chốt 04/11, L6): người được mời đã có phiên (vừa đăng ký / đăng nhập) — lời mời gửi tới
// đúng SĐT / email của mình (GET moi/cho-toi) hoặc link mời (?ma) ⇒ MỘT nút «Vào nhà cùng …» (POST moi/nhan). «Không phải tôi» ⇒ tạo nhà mới.
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { DauMan, LienKet, TieuDe } from "@/lib/lan-dau";
import { Avt, Bao, BaoLoi, CanhGiua, ChoTai, Chu, Icon3D, Man, MAU_CON, Nhan, Nut, Rob, The, useLam, useTai } from "@/lib/ui";
import { ma0, noiTen, type XemMoi } from "@/lib/moi";
import { KHOI } from "@/lib/clay";

type LoiMoiToi = XemMoi & { id: string };

export default function VaoNha() {
  const { ma } = useLocalSearchParams<{ ma?: string }>();
  const m = ma0(ma);
  const { d, loi, matMang, tai } = useTai(async () => {
    const [cho, toi, g] = await Promise.all([bm.goi<{ ds: LoiMoiToi[] }>("moi/cho-toi"), bm.goi<{ baMe: { dinhDanh?: string; dinh_danh?: string } }>("toi"),
      bm.goi<{ con: unknown[] }>("gia-dinh").catch(() => ({ con: [] }))]);
    let x: (LoiMoiToi & { quaLink?: boolean }) | null = cho.ds[0] ?? null;
    if (!x && m) x = { ...(await bm.goi<XemMoi>(`moi/${encodeURIComponent(m)}`)), id: "", quaLink: true };
    return { x, dinhDanh: toi.baMe.dinhDanh ?? toi.baMe.dinh_danh ?? "", coNha: g.con.length > 0 };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man dau={<DauMan ve="/" />}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const x = d.x;
  if (!x) {
    return (
      <Man dau={<DauMan ve="/" />} day={<><Nut chu="Tải lại" loai="vien" rong bam={tai} /><Nut chu="Tạo nhà mới cho con mình" rong bam={() => router.replace("/thiet-lap/ten-con")} /></>}>
        <CanhGiua lv="cho" tieu="Chưa thấy lời mời" loi={`Nhờ người nhà mời đúng số ${d.dinhDanh} trong app AiiGrow (Cả nhà › Mời người nhà), rồi bấm Tải lại.`} />
      </Man>
    );
  }
  const ai = x.nguoiMoi ?? x.tenGiaDinh;
  const con = x.tenCon ?? [];
  const vao = () => lam(async () => {
    await bm.goi("moi/nhan", x.id ? { id: x.id } : { ma: m });
    router.replace("/hom-nay");
  });
  const viec: [Parameters<typeof Icon3D>[0]["ten"], string][] = x.quyen === "ba_me"
    ? [["dongho", "Xem con\ndùng máy"], ["chuong", "Duyệt khi\ncon xin"], ["banhrang", "Đổi\ncài đặt"]]
    : [["dongho", "Xem con\ndùng máy"], ["chuong", "Duyệt khi\ncon xin"], ["khoa", "Khoá máy\nkhi cần"]];
  return (
    <Man dau={<DauMan ve="/" khongLui />}
      day={<><BaoLoi loi={loiLam} /><Nut chu={`Vào nhà cùng ${ai}`} rong dangChay={dangChay} bam={vao} />
        <LienKet chu={d.coNha ? "Ở lại nhà mình" : "Không phải tôi"} bam={() => router.replace(d.coNha ? "/" : "/thiet-lap/ten-con")} /></>}>
      <View style={{ height: 250, borderRadius: 34, backgroundColor: "#dcebe6", alignItems: "center", justifyContent: "flex-end", overflow: "hidden", ...KHOI.the }}>
        <View style={{ position: "absolute", top: 16, flexDirection: "row", gap: 4 }}>
          {[ai, ...con, "Tôi"].slice(0, 5).map((t, i) => (
            <View key={t + i} style={{ borderRadius: 30, padding: 3, backgroundColor: i === Math.min(con.length + 1, 4) ? "#f5c94a" : "transparent" }}>
              <Avt ten={t === "Tôi" ? "T" : t} mau={MAU_CON[i % MAU_CON.length]} co={50} />
            </View>
          ))}
        </View>
        <Rob ten="chi" co={170} />
      </View>
      <TieuDe chu={`${ai} mời bạn vào nhà`} phu={con.length ? `Cùng trông ${noiTen(con, true)}` : x.tenGiaDinh} giua />
      <View style={{ alignItems: "center" }}><Nhan chu={con.length ? `Bạn cùng trông ${noiTen(con)}` : x.tenQuyen ? `Quyền ${x.tenQuyen}` : "Người trong nhà"} /></View>
      {d.coNha ? <Bao tieu="Tài khoản này đã có nhà riêng" loi="Chỉ vào nhà khác được khi tài khoản chưa có con, máy hay người nhà nào. Muốn vào nhà này: đăng xuất rồi tạo tài khoản bằng số khác." /> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {viec.map(([ic, chu]) => (
          <The key={chu} style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 8 }}>
            <Icon3D ten={ic} co={30} />
            <Chu kieu="rat" co={13} style={{ textAlign: "center" }}>{chu}</Chu>
          </The>
        ))}
      </View>
    </Man>
  );
}
