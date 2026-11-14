// Danh sách nhiệm vụ chờ duyệt của một Con (thiết kế chốt bm-hang-ngay/23 «Bảo Anh nộp việc · 2 chờ duyệt»): mỗi lượt một thẻ có bằng chứng
// THU NHỎ (ảnh đầu / khối sóng ghi âm — tải lười theo thẻ), giờ nộp, sao; bấm thẻ mở màn bằng chứng. Đáy: «Duyệt cả n · <Con> nhận S sao»
// (POST duyet-hang-loat kèm lời khen). Trống ⇒ 31 «Duyệt hết rồi!». Mất mạng lúc duyệt cả loạt ⇒ 32: lựa chọn giữ lại, có mạng tự gửi (useLam hangDoi).
// `?con=` tuỳ chọn — không có thì mọi Con.
import { memo, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Image } from "expo-image";
import { bm } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { cachBao, SaoVien, type BangChung, type ChoDuyetMoi, type LuotChoMoi } from "@/lib/hang-ngay";
import { SongAm } from "@/lib/song-am";
import { BangMang, BaoLoi, CanhGiua, ChoTai, Chu, gioPhut, Icon, Icon3D, M, Man, NhanMen, Nut, Rob, TickDong, useLam, useTai } from "@/lib/ui";

const KHEN_LOAT = "Giỏi lắm con!";

/** «Ảnh trước & sau» / «Ghi âm con đọc» / «Bấm Xong» — dòng mô tả cách nộp. */
const cauNop = (x: LuotChoMoi) => (x.so_ghi_am ? "Ghi âm con đọc" : x.so_anh > 1 ? "Ảnh trước & sau" : x.so_anh ? "Ảnh con chụp" : `Con ${cachBao(x.bang_chung)}`);
const laGhiAm = (x: LuotChoMoi) => !!x.so_ghi_am || x.bang_chung === "ghi_am";

export default function DuyetDs() {
  const { con } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const cd = await bm.goi<ChoDuyetMoi>("cho-duyet");
    const ds = cd.nhiemVu.filter((x) => !con || x.child_id === con);
    // không ?con= mà nhiều Con cùng chờ ⇒ không lấy ví / tên của Con đầu (sai cho cả hai — review PR #183)
    const conId = con ?? (new Set(ds.map((x) => x.child_id)).size === 1 ? ds[0]?.child_id : undefined);
    // ba lời gọi độc lập ⇒ song song (review PR #183)
    const [vi, ct, quy] = await Promise.all([
      conId ? bm.goi<{ soDu: number; sao?: number }>(`con/${conId}/vi`).catch(() => null) : null,
      conId && !ds[0] ? bm.goi<{ ten: string }>(`con/${conId}`).catch(() => null) : null,
      conId ? bm.goi<{ quy: { tyLe: { sao: number; phut: number } } }>(`con/${conId}/quy`).catch(() => null) : null,
    ]);
    const ten = ds[0]?.ten_con ?? ct?.ten;
    return { ds, conId, ten: ten ?? "Con", sao: vi ? (vi.sao ?? vi.soDu) : null, tyLe: quy?.quy.tyLe ?? { sao: 10, phut: 10 } };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const [guiLoat, setGuiLoat] = useState(false);
  if (!d) return <Man lui={{ chu: "Nhiệm vụ" }} tieu="Chờ duyệt"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const nhieuCon = new Set(d.ds.map((x) => x.child_id)).size > 1;
  const ten = nhieuCon ? "Các con" : d.ten;
  const tong = d.ds.reduce((n, x) => n + (x.sao ?? x.diem), 0);
  const phutCua = (s: number) => Math.floor((s * d.tyLe.phut) / d.tyLe.sao);

  if (!d.ds.length) {
    // 31 «Không còn việc chờ duyệt»
    return (
      <Man lui={{ chu: "Nhiệm vụ" }} tieu="Chờ duyệt" day={<>
        <Nut chu={`Thêm việc cho ${d.ten}`} ic="cong" rong bam={() => router.push((d.conId ? `/giao-nv?con=${d.conId}` : "/giao-nv") as never)} />
        <Nut chu="Về Trang chủ" loai="vien" rong bam={() => router.replace("/hom-nay" as never)} />
      </>}>
        <CanhGiua lv="xong" tieu="Duyệt hết rồi!" loi="Không còn việc nào chờ Ba Mẹ. Con nộp việc mới, Grow sẽ báo ngay.">
          {d.sao !== null ? (
            <View style={[{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 22, backgroundColor: M.diemSoft }, KHOI.vien]}>
              <Chu kieu="rat" co={15} mau={M.diemInk}>{`${d.ten} có ${d.sao} sao = ${phutCua(d.sao)} phút chơi`}</Chu>
            </View>
          ) : null}
        </CanhGiua>
      </Man>
    );
  }

  const duyetCa = () => {
    setGuiLoat(true);
    return lam(async () => {
      const r = await bm.goi<{ daDuyet: number; sao: number }>("duyet-hang-loat", { ids: d.ds.map((x) => x.id), loiKhen: KHEN_LOAT });
      router.replace({ pathname: "/duyet-xong", params: {
        loat: "1", con: d.conId ?? "", ten, sao: String(r.sao || tong), khen: KHEN_LOAT, ids: d.ds.map((x) => x.id).join(","),
        ds: JSON.stringify(d.ds.map((x) => ({ t: x.ten, s: x.sao ?? x.diem }))),
      } } as never);
    }, { hangDoi: true }).finally(() => setGuiLoat(false));
  };
  // 32 «Mất mạng khi đang duyệt»: đang chờ mạng để gửi lại cả loạt
  const choMang = guiLoat && dangChay && !!loiLam;

  return (
    <Man lui={{ chu: "Nhiệm vụ" }} tieu={`${ten} nộp việc`} tai={tai}
      phai={<View style={{ paddingHorizontal: 11, paddingVertical: 4, borderRadius: 13, backgroundColor: M.huy }}><Chu kieu="rat" co={13} mau="#fff" so>{`${d.ds.length} chờ duyệt`}</Chu></View>}
      day={<>
        <Nut chu={d.ds.length > 1 ? `Duyệt cả ${d.ds.length} · ${ten} nhận ${tong} sao` : `Duyệt · ${ten} nhận ${tong} sao`} ic="tick" rong dangChay={dangChay} bam={duyetCa} />
      </>}>
      {choMang ? (
        <>
          <BangMang chu="Điện thoại đang mất mạng · Lựa chọn của Ba Mẹ vẫn được giữ, có mạng là tự gửi." />
          <View style={[{ padding: 16, borderRadius: 28, backgroundColor: M.the, gap: 2 }, KHOI.the]}>
            <Chu kieu="rat" co={16}>{`Đã duyệt, chờ gửi · ${d.ds.length} việc`}</Chu>
            {d.ds.map((x) => <TickDong key={x.id} trang="cho" chu={x.ten} phu={`+${x.sao ?? x.diem} sao · kèm lời khen · Chờ mạng`} />)}
            <Chu co={13.5} mau={M.chu3}>{`${ten} sẽ nhận ${tong} sao ngay khi gửi xong. Ba Mẹ không cần duyệt lại.`}</Chu>
          </View>
        </>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 22, backgroundColor: "#dcebe6" }}>
          <Rob ten="chi" co={40} />
          <Chu kieu="dam" co={14} mau={M.chinhInk} style={{ flex: 1 }}>Xem ảnh, nghe ghi âm con nộp. Thấy ổn thì duyệt, con nhận sao.</Chu>
        </View>
      )}
      {!choMang ? <BaoLoi loi={loiLam} /> : null}
      {d.ds.map((x) => <TheLuot key={x.id} x={x} nhieuCon={nhieuCon} />)}
    </Man>
  );
}

/** Thẻ một lượt nộp: ô bằng chứng thu nhỏ 104 bên trái, tên + cách nộp + giờ + sao, nút «Xem ảnh để duyệt ›». */
const TheLuot = memo(function TheLuot({ x, nhieuCon }: { x: LuotChoMoi; nhieuCon: boolean }) {
  const ghiAm = laGhiAm(x);
  const mo = () => router.push(`/duyet/${x.id}` as never);
  return (
    <NhanMen onPress={mo} accessibilityRole="button" accessibilityLabel={`${x.ten}, ${ghiAm ? "nghe ghi âm" : "xem ảnh"} để duyệt`} muc="khoi" sang
      style={[{ padding: 16, borderRadius: 30, backgroundColor: M.the, gap: 10 }, KHOI.the]}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <ThuNho x={x} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Chu kieu="rat" co={17}>{x.ten}</Chu>
          <Chu kieu="dam" co={13} mau={M.chu3}>{`${nhieuCon ? `${x.ten_con} · ` : ""}${cauNop(x)}`}</Chu>
          <Chu kieu="dam" co={13} mau={M.chu3}>{`Nộp lúc ${gioPhut(x.nop_luc)}`}</Chu>
          <View style={{ marginTop: 6 }}><SaoVien n={x.sao ?? x.diem} nho /></View>
        </View>
      </View>
      {/* thiết kế 08: viên TRẮNG nổi + icon 3D (máy ảnh / micro) «Xem ảnh để duyệt ›» */}
      <View style={[{ minHeight: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: "#fff" }, KHOI.nho]}>
        <Icon3D ten={ghiAm ? "tai" : "camera"} co={20} />
        <Chu kieu="rat" co={14.5} mau={M.chu}>{`${ghiAm ? "Nghe ghi âm để duyệt" : x.so_anh ? "Xem ảnh để duyệt" : "Xem để duyệt"} ›`}</Chu>
      </View>
    </NhanMen>
  );
});

/** Ô bằng chứng thu nhỏ — tải lười GET luot/:id/bang-chung khi thẻ hiện. Ghi âm ⇒ khối sóng; không có tệp ⇒ hình nhiệm vụ. */
function ThuNho({ x }: { x: LuotChoMoi }) {
  const [bc, setBc] = useState<BangChung[] | null>(null);
  useEffect(() => {
    if (!x.so_anh) return;
    let bo = false;
    bm.goi<{ ds: BangChung[] }>(`luot/${x.id}/bang-chung`).then((r) => { if (!bo) setBc(r.ds); }, () => {});
    return () => { bo = true; };
  }, [x.id, x.so_anh]);
  const anh = bc?.filter((b) => b.loai === "anh") ?? [];
  const o = { width: 104, height: 104, borderRadius: 22, overflow: "hidden" as const };
  if (laGhiAm(x)) {
    return (
      <View style={[o, { backgroundColor: M.chinhSoft, justifyContent: "center", paddingHorizontal: 12 }]}>
        <SongAm cot={12} cao={44} />
        <View style={{ position: "absolute", left: 6, bottom: 6, paddingHorizontal: 7, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.92)" }}>
          <Chu kieu="rat" co={11} mau={M.chu2}>Ghi âm</Chu>
        </View>
      </View>
    );
  }
  return (
    <View style={[o, { backgroundColor: "#f6e7cf", alignItems: "center", justifyContent: "center" }]}>
      {anh[0] ? <Image source={{ uri: `data:${anh[0].mime};base64,${anh[0].base64}` }} style={{ width: 104, height: 104 }} contentFit="cover"
        accessibilityLabel={`Ảnh ${x.ten_con} nộp`} /> : <Icon ten={x.so_anh ? "camera" : "tick"} mau={M.chu3} co={30} />}
      {x.so_anh > 1 ? (
        <View style={{ position: "absolute", right: 6, top: 6, paddingHorizontal: 7, borderRadius: 9, backgroundColor: "rgba(15,19,18,0.62)" }}>
          <Chu kieu="rat" co={11} mau="#fff">{`${x.so_anh} ảnh`}</Chu>
        </View>
      ) : null}
    </View>
  );
}
