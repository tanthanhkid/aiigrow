// «Hôm nay» — Trang chủ Ba Mẹ (thiết kế chốt 05/11, bm-hang-ngay/01-bm2-trang-chu; luật L12 docs/KE-HOACH-KHOP-THIET-KE-0511.md): xếp theo MỨC GẤP
//  1. Con đang làm gì + còn bao nhiêu phút (quỹ hôm nay — con/:id/quy) · «Khoá máy con» / «Cho thêm giờ» là bảng trượt ngay trên thẻ (lib/hang-ngay)
//  2. Con đang xin (quyết ngay: «Không cho» / «Cho N phút» — lib/hom-nay-xin) → «Tất cả ›» /yeu-cau?con=
//  3. Cần Ba Mẹ để ý: máy chưa được bảo vệ đủ (→ /may/<id>), cảnh báo chưa đọc (→ /canh-bao/<id>)
//  4. Nhiệm vụ hôm nay: việc chờ duyệt mở THẲNG màn bằng chứng /duyet/<lượt>; «Xem bằng chứng, duyệt N việc» → /duyet?con=
//  5. Hôm nay con dùng (top 3 app — con/:id/man-hinh) · Cài cho con (→ Hồ sơ) · Con khác.
// Người trông giúp vẫn khoá máy / cho thêm giờ / trả lời lời xin (máy chủ cho phép — quyen.ts › trongGiupDuoc).
import { memo, useMemo, useState } from "react";
import { AppMoi } from "@/lib/viec-nhanh";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type AppChuaXep, type CanhBao, type GiaDinh, type ManHinhTuan, type PhienDang, type TuanThuMay } from "@/lib/api";
import { ChuongTb } from "@/lib/chuong-tb";
import { moLaiMay } from "@/lib/khoa-may";
import { quyenToi,
  BangKhoaMay, BangThemGio, ChipCon, gioGon, HangViec, hinhNv, hoanTacThemGio, IC_MAY, mauCon, SaoVien, TieuMuc,
  type ChoDuyetMoi, type ConCt, type NhiemVuMoi, type QuyCon,
} from "@/lib/hang-ngay";
import { tenMayXin, TheXin } from "@/lib/hom-nay-xin";
import {
  Avt, BaoLoi, CanhGiua, ChoTai, Chu, Icon, M, Man, Nhan, Nut, Rob, The, useHoanTac, useLam, useTai,
} from "@/lib/ui";

const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const ngayHomNay = () => { const t = new Date(); return `${THU[t.getDay()]}, ${t.getDate()}/${t.getMonth() + 1}`; };

export default function HomNay() {
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, cd, cb, choi, tt, nv, luat, quyen] = await Promise.all([
      bm.goi<GiaDinh>("gia-dinh"), bm.goi<ChoDuyetMoi>("cho-duyet").catch(() => null), bm.goi<{ ds: CanhBao[] }>("canh-bao").catch(() => null),
      bm.goi<{ ds: PhienDang[] }>("phien-dang").catch(() => null), bm.goi<{ ds: TuanThuMay[] }>("tuan-thu?nhe=1").catch(() => null),
      bm.goi<{ ds: NhiemVuMoi[] }>("nhiem-vu").catch(() => null),
      // app mới chưa xếp loại cũng là việc chờ Ba Mẹ (issue #70 §2.3 — review PR #183: không để mất khi bỏ thẻ cũ)
      bm.goi<{ chuaXep: AppChuaXep[] }>("luat").catch(() => null), quyenToi(),
    ]);
    return { g, cd, cb: (cb?.ds ?? []).filter((x) => !x.da_doc), choi: choi?.ds ?? [], tt: tt?.ds ?? [], nv: nv?.ds ?? [], appMoi: luat?.chuaXep ?? [], xem: quyen === "trong_giup" };
  });
  const [chon, setChon] = useState<string | null>(null);
  const { bao, noi } = useHoanTac();
  const dau = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 4, marginTop: 4 }}>
      <Chu kieu="rat" co={28} style={{ letterSpacing: -0.6 }}>Hôm nay</Chu>
      <Chu kieu="dam" co={14} mau={M.chu2} style={{ flex: 1, paddingTop: 6 }}>{ngayHomNay()}</Chu>
      <ChuongTb />
    </View>
  );
  if (!d) return <View style={{ flex: 1 }}><Man>{dau}<ChoTai loi={loi} matMang={matMang} tai={tai} /></Man></View>;
  if (!d.g.con.length) {
    return (
      <View style={{ flex: 1 }}>
        <Man>{dau}
          <CanhGiua lv="canh-trong" tieu="Chưa có con nào" loi="Thêm hồ sơ con đầu tiên để bắt đầu.">
            <Nut chu="Thêm con" ic="cong" bam={() => router.push("/thiet-lap/ten-con" as never)} />
          </CanhGiua>
        </Man>
      </View>
    );
  }
  const c = d.g.con.find((x) => x.id === chon) ?? d.g.con[0];
  return (
    <View style={{ flex: 1 }}>
      <Man tai={tai} vongTai noi={noi}>
        {dau}
        {d.g.con.length > 1 ? <ChipCon ds={d.g.con} chon={c.id} doi={(x) => setChon(x.id)} /> : null}
        <BangCon key={c.id} conId={c.id} d={d} taiLai={tai} bao={bao} doiCon={(id) => setChon(id)} />
      </Man>
    </View>
  );
}

type DuLieu = { g: GiaDinh; cd: ChoDuyetMoi | null; cb: CanhBao[]; choi: PhienDang[]; tt: TuanThuMay[]; nv: NhiemVuMoi[]; appMoi: AppChuaXep[]; xem: boolean };

const BangCon = memo(function BangCon({ conId, d, taiLai, bao, doiCon }: {
  conId: string; d: DuLieu; taiLai: () => void; bao: (chu: string, hoan?: () => void) => void; doiCon: (id: string) => void;
}) {
  const c = d.g.con.find((x) => x.id === conId)!;
  const thu = d.g.con.indexOf(c);
  const ct = useTai(() => bm.goi<ConCt>(`con/${conId}`));
  const qy = useTai(() => bm.goi<QuyCon>(`con/${conId}/quy`));
  const mh = useTai(() => bm.goi<ManHinhTuan>(`con/${conId}/man-hinh?lui=0`).catch(() => null));
  const [bang, setBang] = useState<"khoa" | "gio" | null>(null);
  const { lam, loi, dangChay } = useLam();
  const tai = () => { ct.tai(); qy.tai(); taiLai(); };

  const may = ct.d?.may ?? [];
  const choi = d.choi.find((p) => p.con === conId);
  const dangMo = may.find((m) => m.truc);
  const q = qy.d?.quy;
  const sao = qy.d?.sao ?? c.soDu;
  const phutDoi = q && q.doiSao.bat ? Math.min(Math.floor((sao * q.tyLe.phut) / 10), q.doiSao.conDoiDuoc) : 0;
  const khoa = !!ct.d?.khoaNgay || !!q?.khoa;
  const conPhut = q?.conPhut ?? c.conPhut ?? 0, tongPhut = q?.tongPhut ?? c.tranNgay;

  const xin = (d.cd?.yeuCau ?? []).filter((y) => y.child_id === conId);
  const nopCho = (d.cd?.nhiemVu ?? []).filter((x) => x.child_id === conId);
  const canDeY = d.tt.filter((m) => (m.con === conId || m.dungChung) && m.baoVe && m.baoVe !== "day_du" && !m.dangGo);
  const canhBao = d.cb.filter((x) => !x.child_id || x.child_id === conId).slice(0, 2);
  // chỉ việc có lịch HÔM NAY (như máy chủ nvCuaCon): «Tự xếp cặp» T2–T6 không hiện thứ 7 (review PR #183)
  const thuNay = new Date().getDay();
  const homNayCo = (l?: string | null) => !l || l === "hang_ngay" || l === "mot_lan" || (l === "ngay_thuong" ? thuNay >= 1 && thuNay <= 5 : l === "cuoi_tuan" ? thuNay === 0 || thuNay === 6
    : l.startsWith("thu:") ? l.slice(4).split(",").map(Number).includes(thuNay) : true);
  const viec = d.nv.filter((v) => v.bat && (!v.giao_cho || v.giao_cho === conId) && homNayCo(v.lap_lai));
  const daXong = new Set(c.homNayConDa);
  const soLam = viec.filter((v) => daXong.has(v.ten) || nopCho.some((x) => x.ten === v.ten)).length;
  // top 3 app hôm nay (giây → phút) từ thời gian màn hình tuần này
  const top = useMemo(() => {
    const m = mh.d;
    if (!m) return [];
    const i = m.theoNgay.findIndex((x) => x.ngay === m.homNay);
    if (i < 0) return [];
    return m.ds.map((x) => ({ ten: x.ten, kieu: x.kieu, muc: x.muc, phut: Math.round((x.theoNgay[i] ?? 0) / 60) })).filter((x) => x.phut > 0)
      .sort((a, b) => b.phut - a.phut).slice(0, 3);
  }, [mh.d]);

  // dòng trạng thái lớn của thẻ đầu
  const tieuLon = khoa ? `Máy của ${c.ten} đang khoá` : q?.dangNgu ? `${c.ten} đang giờ ngủ` : q?.dangHoc ? `${c.ten} đang giờ học`
    : conPhut ? `${c.ten} còn chơi ${conPhut} phút` : `${c.ten} hết giờ chơi hôm nay`;
  const dongDang = choi ? `Đang chơi ${choi.tenApp}${choi.may ? ` · ${choi.may}` : ""}` : dangMo ? `${dangMo.ten} đang mở` : may.length ? "Máy đang tắt" : "Chưa ghép máy";
  const mayDang = choi?.may ? may.find((m) => m.ten === choi.may) ?? dangMo : dangMo;
  const phuGio = khoa ? "Máy hiện màn khoá tới khi Ba Mẹ mở" : q?.dangNgu ? `Máy mở lại lúc ${gioGon(q.gioNgu.den)}`
    : q?.dangHoc && q.gioHoc ? `Chỉ mở app học tới ${gioGon(q.gioHoc.den)}` : `trong ${tongPhut} phút hôm nay`;

  return (
    <>
      {/* 1. con đang làm gì + còn bao nhiêu phút */}
      <The style={{ backgroundColor: M.chinhSoft, minHeight: 230, overflow: "visible" }}>
        <View style={{ position: "absolute", right: -6, bottom: 64 }} pointerEvents="none"><Rob ten={khoa ? "nghi" : q?.dangNgu ? "ngu" : "rob-goc"} co={124} /></View>
        <Pressable onPress={() => router.push((mayDang ? `/may/${mayDang.id}` : `/may?con=${conId}`) as never)} accessibilityRole="button"
          style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, minHeight: 38, paddingLeft: 6, paddingRight: 12, borderRadius: 19, backgroundColor: M.the, maxWidth: "70%" }}>
          <Icon ten={mayDang ? IC_MAY[mayDang.nen] : "laptop"} co={20} mau={M.chu2} />
          <Chu kieu="dam" co={14} dong={1} style={{ flexShrink: 1 }}>{dongDang}</Chu>
          <Icon ten="phai" co={14} mau={M.chu3} />
        </Pressable>
        {/* chừa đúng bề ngang Rob (124 px, lệch phải −6) — maxWidth % ở khổ 320 / tên dài vẫn chồng chữ lên Rob (cổng DE-ANH) */}
        <View style={{ marginTop: 18, marginRight: 112 }}>
          <Chu kieu="rat" co={24} so>{tieuLon}</Chu>
          <Pressable onPress={() => router.push(`/gio/${conId}` as never)} accessibilityRole="button" style={{ minHeight: 36, justifyContent: "center" }}>
            <Chu kieu="dam" co={14} mau={M.chinhInk}>{`${phuGio} ›`}</Chu>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {khoa ? <Nut chu="Mở lại máy" ic="mo_khoa" dangChay={dangChay} bam={() => lam(async () => { await moLaiMay(conId, c.ten, bao, tai); tai(); })} />
            : <Nut chu="Khoá máy con" ic="khoa" nho loai="vien" tat={!ct.d} bam={() => setBang("khoa")} />}
          <Nut chu="Cho thêm giờ" ic="dongho" nho bam={() => setBang("gio")} />
        </View>
        <BaoLoi loi={loi ?? ct.loi ?? qy.loi} />
      </The>

      {/* 2. con đang xin */}
      {xin.length ? (
        <>
          <TieuMuc chu={`${c.ten} đang xin`} so={xin.length} phai={{ chu: "Tất cả ›", bam: () => router.push(`/yeu-cau?con=${conId}` as never) }} />
          <The>{xin.slice(0, 2).map((y, k) => <TheXin key={y.id} y={y} may={tenMayXin(y, may)} lam={(fn) => lam(fn)} dang={dangChay} bo={k > 0} />)}</The>
        </>
      ) : null}

      {/* 3. cần Ba Mẹ để ý */}
      {canDeY.length || canhBao.length ? (
        <>
          <TieuMuc chu="Cần Ba Mẹ để ý" />
          <The>
            {canDeY.map((m, k) => (
              <HangViec key={m.id} dau={k === 0} ic={IC_MAY[m.nen]} mau="cam" tieu={`${m.ten} chưa được bảo vệ`} phu={m.baoVeCau ?? "Con có thể tự tắt AiiGrow"}
                phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>Sửa ›</Chu>} bam={() => router.push(`/may/${m.id}` as never)} />
            ))}
            {canhBao.map((x, k) => (
              <HangViec key={x.id} dau={!canDeY.length && k === 0} ic="canh_bao" mau={x.muc === "nghiem_trong" ? "do" : "cam"} tieu={x.noi_dung}
                phai={<Chu kieu="rat" co={14} mau={M.chinhInk}>Xem ›</Chu>} bam={() => router.push(`/canh-bao/${x.id}` as never)} />
            ))}
          </The>
        </>
      ) : null}

      <AppMoi ds={d.appMoi} tai={tai} bao={bao} xem={d.xem} />

      {/* 4. nhiệm vụ hôm nay */}
      <TieuMuc chu={viec.length ? `Nhiệm vụ hôm nay · ${soLam}/${viec.length} việc` : "Nhiệm vụ hôm nay"} phai={{ chu: "Tất cả ›", bam: () => router.push("/diem-qua" as never) }} />
      <The>
        {!viec.length ? <HangViec dau ic="cong" mau="xanh" tieu={`Giao việc cho ${c.ten}`} phu="Làm xong nhận sao, đổi ra phút chơi" bam={() => router.push(`/giao-nv?con=${conId}` as never)} /> : null}
        {viec.slice(0, 6).map((v, k) => {
          const luot = nopCho.find((x) => x.ten === v.ten);
          const [ic, mau] = hinhNv(v);
          return luot ? (
            <HangViec key={v.id} dau={k === 0} ic={ic} mau={mau} tieu={v.ten} phu={luot.so_ghi_am ? "Nộp ghi âm" : luot.so_anh ? `Nộp ${luot.so_anh} ảnh` : "Đã báo xong"}
              phai={<Nhan chu="Chờ duyệt" loai="canh" />} bam={() => router.push(`/duyet/${luot.id}` as never)} nhanDoc={`Xem bằng chứng ${v.ten}`} />
          ) : (
            <HangViec key={v.id} dau={k === 0} ic={ic} mau={mau} tieu={v.ten}
              phai={daXong.has(v.ten) ? <SaoVien n={v.diem} dau nho /> : <Nhan chu="Chưa làm" loai="xam" />} bam={() => router.push("/diem-qua" as never)} />
          );
        })}
        {nopCho.length ? (
          <View style={{ marginTop: 8 }}>
            <Nut chu={`Xem bằng chứng, duyệt ${nopCho.length} việc`} rong ic="tick" bam={() => router.push(`/duyet?con=${conId}` as never)} />
          </View>
        ) : null}
      </The>

      {/* 5. hôm nay con dùng */}
      {top.length ? (
        <>
          <TieuMuc chu={`Hôm nay ${c.ten} dùng`} phai={{ chu: "Xem hết ›", bam: () => router.push(`/man-hinh/${conId}` as never) }} />
          <Pressable onPress={() => router.push(`/man-hinh/${conId}` as never)} accessibilityRole="button" style={{ flexDirection: "row", gap: 10 }}>
            {top.map((x) => (
              <The key={x.ten} style={{ flex: 1, alignItems: "center", gap: 2, padding: 12 }}>
                <Chu kieu="rat" co={22} so>{`${x.phut}′`}</Chu>
                <Chu co={13} mau={M.chu2} dong={1}>{x.ten}</Chu>
              </The>
            ))}
          </Pressable>
        </>
      ) : null}

      {/* 6. cài cho con */}
      <TieuMuc chu={`Cài cho ${c.ten}`} />
      <The>
        <HangViec dau trai={<Avt ten={c.ten} mau={mauCon(c.avatar, thu)} />} tieu={`Hồ sơ ${c.ten}`} phu="Giờ chơi · máy · app & web" bam={() => router.push(`/ho-so/${conId}` as never)} />
      </The>

      {/* 7. con khác */}
      {d.g.con.length > 1 ? (
        <>
          <TieuMuc chu="Con khác" />
          <The>
            {d.g.con.filter((x) => x.id !== conId).map((x, k) => {
              const xinX = (d.cd?.yeuCau ?? []).filter((y) => y.child_id === x.id).length;
              return (
                <HangViec key={x.id} dau={k === 0} trai={<Avt ten={x.ten} mau={mauCon(x.avatar, d.g.con.indexOf(x))} />} tieu={x.ten}
                  phu={xinX ? `Đang xin ${xinX} việc` : "Không xin gì"}
                  phai={<View style={{ alignItems: "flex-end" }}><Chu kieu="rat" co={18} so>{`${x.conPhut ?? Math.max(0, x.tranNgay - x.phutChoi)} phút`}</Chu><Chu co={12} mau={M.chu3}>còn</Chu></View>}
                  bam={() => doiCon(x.id)} />
              );
            })}
          </The>
        </>
      ) : null}

      <BangKhoaMay mo={bang === "khoa"} dong={() => setBang(null)} con={conId} ten={c.ten} may={may}
        xong={(chu, hoan) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); }} />
      <BangThemGio mo={bang === "gio"} dong={() => setBang(null)} con={conId} ten={c.ten} sao={sao} phutDoiDuoc={phutDoi}
        xong={(chu, grant) => { bao(chu, () => { hoanTacThemGio(grant).then(tai, () => { bao("Đã quá 60 giây — không hoàn tác được"); tai(); }); }); tai(); }} />
    </>
  );
});
