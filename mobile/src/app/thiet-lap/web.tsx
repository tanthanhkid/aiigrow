// them-3xbscpzm «Web cho X» (thiết kế chốt 14/11, chế độ «Chặn app & web»): thanh «🔗 Dán địa chỉ web… + Thêm» ⇒ them-ubomxl31,
// «Đã chọn N trang · Chạm ＋ để chọn», danh mục trang chia nhóm (lib/danh-muc-lan-dau.ts › DM_WEB) mỗi nhóm «Chọn tất cả». Không chọn sẵn.
// Nhóm «Giải trí · Ba Mẹ cân nhắc» tính vào giờ chơi (N3), nhóm khác «Vào thoải mái». «Tiếp: ghép máy của con» ⇒ lưu MỘT lần cả Lần đầu
// (POST thiet-lap: hồ sơ đã lưu + giờ chơi + giờ ngủ + chế độ + app + web — docs/API.md › «Thiết lập lần đầu») ⇒ Ghép máy.
import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import { DM_WEB, type MucDm } from "@/lib/danh-muc-lan-dau";
import { luuThietLap } from "@/lib/ghep-may";
import { DauMan } from "@/lib/lan-dau";
import { DauNhom, DongChon, DongDem, theoNhom, ThanhTimGia, TheDs, tinhGioDm } from "@/lib/lan-dau-ds";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, type WebChon } from "@/lib/thiet-lap";
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
      <ThanhTimGia chu="🔗 Dán địa chỉ web…" nhan="Thêm trang web bằng tên hoặc đường link" bam={() => router.push("/thiet-lap/them-web")} />
      <DongDem trai={`Đã chọn ${webs.length} trang`} phai="Chạm ＋ để chọn" />
      {rieng.length ? (
        <View style={{ gap: 6 }}>
          <DauNhom chu="➕ Ba Mẹ thêm" />
          <TheDs>{rieng.map((w, i) => <DongChon key={w.muc} dau={!i} e="🔗" ten={w.muc} phu={w.tinhGio ? "Tính vào giờ chơi" : "Vào thoải mái"} chon bam={() => {
            const moi = webs.filter((x) => x !== w); setWebs(moi); datTl({ webs: moi });
          }} />)}</TheDs>
        </View>
      ) : null}
      {nhom.map((g) => {
        const het = g.ds.every((x) => co(x.ten));
        return (
          <View key={g.nhom} style={{ gap: 6 }}>
            <DauNhom chu={`${g.eN} ${g.nhom}`} het={het} bam={() => doi(g.ds, !het)} />
            <TheDs>{g.ds.map((x, i) => <DongChon key={x.ten} dau={!i} e={x.e} ten={x.ten} phu={x.phu} chon={co(x.ten)} bam={() => doi([x], !co(x.ten))} />)}</TheDs>
          </View>
        );
      })}
      <Chu co={12.5} mau={M.chu3} style={{ paddingHorizontal: 4 }}>AiiGrow không đề xuất: tiktok.com, facebook.com, youtube.com bản thường — chỉ dành cho từ 13 tuổi.</Chu>
    </Man>
  );
}
