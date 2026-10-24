// bm-trang «Trang chủ» (FR-06.01) — bảng điều khiển theo từng Con. Bố cục 02 «Việc chờ lên đầu» (Thanh 24/10): việc chờ Ba Mẹ ngay dưới chip
// Con, Duyệt / Từ chối tại chỗ (lib/viec-cho); rồi thẻ trạng thái gọn + «Khoá máy» (có hạn giờ),
// lưới tính năng (Trang web · Ứng dụng · Giờ dùng máy · Thời gian màn hình · Máy · Nhiệm vụ) — mỗi ô một màn, ghi luôn tình trạng hiện tại
// để Ba Mẹ biết mà không phải mở; 3 điều để khen, cảnh báo cần xem. Việc hằng ngày đều ở đây, «Gia đình» chỉ còn việc ít đụng.
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, laChiXem, type AppChuaXep, type CanhBao, type ConChiTiet, type ConNgan, type GiaDinh, type LuotCho, type PhienDang, type ThongKeWeb, type TuanThuMay, type YeuCau } from "@/lib/api";
import { TheViecCho, type Phieu, type ViecCho } from "@/lib/viec-cho";
import { AppMoi, NutThemMay, TheDangChoi, TheMay } from "@/lib/viec-nhanh";
import { ChuongTb } from "@/lib/chuong-tb";
import { BangKhoa, cauKhoa, cauMoTam, conHan, moLaiMay } from "@/lib/khoa-may";
import {
  Avt, BaoLoi, BieuTron, Canh, CanhGiua, ChoTai, Chu, Dong, Icon, M, MAU_CON, Man, Nhan, Nhom, Nut, The, Tien, truoc, useHoanTac, useLam, useTai,
  type MauBt, type TenIcon,
} from "@/lib/ui";

type Luat = { chuaXep: AppChuaXep[]; ds: { child_id: string; loai: string }[] };
type ChoDuyet = { nhiemVu: LuotCho[]; yeuCau: YeuCau[]; phieu?: Phieu[] };

export default function TrangChu() {
  const { d, loi, matMang, tai, dangTai } = useTai(async () => {
    const [g, cb, luat, choi, tt, toi, cd] = await Promise.all([
      bm.goi<GiaDinh>("gia-dinh"), bm.goi<{ ds: CanhBao[] }>("canh-bao"), bm.goi<Luat>("luat").catch(() => null),
      bm.goi<{ ds: PhienDang[] }>("phien-dang").catch(() => null),            // máy chủ cũ chưa có ⇒ không hiện thẻ «Đang chơi»
      // thẻ máy: chế độ + bảo vệ từ MỘT nguồn (tuan-thu), tải MỘT lần cho cả nhà (đổi Con không gọi lại); lỗi ⇒ ẩn thẻ, không chặn cả trang
      bm.goi<{ ds: TuanThuMay[] }>("tuan-thu?nhe=1").catch(() => null),  // nhẹ: không quét mất nhịp (màn Máy làm)
      laChiXem(),                                                            // quyền Chỉ xem ⇒ ẩn nút việc nhanh (máy chủ trả 403 chi_xem)
      bm.goi<ChoDuyet>("cho-duyet").catch(() => null),                       // việc chờ duyệt tại chỗ; lỗi ⇒ thẻ tóm tắt số đếm như cũ
    ]);
    return { g, cb: cb.ds.filter((x) => !x.da_doc), luat, choi: choi?.ds ?? [], tt: tt?.ds ?? [], xem: toi, cd };
  });
  const [chon, setChon] = useState(0);
  const { bao, noi } = useHoanTac();
  if (!d) return <Man tieuLon="Trang chủ" chat><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!d.g.con.length) {
    return (
      <Man tieuLon="Trang chủ" chat>
        <CanhGiua lv="canh-trong" tieu="Chưa có Con nào" loi="Thêm hồ sơ Con đầu tiên để bắt đầu.">
          <Nut chu="Thêm Con" ic="cong" bam={() => router.push("/thiet-lap/ten-con")} />
        </CanhGiua>
      </Man>
    );
  }
  const i = Math.min(chon, d.g.con.length - 1);
  const c = d.g.con[i];
  return (
    <Man tieuLon="Trang chủ" chat tai={tai} dangTai={dangTai} noi={noi}>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }} accessibilityRole="tablist">
        {d.g.con.map((x, k) => (
          <Pressable key={x.id} onPress={() => setChon(k)} accessibilityRole="tab" accessibilityState={{ selected: k === i }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingLeft: 6, paddingRight: 12, borderRadius: 99, borderWidth: 1.5,
              borderColor: k === i ? M.nut : M.vien2, backgroundColor: k === i ? M.nut : "#fff" }}>
            <Avt ten={x.ten} mau={MAU_CON[k % MAU_CON.length]} co={30} />
            <Chu kieu="dam" co={14.5} mau={k === i ? "#fff" : M.chu2}>{x.ten}</Chu>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push("/thiet-lap/ten-con")} accessibilityRole="button" accessibilityLabel="Thêm Con"
          style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1.5, borderColor: M.vien2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Icon ten="cong" mau={M.chu2} />
        </Pressable>
        <View style={{ marginLeft: "auto" }}><ChuongTb /></View>
      </View>
      <BangCon key={c.id} c={c} canhBao={d.cb.filter((x) => !x.child_id || x.child_id === c.id)} luat={d.luat} choi={d.choi.filter((p) => p.con === c.id)}
        mayTt={d.tt.filter((m) => m.con === c.id || m.dungChung)} xem={d.xem} taiLai={tai} bao={bao}
        viec={d.cd ? [...d.cd.nhiemVu.filter((x) => x.child_id === c.id).map((x): ViecCho => ({ k: "nv", x })),
          ...d.cd.yeuCau.filter((x) => x.child_id === c.id).map((x): ViecCho => ({ k: "yc", x })),
          ...(d.cd.phieu ?? []).filter((x) => x.child_id === c.id).map((x): ViecCho => ({ k: "qua", x }))] : null} />
    </Man>
  );
}

function BangCon({ c, canhBao, luat, choi, mayTt, xem, taiLai, bao, viec }: {
  c: ConNgan; canhBao: CanhBao[]; luat: Luat | null; choi: PhienDang[]; mayTt: TuanThuMay[]; xem: boolean; taiLai: () => void; bao: (chu: string, hoan?: () => void) => void;
  viec: ViecCho[] | null;
}) {
  const ct = useTai(() => bm.goi<ConChiTiet>(`con/${c.id}`));
  const web = useTai(() => bm.goi<ThongKeWeb>(`con/${c.id}/web?ngay=1`).catch(() => null));
  const [khoa, setKhoa] = useState(false);
  const { lam, dangChay } = useLam();
  const may = ct.d?.may ?? [];
  const dangDung = may.find((m) => m.truc);
  // màn không tự tải lại: hạn khoá đã qua thì coi như đã mở, khớp server (cau-hinh.ts › khoaGoc). Đang mở tạm vẫn là «khoá» ⇒ moTam
  const khoaNgay = !!ct.d?.khoaNgay && conHan(ct.d.khoaDen);
  const moTam = khoaNgay ? cauMoTam(ct.d?.moTamDen, ct.d?.khoaDen) : null;
  const cho = c.nhiemVuCho + c.yeuCauCho + (c.phieuCho ?? 0);
  const conGiay = c.conPhut ?? Math.max(0, c.tranNgay - c.phutChoi);   // máy chủ tính theo trần ngày lẫn tuần + thêm giờ; máy chủ cũ không gửi
  const tai = () => { ct.tai(); taiLai(); };
  const moLai = () => lam(async () => { await moLaiMay(c.id, c.ten, bao, tai); tai(); });

  // dòng trạng thái của từng ô — chỉ hiện số khi đã tải được, không đoán
  const chanWeb = web.d ? web.d.luat.filter((l) => l.trangThai === "chan") : null;
  const chanApp = luat ? luat.ds.filter((l) => l.loai === "chan" && (!l.child_id || l.child_id === c.id)).length : null;
  const chuaXep = luat?.chuaXep.length ?? 0;
  const lich = ct.d?.lich;
  const o: { tieu: string; phu: string; ic: TenIcon; mau: MauBt; di: string; nhan?: string }[] = [
    { tieu: "Trang web", ic: "web", mau: "lam", di: `/web/${c.id}`,
      phu: !web.d ? "Chặn hoặc cho phép từng trang" : web.d.cheDoWeb === "chi_cho_phep" ? "Chỉ vào trang đã duyệt"
        : chanWeb!.length ? `Đang chặn ${chanWeb!.length} trang · ${chanWeb!.slice(0, 2).map((l) => l.tenMien.replace(/\.(com|vn|net|org)$/, "")).join(", ")}` : "Chưa chặn trang nào" },
    { tieu: "Ứng dụng", ic: "luoi", mau: "tim", di: "/app-web", nhan: chuaXep ? `${chuaXep} mới` : undefined,
      phu: chanApp === null ? "Học tập, giải trí, chặn" : `${chanApp ? `${chanApp} bị chặn` : "Chưa chặn app nào"}${chuaXep ? ` · ${chuaXep} chưa xếp` : ""}` },
    { tieu: "Giờ dùng máy", ic: "dongho", mau: "cam", di: `/gio/${c.id}`,
      phu: lich ? `${c.tranNgay} phút/ngày · ngủ ${lich.ngu.tu}` : `${c.tranNgay} phút/ngày` },
    { tieu: "Thời gian màn hình", ic: "cot", mau: "xanh", di: `/man-hinh/${c.id}`,
      phu: web.d ? `Web hôm nay ${Math.round(web.d.homNay.giay / 60)} phút · giải trí ${c.phutChoi} phút` : `Giải trí hôm nay ${c.phutChoi} phút` },
    { tieu: "Máy tính & điện thoại", ic: "may_tinh", mau: "xam", di: may.length === 1 ? `/may/${may[0].id}` : `/may?con=${c.id}`,
      phu: !ct.d ? "Chặn thật, mở khẩn cấp" : !may.length ? "Chưa ghép máy nào" : `${may.length} máy · ${may.filter((m) => m.truc).length} đang mở` },
    { tieu: "Nhiệm vụ", ic: "sao", mau: "vang", di: "/diem-qua",
      phu: `Ví ${c.soDu} điểm${c.phutDoiDuoc !== undefined ? ` (đổi ≈ ${c.phutDoiDuoc} phút chơi)` : ""}${c.nhiemVuCho ? ` · ${c.nhiemVuCho} chờ duyệt` : ""}` },
  ];

  return (
    <>
      {viec ? <TheViecCho ds={viec} ten={c.ten} xem={xem} tai={tai} bao={bao} /> : (
        <Pressable onPress={() => router.push("/cho-duyet")} accessibilityRole="button"
          style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 44, borderRadius: 20, borderWidth: 1, borderColor: cho ? "#f3c8bf" : M.vien, backgroundColor: cho ? "#fff8f6" : "#fff" }}>
          <BieuTron ic="chuong" mau={cho ? "do" : "xanh"} />
          <View style={{ flex: 1 }}>
            <Chu kieu="rat" co={16}>{cho ? `${cho} việc chờ Ba Mẹ` : "Không có việc nào chờ"}</Chu>
            <Chu co={13.5} mau={M.chu3}>{cho ? `${c.nhiemVuCho} nhiệm vụ · ${c.yeuCauCho} yêu cầu${c.phieuCho ? ` · ${c.phieuCho} quà` : ""}` : "Khi Con nộp hay xin phép, Rob báo Ba Mẹ ngay"}</Chu>
          </View>
          <Icon ten="phai" mau={M.chu3} />
        </Pressable>
      )}

      <The dem>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {khoaNgay ? <BieuTron ic={moTam ? "dongho" : "khoa"} mau={moTam ? "cam" : "do"} /> : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            {khoaNgay ? (
              <>
                <Chu kieu="dam" co={13} mau={moTam ? M.chu2 : M.loi}>{moTam ? `${c.ten} · ${moTam}` : `${c.ten} · máy đang khoá`}</Chu>
                <Chu kieu="rat" co={20}>{cauKhoa(ct.d?.khoaDen)}</Chu>
              </>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dangDung ? M.chinh : M.chu3 }} />
                  <Chu kieu="dam" co={13} mau={M.chu3} dong={1} style={{ flexShrink: 1 }}>
                    {!ct.d ? c.ten : dangDung ? `${dangDung.ten} · đang mở` : may.length ? `Máy offline · ${truoc(may[0].lanCuoi) || "chưa đồng bộ"}` : "Chưa ghép máy"}
                  </Chu>
                </View>
                <Chu kieu="rat" co={20} so>{conGiay ? `Còn ${conGiay} phút` : "Hết giờ giải trí"}</Chu>
              </>
            )}
          </View>
          <View>
            {khoaNgay ? <Nut chu="Mở lại" ic="mo_khoa" nho dangChay={dangChay} bam={moLai} nhanDoc={`Mở lại máy của ${c.ten}`} />
              : <Nut chu="Khoá máy" ic="khoa" nho tat={!ct.d} bam={() => setKhoa(true)} nhanDoc={`Khoá máy của ${c.ten} ngay`} />}
          </View>
        </View>
        {khoaNgay ? null : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}><Tien ti={c.phutChoi + conGiay ? Math.min(1, c.phutChoi / (c.phutChoi + conGiay)) : 0} mau={M.chinh} /></View>
            <Chu kieu="dam" co={13} mau={M.chu3} so>{`${c.phutChoi}/${c.phutChoi + conGiay} phút giải trí`}</Chu>
          </View>
        )}
        {ct.loi ? <View style={{ marginTop: 10, gap: 8 }}><BaoLoi loi={ct.loi} /><Nut chu="Thử lại" loai="vien" nho bam={ct.tai} /></View> : null}
      </The>

      <AppMoi ds={luat?.chuaXep ?? []} tai={tai} bao={bao} xem={xem} />
      {choi.map((p) => <TheDangChoi key={p.id} p={p} tai={tai} bao={bao} xem={xem} />)}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {o.map((x) => <OTinhNang key={x.tieu} {...x} />)}
      </View>

      {xem ? null : <Nut chu="Giao nhiệm vụ" ic="cong" rong bam={() => router.push(`/giao-nv?con=${c.id}`)} nhanDoc={`Giao nhiệm vụ cho ${c.ten}`} />}

      {canhBao.length ? (
        <Nhom>
          <Dong dau tieu={`${canhBao.length} cảnh báo cần xem`} phu={canhBao[0].noi_dung} trai={<BieuTron ic="canh_bao" mau="cam" />} bam={() => router.push("/canh-bao")} />
        </Nhom>
      ) : null}

      {mayTt.map((m) => <TheMay key={m.id} m={m} tai={tai} bao={bao} xem={xem} />)}
      {xem ? null : <NutThemMay id={c.id} ten={c.ten} nhom={c.nhom} />}

      <Canh lv="sao" thap tieu={`Hôm nay ${c.ten} đã…`} loi={c.homNayConDa.length ? c.homNayConDa.join(" · ") : "Chưa có nhiệm vụ nào được duyệt hôm nay."}>
        <Pressable onPress={() => router.push(`/loi-khen/${c.id}`)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
          <Nhan chu="Gửi lời khen" ic="tim" />
        </Pressable>
      </Canh>

      <BangKhoa mo={khoa} dong={() => setKhoa(false)} con={c.id} ten={c.ten}
        xong={(chu, hoan) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); }} />
    </>
  );
}

/** Một ô tính năng trên trang chủ: icon, tên, tình trạng hiện tại; chạm là sang màn của tính năng đó. */
function OTinhNang({ tieu, phu, ic, mau, di, nhan }: { tieu: string; phu: string; ic: TenIcon; mau: MauBt; di: string; nhan?: string }) {
  return (
    <Pressable onPress={() => router.push(di as never)} accessibilityRole="button" accessibilityLabel={`${tieu}. ${phu}`}
      style={({ pressed }) => ({ flexBasis: "30%", flexGrow: 1, minHeight: 116, padding: 12, gap: 6, borderRadius: 20, borderWidth: 1, borderColor: M.vien,
        backgroundColor: pressed ? M.nen : "#fff" })}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <BieuTron ic={ic} mau={mau} />
        {nhan ? <Nhan chu={nhan} loai="canh" /> : null}
      </View>
      <Chu kieu="rat" co={15}>{tieu}</Chu>
      <Chu co={13} mau={M.chu2} dong={3}>{phu}</Chu>
    </Pressable>
  );
}
