// Danh sách nhiệm vụ chờ duyệt của một Con (bàn 17/11 them-nl1nwszs@v5 «Bảo Anh nộp việc · 2 chờ duyệt»; trống them-oypre8gc@v4; mất mạng them-rqioc0fd@v3): mỗi lượt một thẻ có bằng chứng
// THU NHỎ (ảnh đầu / khối sóng ghi âm — tải lười theo thẻ), giờ nộp, sao; bấm thẻ mở màn bằng chứng. Đáy: «Duyệt cả n · <Con> nhận S sao»
// (POST duyet-hang-loat kèm lời khen). Trống ⇒ 31 «Duyệt hết rồi!». Mất mạng lúc duyệt cả loạt ⇒ 32: lựa chọn giữ lại, có mạng tự gửi (useLam hangDoi).
// `?con=` tuỳ chọn — không có thì mọi Con.
import { memo, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Image } from "expo-image";
import { bm } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { cachBao, HangViec, hinhNv, SaoVien, TieuMuc, type BangChung, type ChoDuyetMoi, type LuotChoMoi } from "@/lib/hang-ngay";
import { SongAm } from "@/lib/song-am";
import { MAU_NO, soVN } from "@/lib/so-sao";
import { BaoLoi, CanhGiua, ChoTai, Chu, gioPhut, Icon, Icon3D, M, Man, NhanMen, Nut, Rob, The, useLam, useTai } from "@/lib/ui";

const KHEN_LOAT = "Giỏi lắm con!";

/** «Ảnh trước & sau» / «Ghi âm con đọc» / «Bấm Xong» — dòng mô tả cách nộp. */
const cauNop = (x: LuotChoMoi) => (x.so_ghi_am ? "Ghi âm con đọc" : x.so_anh > 1 ? "Ảnh trước & sau" : x.so_anh ? "Ảnh con chụp" : x.ghi_chu && x.bang_chung !== "xong" ? "Con viết bài" : `Con ${cachBao(x.bang_chung)}`);
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
      conId ? bm.goi<{ soDu: number; sao?: number; no?: number }>(`con/${conId}/vi`).catch(() => null) : null,
      conId && !ds[0] ? bm.goi<{ ten: string }>(`con/${conId}`).catch(() => null) : null,
      conId ? bm.goi<{ quy: { tyLe: { sao: number; phut: number } } }>(`con/${conId}/quy`).catch(() => null) : null,
    ]);
    const ten = ds[0]?.ten_con ?? ct?.ten;
    return { ds, conId, ten: ten ?? "Con", sao: vi ? (vi.sao ?? vi.soDu) : null, no: vi?.no ?? 0, tyLe: quy?.quy.tyLe ?? { sao: 10, phut: 10 } };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const [guiLoat, setGuiLoat] = useState(false);
  if (!d) return <Man lui={{ chu: "Việc & quà" }} tieu="Chờ duyệt"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const nhieuCon = new Set(d.ds.map((x) => x.child_id)).size > 1;
  const ten = nhieuCon ? "Các con" : d.ten;
  const tong = d.ds.reduce((n, x) => n + (x.sao ?? x.diem), 0);

  if (!d.ds.length) {
    // 31 «Không còn việc chờ duyệt»
    return (
      <Man lui={{ chu: "Việc & quà" }} tieu="Chờ duyệt" day={<>
        <Nut chu={`Thêm việc cho ${d.ten}`} ic="cong" ic3d rong bam={() => router.push((d.conId ? `/giao-nv?con=${d.conId}` : "/giao-nv") as never)} />
        <Nut chu="Về Hôm nay" loai="ma" rong bam={() => router.replace("/hom-nay" as never)} />
      </>}>
        <CanhGiua lv="xong" tieu="Duyệt hết rồi!" loi="Không còn việc nào chờ Ba Mẹ. Con nộp việc mới, Grow sẽ báo ngay.">
          {d.sao !== null ? (
            <View style={[{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 22, backgroundColor: M.diemSoft }, KHOI.vien]}>
              <Icon3D ten="sao" co={26} />
              <Chu kieu="rat" co={15} mau={M.diemInk}>{d.no > 0 || d.sao < 0 ? `${d.ten} đang nợ Ba Mẹ ${soVN(d.no > 0 ? d.no : -d.sao)} sao` : d.sao > 0 ? `${d.ten} có ${soVN(d.sao)} sao` : `${d.ten} không còn nợ sao`}</Chu>
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
        ...(d.sao !== null && d.conId ? { saoTruoc: String(d.sao), noTruoc: String(d.no) } : {}),
      } } as never);
    }, { hangDoi: true }).finally(() => setGuiLoat(false));
  };
  // 32 «Mất mạng khi đang duyệt»: đang chờ mạng để gửi lại cả loạt
  const choMang = guiLoat && dangChay && !!loiLam;

  return (
    <Man lui={{ chu: "Việc & quà" }} tieu={`${ten} nộp việc`} tai={tai}
      phai={<View style={{ paddingHorizontal: 11, paddingVertical: 4, borderRadius: 13, backgroundColor: M.badge }}><Chu kieu="rat" co={13} mau={M.chu} so>{`${d.ds.length} chờ duyệt`}</Chu></View>}
      day={<>
        {choMang ? <Nut chu="Thử gửi lại ngay" ic="wifi" ic3d rong bam={duyetCa} />
          : <Nut chu={d.ds.length > 1 ? `Duyệt cả ${d.ds.length} · ${ten} nhận ${tong} sao` : `Duyệt · ${ten} nhận ${tong} sao`} ic="sao" ic3d rong dangChay={dangChay} bam={duyetCa} />}
        {choMang ? <Nut chu="Về Hôm nay" loai="ma" rong bam={() => router.replace("/hom-nay" as never)} /> : null}
      </>}>
      {choMang ? (
        // 32 «Mất mạng khi đang duyệt» (them-rqioc0fd@v3): thẻ đào + ô wifi 3D, «Đã duyệt, chờ gửi · n việc» với nhãn «Chờ mạng», dải ngọc Grow
        <>
          <View accessibilityRole="alert" style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 28, backgroundColor: MAU_NO.nen }, KHOI.the]}>
            <View style={[{ width: 52, height: 52, borderRadius: 18, backgroundColor: M.the, alignItems: "center", justifyContent: "center" }, KHOI.nho]}><Icon3D ten="wifi" co={32} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={17} mau={MAU_NO.chu}>Điện thoại đang mất mạng</Chu>
              <Chu kieu="dam" co={13.5} mau={M.chu2}>Lựa chọn của Ba Mẹ vẫn được giữ, có mạng là tự gửi.</Chu>
            </View>
          </View>
          <TieuMuc chu={`Đã duyệt, chờ gửi · ${d.ds.length} việc`} />
          <The>
            {d.ds.map((x, i) => {
              const [ic, mau] = hinhNv(x);
              return <HangViec key={x.id} dau={i === 0} ic={x.so_ghi_am ? "sach" : ic} mau={mau} tieu={x.ten} phu={`+${soVN(x.sao ?? x.diem)} sao · kèm lời khen`}
                phai={<View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: MAU_NO.nen }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: MAU_NO.chu }} /><Chu kieu="rat" co={13} mau={MAU_NO.chu}>Chờ mạng</Chu></View>} />;
            })}
          </The>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 22, backgroundColor: M.chinhSoft }}>
            <Rob ten="chi" co={56} />
            <Chu kieu="dam7" co={14} mau={M.chinhInk} style={{ flex: 1 }}>{`${ten} sẽ nhận ${tong} sao ngay khi gửi xong. Ba Mẹ không cần duyệt lại.`}</Chu>
          </View>
        </>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 22, backgroundColor: M.chinhSoft }}>
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
      <View style={[{ minHeight: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: M.the }, KHOI.nho]}>
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
        <SongAm cot={12} cao={60} mau={M.chinhInk} ti={1} />
        {/* thiết kế nl1nwszs: nút phát tròn đen giữa khối sóng */}
        <View style={{ position: "absolute", left: 32, top: 32, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(15,19,18,0.82)", alignItems: "center", justifyContent: "center" }}>
          <View style={{ marginLeft: 4, width: 0, height: 0, borderTopWidth: 8, borderBottomWidth: 8, borderLeftWidth: 13, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#FFFBF5" }} />
        </View>
        <View style={{ position: "absolute", left: 6, bottom: 6, paddingHorizontal: 7, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.92)" }}>
          <Chu kieu="rat" co={11} mau={M.chu2}>Ghi âm</Chu>
        </View>
      </View>
    );
  }
  return (
    <View style={[o, { backgroundColor: M.xamSoft, alignItems: "center", justifyContent: "center" }]}>
      {anh[0] ? <Image source={{ uri: `data:${anh[0].mime};base64,${anh[0].base64}` }} style={{ width: 104, height: 104 }} contentFit="cover"
        accessibilityLabel={`Ảnh ${x.ten_con} nộp`} /> : <Icon ten={x.so_anh ? "camera" : "tick"} mau={M.chu3} co={30} />}
      {x.so_anh > 1 ? (
        <View style={{ position: "absolute", right: 6, top: 6, paddingHorizontal: 7, borderRadius: 9, backgroundColor: "rgba(15,19,18,0.62)" }}>
          <Chu kieu="rat" co={11} mau="#FFFBF5">{`${x.so_anh} ảnh`}</Chu>
        </View>
      ) : null}
    </View>
  );
}
