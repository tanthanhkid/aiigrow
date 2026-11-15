// them-3xbscpzm «Web cho X» (thiết kế chốt 15/11 — #262, chế độ «Theo danh sách»): dải «Chế độ: Theo danh sách · Đổi ›» (⇒ màn app chọn chế độ),
// thanh «🔗 Dán địa chỉ web… + Thêm» ⇒ them-ubomxl31, «Đã thêm N trang · M tính phút — Chạm ＋ để thêm», danh mục trang chia nhóm (DM_WEB) mỗi nhóm
// «Chọn tất cả» + «● Thêm vào nhóm …»; trang đã thêm hiện viên nhóm. Nhóm «Giải trí» = Tính phút, nhóm khác = Không tính phút. Không chọn sẵn.
// «Tiếp: ghép máy của con» ⇒ lưu MỘT lần cả Lần đầu
// (POST thiet-lap: hồ sơ đã lưu + giờ chơi + giờ ngủ + chế độ + app + web — docs/API.md › «Thiết lập lần đầu») ⇒ Ghép máy.
import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Pressable, View } from "react-native";
import { DM_WEB, type MucDm } from "@/lib/danh-muc-lan-dau";
import { luuThietLap } from "@/lib/ghep-may";
import { DauMan } from "@/lib/lan-dau";
import { DauNhom, DongChon, DongDem, DongVaoNhom, tenNhomDm, theoNhom, ThanhTimGia, TheDs, tinhGioDm } from "@/lib/lan-dau-ds";
import { BONG } from "@/lib/clay";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, nhomCua, type WebChon } from "@/lib/thiet-lap";
import { BaoLoi, Chu, M, Man, Nut, useLam } from "@/lib/ui";

export default function ChonWeb() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [webs, setWebs] = useState<WebChon[]>(tl.webs ?? []);
  useFocusEffect(useCallback(() => { setWebs(layTl().webs ?? []); }, []));     // quay về từ «Thêm web» ⇒ đọc lại
  const { lam, loi, dangChay } = useLam();
  const nhom = useMemo(() => theoNhom(DM_WEB), []);
  const co = (m: string) => webs.some((w) => w.muc === m);
  const doi = (ds: MucDm[], bat: boolean) => {
    const k = new Set(ds.map((x) => x.ten));
    const moi = [...webs.filter((w) => !k.has(w.muc)), ...(bat ? ds.map((x) => ({ muc: x.ten, tinhGio: tinhGioDm(x) })) : [])];
    setWebs(moi);
    datTl({ webs: moi });
  };
  // nhãn nhóm của một dòng = nhóm ĐÃ LƯU của trang (có thể đã đổi ở «Thêm web»), không theo danh mục
  const nhomDa = (m: string, macDinh: ReturnType<typeof nhomCua>) => { const w = webs.find((x) => x.muc === m); return w ? nhomCua(w.tinhGio) : macDinh; };
  const rieng = webs.filter((w) => !DM_WEB.some((x) => x.ten === w.muc));
  const tiep = () => lam(async () => {
    datTl({ webs });
    const con = await luuThietLap();
    router.push({ pathname: "/thiet-lap/ghep", params: { con, nguon: "lan-dau" } });
  }, { hangDoi: true });
  return (
    <Man dau={<DauMan ve="/thiet-lap/app" phai={<ThanhBuoc5 dang={4} ic="khien" />} />}
      day={<><BaoLoi loi={loi} /><Nut chu="Tiếp: ghép máy của con" rong dangChay={dangChay} bam={tiep} /></>}>
      <Chu kieu="rat" co={26} style={{ letterSpacing: -0.5 }}>{`Web cho ${ten}`}</Chu>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingLeft: 16, paddingRight: 16, borderRadius: 26, backgroundColor: "#dcebe6", boxShadow: BONG.nho }}>
        <Chu kieu="rat" co={13.5} mau={M.chinhInk} style={{ flex: 1 }}>Chế độ: Theo danh sách</Chu>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Đổi chế độ" hitSlop={6}
          style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", boxShadow: BONG.nho }}>
          <Chu kieu="rat" co={13} mau={M.chinhInk}>Đổi ›</Chu>
        </Pressable>
      </View>
      <ThanhTimGia chu="🔗 Dán địa chỉ web…" nhan="Thêm trang web bằng tên hoặc đường link" bam={() => router.push("/thiet-lap/them-web")} />
      <DongDem trai={`Đã thêm ${webs.length} trang · ${webs.filter((w) => w.tinhGio).length} tính phút`} phai="Chạm ＋ để thêm" />
      {rieng.length ? (
        <View style={{ gap: 6 }}>
          <DauNhom chu="➕ Ba Mẹ thêm" />
          <TheDs>{rieng.map((w, i) => <DongChon key={w.muc} dau={!i} e="🔗" ten={w.muc} phu="Ba Mẹ dán" chon nhom={nhomCua(w.tinhGio)} bam={() => {
            const moi = webs.filter((x) => x !== w); setWebs(moi); datTl({ webs: moi });
          }} />)}</TheDs>
        </View>
      ) : null}
      {nhom.map((g) => {
        const het = g.ds.every((x) => co(x.ten));
        const n = nhomCua(tinhGioDm(g.ds[0]));
        return (
          <View key={g.nhom} style={{ gap: 6 }}>
            <DauNhom chu={`${g.eN} ${tenNhomDm(g.nhom)}`} het={het} bam={() => doi(g.ds, !het)} />
            <DongVaoNhom nhom={n} />
            <TheDs>{g.ds.map((x, i) => <DongChon key={x.ten} dau={!i} e={x.e} ten={x.ten} phu={x.phu} chon={co(x.ten)} nhom={nhomDa(x.ten, n)} bam={() => doi([x], !co(x.ten))} />)}</TheDs>
          </View>
        );
      })}
      <Chu co={12.5} mau={M.chu3} style={{ paddingHorizontal: 4 }}>AiiGrow không đề xuất: tiktok.com, facebook.com, youtube.com bản thường — chỉ dành cho từ 13 tuổi.</Chu>
    </Man>
  );
}
