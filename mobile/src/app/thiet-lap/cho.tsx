// them-z8femhpg (Lần đầu) / them-jfyrm0t5 · them-mkcwr3q1 (Ghép thêm máy) «Đang chờ máy của X» + them-7ss7o7lz «Mã đã hết hạn».
// Hỏi máy chủ mỗi 3 giây (GET ghep-may/:ma): máy nhập mã / mở link là sang «Đã ghép». Đếm ngược theo hạn mã (10 phút).
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type ConChiTiet } from "@/lib/api";
import { kqTheoMa, xemGhep } from "@/lib/ghep-may";
import { BuocMayCon, CanhRob, DauMan, demNguoc, hienMa, LienKet, linkNgan, TieuDe } from "@/lib/lan-dau";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { BaoLoi, Chu, Icon3D, M, Man, Nut, useHoanTac, useTai } from "@/lib/ui";

export default function ChoMayCon() {
  const p = useLocalSearchParams<{ ma?: string; con?: string; nguon?: string }>();
  const ma = String(p.ma ?? "");
  const con = p.con ? String(p.con) : "";
  const nguon = p.nguon === "them" ? "them" : "lan-dau";
  const kq = kqTheoMa(ma);
  const [het, setHet] = useState<number | null>(kq ? Date.parse(kq.het) : null);
  const [con0, setCon0] = useState(() => (kq ? Math.round((Date.parse(kq.het) - Date.now()) / 1000) : 600));
  const [loi, setLoi] = useState<string | null>(null);
  const [linkCon, setLinkCon] = useState(false);          // mã 6 số hết hạn nhưng link đã gửi vẫn tự ghép được (48 giờ)
  const { bao, noi } = useHoanTac();
  const { d: c } = useTai(() => (con ? bm.goi<ConChiTiet>(`con/${con}`) : Promise.resolve(null)));
  const ten = c?.ten ?? "con";
  const sangXong = useCallback((may?: string | null, conMay?: string | null) =>
    router.replace({ pathname: "/thiet-lap/da-ghep", params: { con: conMay || con, may: may ?? "", nguon } }), [con, nguon]);
  const hoi = useCallback(async () => {
    const g = await xemGhep(ma);
    if (g.daGhep) { sangXong(g.may?.id, g.con); return true; }
    setHet(Date.now() + g.conGiay * 1000);
    setLinkCon(!!g.linkConHan);
    if (g.hetHan) throw new Error("het_han");          // mã + link đều hết ⇒ ngừng hỏi
    return false;
  }, [ma, sangXong]);
  useEffect(() => {
    if (!ma) return;
    const t0 = setTimeout(() => { hoi().catch((e) => { if (e?.message !== "het_han") { setLoi(e?.message ?? null); setHet(Date.now()); } }); }, 0);
    const t = setInterval(() => { hoi().then(() => setLoi(null), (e) => { if (e?.message === "het_han") clearInterval(t); }); }, 3000);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, [ma, hoi]);
  useEffect(() => { const t = setInterval(() => setCon0(het ? Math.round((het - Date.now()) / 1000) : 600), 1000); return () => clearInterval(t); }, [het]);
  const maHet = con0 <= 0;
  // Chỉ iPhone/iPad tự ghép bằng link khi mã đã hết hạn (bộ cài .exe/.pkg/.apk chưa mang được token — xem PR M1, Câu mở 1) ⇒ việc chính vẫn là lấy mã mới
  const hetHan = maHet;
  const maHien = kq?.maHien ?? hienMa(ma);
  const layMoi = () => router.replace({ pathname: "/thiet-lap/ghep", params: { con, nguon, moi: "1", ...(kq?.giongMay ? { giong: kq.giongMay } : {}) } });
  const guiLai = () => (router.canGoBack() ? router.back() : router.replace({ pathname: "/thiet-lap/ghep", params: { con, nguon } }));
  const daNhap = () => hoi().then((ok) => { if (!ok) bao(`Máy ${nguon === "them" ? "mới" : "của con"} chưa nhập mã — làm 3 bước trên máy đó nhé`); }, (e) => setLoi(e?.message ?? null));
  const may = nguon === "them" ? "máy mới" : "máy con";
  return (
    <Man noi={noi} dau={<DauMan bamLui={guiLai} phai={nguon === "lan-dau" ? <ThanhBuoc5 dang={4} /> : undefined} />}
      day={<>
        <BaoLoi loi={loi} />
        {hetHan ? <Nut chu={`Lấy mã mới cho ${ten}`} ic="khoa" rong bam={layMoi} /> : <Nut chu={nguon === "them" ? "Máy mới đã nhập mã" : "Máy con đã nhập mã"} ic="tick" rong bam={daNhap} />}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable onPress={guiLai} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 }}>
            <Icon3D ten="gui" co={20} /><Chu kieu="rat" co={14} mau={M.chinhInk}>Gửi lại link</Chu>
          </Pressable>
          <Pressable onPress={() => router.push("/ho-tro")} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 }}>
            <Icon3D ten="dau_hoi" co={20} /><Chu kieu="rat" co={14} mau={M.chinhInk}>Cần giúp?</Chu>
          </Pressable>
        </View>
        {nguon === "them" && !hetHan ? <LienKet chu="Mã hết hạn rồi? Lấy mã mới" bam={layMoi} /> : null}
      </>}>
      <TieuDe chu={hetHan ? "Mã đã hết hạn" : nguon === "them" ? `Chờ máy mới của ${ten}` : `Đang chờ máy của ${ten}`} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: hetHan ? M.huy : "#f59e0b" }} />
          <Chu kieu="rat" co={13.5} mau={M.chinhInk}>{hetHan ? "Mã ghép đã hết hạn" : `${may[0].toUpperCase()}${may.slice(1)} chưa nhập mã`}</Chu>
        </View>
        <Chu kieu="dam" co={13} mau={M.chu2} so>{hetHan ? "0:00" : `Mã còn ${demNguoc(con0)}`}</Chu>
      </View>
      <CanhRob lv="cho" tieu={hetHan ? "Mã chỉ dùng được 10 phút. Lấy mã mới là xong!" : `Trên ${nguon === "them" ? "máy mới" : "máy của con"}, làm 3 bước này nhé!`} cao={160} />
      <BuocMayCon n={1} ic="tin" tieu="Mở link vừa gửi" phu={kq ? linkNgan(kq.lienKet) : "aiigrow.aiilab.vn/tai"} />
      <BuocMayCon n={2} ic="tai" tieu="Cài AiiGrow" phu="Trang tải tự nhận loại máy" />
      <BuocMayCon n={3} ic="khoa" tieu={<Chu kieu="rat" co={15.5}>Nhập mã <Chu kieu="rat" co={15.5} mau={M.chinhInk} so style={maHet ? { textDecorationLine: "line-through" } : undefined}>{maHien}</Chu></Chu>} phu={maHet && linkCon ? "iPhone / iPad mở link vừa gửi vẫn tự ghép" : "Hoặc quét QR"} />
    </Man>
  );
}
