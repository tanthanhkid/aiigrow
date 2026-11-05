// bm2-web «Trang web» (thiết kế chốt bm-ung-dung/05): «Luôn chặn» (web người lớn, cờ bạc, bạo lực — Luôn bật), hàng vàng «Con xin mở …»,
// «Được phép · N trang» (công tắc tắt = chặn), «Đã chặn · N trang» (công tắc bật = cho phép), nút «Thêm trang web cho <con>».
// Ghi: POST con/:id/web/trang {muc, trangThai: cho_phep | chan, caNha} (luật cả nhà giữ cả nhà); trang «Tính vào giờ chơi» = luật giai_tri.
// Không còn «Giám sát / Chặn thật» (máy luôn chặn thật), không còn thống kê ở màn này (Thời gian màn hình lo).
import { router, useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type ConChiTiet, type ThongKeWeb, type TrangThaiWeb, type YeuCau } from "@/lib/api";
import { HangVang, MucTieu, NhanLuon, OIcon, icCuaApp, phuXin, tieuXin } from "@/lib/ui-bm3";
import { KHOI } from "@/lib/clay";
import { BaoLoi, ChoTai, Chu, CongTac, Dong, M, Man, NhanMen, Nhom, Nut, useHoanTac, useLam, useTai } from "@/lib/ui";
import { View } from "react-native";

type LuatWeb = ThongKeWeb["luat"][number];

export default function WebCon() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [w, ct, cd, xem] = await Promise.all([
      bm.goi<ThongKeWeb>(`con/${con}/web?ngay=1`), bm.goi<ConChiTiet>(`con/${con}`),
      bm.goi<{ yeuCau: YeuCau[] }>("cho-duyet").catch(() => ({ yeuCau: [] as YeuCau[] })), laChiXem(),
    ]);
    return { w, ten: ct.ten, xin: cd.yeuCau.filter((y) => y.child_id === con && y.loai === "mo_web"), xem };
  });
  const { lam, loi: loiLam } = useLam();
  const { bao, noi } = useHoanTac();
  if (!d) return <Man lui={{ chu: "" }} tieu="Trang web"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  // một tên miền có thể có luật cả nhà lẫn luật riêng của con ⇒ luật riêng của con thắng (như máy chủ áp), mỗi tên miền một dòng
  const hieuLuc = new Map<string, LuatWeb>();
  for (const l of d.w.luat) if (l.nguon === "gia_dinh") hieuLuc.set(l.tenMien, l);
  for (const l of d.w.luat) if (l.nguon === "con") hieuLuc.set(l.tenMien, l);
  const ds = [...hieuLuc.values()];
  const duoc = ds.filter((l) => l.trangThai === "cho_phep" || l.trangThai === "giai_tri");
  const chan = ds.filter((l) => l.trangThai === "chan");
  const dat = (l: LuatWeb, trangThai: "cho_phep" | "chan") => lam(async () => {
    const caNha = l.nguon === "gia_dinh";
    await bm.goi(`con/${con}/web/trang`, { muc: l.tenMien, trangThai, caNha });
    await tai();
    const lai: Record<TrangThaiWeb, "cho_phep" | "chan" | "mac_dinh"> = { cho_phep: "cho_phep", chan: "chan", giai_tri: "cho_phep", he_thong: "mac_dinh", chua_xep: "mac_dinh" };
    bao(`${trangThai === "chan" ? "Đã chặn" : "Đã cho phép"} ${l.tenMien}${caNha ? " cho cả nhà" : ""}`, () => {
      (l.trangThai === "giai_tri" ? bm.goi("luat", { con: caNha ? undefined : con, muc: l.tenMien, loai: "giai_tri" }) : bm.goi(`con/${con}/web/trang`, { muc: l.tenMien, trangThai: lai[l.trangThai], caNha }))
        .then(() => tai(), () => tai());
    });
  });
  return (
    <Man lui={{ chu: "" }} tieu="Trang web" noi={noi} tai={tai} vongTai
      day={d.xem ? undefined : <Nut chu={`Thêm trang web cho ${d.ten}`} rong bam={() => router.push({ pathname: "/web/them", params: { con } })} />}>
      <NhanMen onPress={() => router.push("/web/luon-chan")} accessibilityRole="button" accessibilityLabel="Luôn chặn: web người lớn, cờ bạc, bạo lực" muc="khoi"
        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 26, backgroundColor: M.chinhSoft, ...KHOI.the }}>
        <OIcon ic="khien" nen="#fff" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={15.5}>Luôn chặn</Chu>
          <Chu kieu="dam" co={12.5} mau={M.chu3}>Web người lớn, cờ bạc, bạo lực</Chu>
        </View>
        <NhanLuon />
      </NhanMen>
      {d.xin.map((y) => <HangVang key={y.id} tieu={tieuXin(y)} phu={phuXin(y)} bam={() => router.push({ pathname: "/yeu-cau-web/[id]", params: { id: y.id } })} />)}
      <BaoLoi loi={loiLam} />

      <MucTieu chu={`Được phép · ${duoc.length} trang`} />
      <Nhom>
        {duoc.length ? duoc.map((l, i) => (
          <Dong key={l.tenMien} dau={i === 0} tieu={l.tenMien} phu={`${l.trangThai === "giai_tri" ? "Tính vào giờ chơi" : "Không tính giờ"}${l.nguon === "gia_dinh" ? " · cả nhà" : ""}`}
            trai={<OIcon ic={l.trangThai === "giai_tri" ? "game" : icCuaApp(l.tenMien) === "web" ? "sach" : icCuaApp(l.tenMien)} />}
            phai={d.xem ? undefined : <CongTac bat nhan={`${l.tenMien}: đang cho phép`} doi={() => dat(l, "chan")} />} />
        )) : <Dong dau tieu="Chưa cho phép trang nào" phu="Trang lạ con phải xin Ba Mẹ" trai={<OIcon ic="web" />} />}
      </Nhom>

      {chan.length ? (
        <>
          <MucTieu chu={`Đã chặn · ${chan.length} trang`} />
          <Nhom>
            {chan.map((l, i) => (
              <Dong key={l.tenMien} dau={i === 0} tieu={l.tenMien} phu={l.nguon === "gia_dinh" ? "Ba Mẹ chặn cả nhà" : "Ba Mẹ chặn"} trai={<OIcon ic="x" />}
                phai={d.xem ? undefined : <CongTac bat={false} nhan={`${l.tenMien}: đang chặn`} doi={() => dat(l, "cho_phep")} />} />
            ))}
          </Nhom>
        </>
      ) : null}
    </Man>
  );
}
