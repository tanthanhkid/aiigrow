// «Chờ duyệt» (thiết kế chốt 05/11; bố cục bm-duyet 02/03/10/11, chữ «sao»): route trong nhóm tab nhưng KHÔNG có nút trên thanh (mở từ Thông báo,
// Hôm nay, màn duyệt). Đầu: «N việc cần Ba Mẹ · cũ nhất từ HH:MM», chip Cả nhà / từng Con kèm số. Các mục theo mức gấp:
//  • Con xin · n — thêm giờ / ngoại lệ: «Cho N phút» / «Không cho» một chạm (toast Hoàn tác 60 giây khi cho thêm giờ); app / web lạ: «Cho, dùng thoải mái»
//    · «Cho, trừ giờ chơi» · «Không cho» (lib/hom-nay-xin)
//  • Cần để ý · n — máy chưa được bảo vệ đủ (tuan-thu?nhe=1) → /may/<id>
//  • Con đã nộp · n — «Duyệt cả n · +S sao» (duyet-hang-loat) + từng việc → màn bằng chứng /duyet/<id>
//  • Quà chờ trao — «Trao quà» ⇒ bảng them-5otw85h4 (lib/trao-qua: Đã trao trừ sao / Huỷ & hoàn sao / voucher QR + hạn)
//  • Đã xử lý hôm nay — việc tự cộng sao (AiiRob tự chấm / tự cộng sao)
// Trống ⇒ «Duyệt hết rồi!» + «Thêm việc cho <Con>» · «Về Trang chủ» (thiết kế 14/11 bm-viec-duyet/16). Mất mạng ⇒ khung ChoTai (Grow chờ, tự tải lại).
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm, type TuanThuMay } from "@/lib/api";
import { hinhNv, hoanTacThemGio, SaoVien, TieuMuc, HangViec, type ChoDuyetMoi, type PhieuCho } from "@/lib/hang-ngay";
import { BangTraoQua } from "@/lib/trao-qua";
import { tenMayXin, TheXin, type KetQua } from "@/lib/hom-nay-xin";
import { KHOA_TAB } from "@/lib/tab-ba-me";
import {
  BaoLoi, BieuTron, CanhGiua, ChoTai, ChonMot, Chu, gioPhut, M, Man, Nut, The, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";

const napCho = async () => {
  const [cd, tt] = await Promise.all([bm.goi<ChoDuyetMoi>("cho-duyet"), bm.goi<{ ds: TuanThuMay[] }>("tuan-thu?nhe=1").catch(() => null)]);
  return { ...cd, may: tt?.ds ?? [] };
};

export default function ChoDuyet() {
  const { d, loi, matMang, tai } = useTai(napCho, `${KHOA_TAB.choDuyet}:05-11`);
  const [chon, setChon] = useState("ca");
  const [trao, setTrao] = useState<PhieuCho | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  if (!d) return <Man tieuLon="Chờ duyệt" lui={{ chu: "Hôm nay", ve: "/hom-nay" }}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;

  // Con đang chọn đã hết việc (chip biến mất) ⇒ về «Cả nhà», không kẹt ở màn trống (review PR #183)
  if (chon !== "ca" && ![...d.yeuCau, ...d.nhiemVu, ...(d.phieu ?? [])].some((x) => x.child_id === chon)) setChon("ca");
  const theo = <T extends { child_id: string | null }>(a: T[]) => (chon === "ca" ? a : a.filter((x) => x.child_id === chon));
  const yc = theo(d.yeuCau), nv = theo(d.nhiemVu), qua = theo(d.phieu ?? []), tuDong = theo(d.tuDong ?? []);
  const canDeY = d.may.filter((m) => m.baoVe && m.baoVe !== "day_du" && !m.dangGo && (chon === "ca" || m.con === chon || m.dungChung));
  const tong = yc.length + nv.length + qua.length + canDeY.length;
  // chip: Cả nhà + mọi Con có việc (tên lấy từ chính việc)
  const tenCon = new Map<string, string>();
  [...d.yeuCau, ...d.nhiemVu, ...(d.phieu ?? [])].forEach((x) => tenCon.set(x.child_id, x.ten_con));
  const dem = (id: string) => d.yeuCau.filter((x) => x.child_id === id).length + d.nhiemVu.filter((x) => x.child_id === id).length + (d.phieu ?? []).filter((x) => x.child_id === id).length;
  const tatCa = d.yeuCau.length + d.nhiemVu.length + (d.phieu?.length ?? 0);
  const cuNhat = [...yc.map((x) => x.created_at), ...nv.map((x) => x.nop_luc), ...qua.map((x) => x.created_at)].sort()[0];
  const tenMay = (y: (typeof yc)[number]) => tenMayXin(y, d.may.map((m) => ({ id: m.id, ten: m.ten })));

  // Chờ duyệt: trả lời xong ở lại màn, toast (cho thêm giờ có Hoàn tác — them-gio/:id/hoan-tac)
  const sau = (k: KetQua) => {
    const chu = k.kieu === "them_gio" ? `Đã cho ${k.ten} thêm ${k.phut} phút` : k.kieu === "ngoai_le" ? `Đã cho ${k.ten} mở ${k.muc} ${k.phut} phút`
      : k.kieu === "mo" ? `Đã cho ${k.ten} dùng ${k.muc}` : `Đã trả lời ${k.ten}: Ba Mẹ chưa cho lúc này`;
    bao(chu, k.grant ? () => { hoanTacThemGio(k.grant!).then(tai, () => { bao("Đã quá 60 giây — không hoàn tác được"); tai(); }); } : undefined);
    tai();
  };
  const duyetCa = () => lam(async () => {
    const r = await bm.goi<{ daDuyet: number; sao: number }>("duyet-hang-loat", { ids: nv.map((x) => x.id) });
    bao(`Đã duyệt ${r.daDuyet} việc · +${r.sao} sao`);
    await tai();
  }, { hangDoi: true });
  const saoCa = nv.reduce((n, x) => n + (x.sao ?? x.diem), 0);

  const chip = tenCon.size ? (
    <ChonMot ds={[{ gia: "ca", chu: `Cả nhà ${tatCa}` }, ...[...tenCon].map(([id, ten]) => ({ gia: id, chu: `${ten} ${dem(id)}` }))]} gia={chon} doi={setChon} />
  ) : null;

  // Bảng trao quà (Modal) đứng NGOÀI hai nhánh, cùng vị trí ⇒ trao quà cuối là voucher thì danh sách rỗng nhưng bảng QR + mã không bị dựng lại / mất
  const bang = <BangTraoQua p={trao} dong={() => setTrao(null)} xong={(chu) => { bao(chu); tai(); }} />;
  return <>{noiDung()}{bang}</>;
  function noiDung() {
  if (!tong) {
    return (
      <Man tieuLon="Chờ duyệt" lui={{ chu: "Hôm nay", ve: "/hom-nay" }} tai={tai} vongTai noi={noi}>
        {chip}
        {/* thiết kế bm-viec-duyet/16: «Duyệt hết rồi!» + câu, nút than chì «＋ Thêm việc cho …», liên kết «Về Trang chủ» */}
        <CanhGiua lv="xong" tieu="Duyệt hết rồi!" loi="Không còn việc nào chờ Ba Mẹ. Con nộp việc mới, Grow sẽ báo ngay.">
          <Nut chu={chon !== "ca" && tenCon.get(chon) ? `Thêm việc cho ${tenCon.get(chon)}` : "Thêm việc cho con"} ic="cong" rong
            bam={() => router.push((chon !== "ca" ? `/giao-nv?con=${chon}` : "/giao-nv") as never)} />
          <Nut chu="Về Trang chủ" loai="ma" rong bam={() => router.replace("/hom-nay" as never)} />
        </CanhGiua>
        {tuDong.length ? <DaXuLy ds={tuDong} /> : null}
      </Man>
    );
  }
  return (
    <Man tieuLon="Chờ duyệt" lui={{ chu: "Hôm nay", ve: "/hom-nay" }} tai={tai} vongTai noi={noi}>
      <Chu kieu="dam" co={14} mau={M.chu3} style={{ marginHorizontal: 4, marginTop: -6 }}>
        {`${tong} việc cần Ba Mẹ${cuNhat ? ` · cũ nhất từ ${gioPhut(cuNhat)}` : ""}`}
      </Chu>
      {chip}
      <BaoLoi loi={loiLam} />

      {yc.length ? (
        <>
          <TieuMuc chu={`Con xin · ${yc.length}`} />
          <The>{yc.map((y, k) => <TheXin key={y.id} y={y} may={tenMay(y)} lam={(fn) => lam(fn)} dang={dangChay} bo={k > 0} sau={sau} truc
            phu={chon === "ca" ? y.ten_con : undefined} />)}</The>
        </>
      ) : null}

      {canDeY.length ? (
        <>
          <TieuMuc chu={`Cần để ý · ${canDeY.length}`} />
          <The>{canDeY.map((m, k) => (
            <HangViec key={m.id} dau={k === 0} ic="canh_bao" mau="cam" tieu={`${m.ten} chưa được bảo vệ đủ`}
              phu={`${m.baoVeCau ?? "Con có thể tự tắt AiiGrow"}${m.lanCuoi ? ` · báo về ${truoc(m.lanCuoi)}` : ""}`} bam={() => router.push(`/may/${m.id}` as never)} />
          ))}</The>
        </>
      ) : null}

      {nv.length ? (
        <>
          <TieuMuc chu={`Con đã nộp · ${nv.length}`} />
          <The>
            {nv.map((x, k) => {
              const [ic, mau] = hinhNv(x);
              const loai = x.so_ghi_am ? "ghi âm" : x.so_anh ? `${x.so_anh} ảnh` : "bấm «Xong»";
              return <HangViec key={x.id} dau={k === 0} ic={ic} mau={mau} tieu={x.ten} phu={`${x.ten_con} · ${loai} · ${gioPhut(x.nop_luc)}`}
                phai={<SaoVien n={x.sao ?? x.diem} dau nho />} bam={() => router.push(`/duyet/${x.id}` as never)} nhanDoc={`Xem bằng chứng ${x.ten}`} />;
            })}
            {nv.length > 1 ? <View style={{ marginTop: 8 }}><Nut chu={`Duyệt cả ${nv.length} · +${saoCa} sao`} ic="tick" rong dangChay={dangChay} bam={duyetCa} /></View> : null}
          </The>
        </>
      ) : null}

      {qua.length ? (
        <>
          <TieuMuc chu={`Quà chờ trao · ${qua.length}`} />
          <The>{qua.map((x, k) => (
            <HangViec key={x.id} dau={k === 0} ic="qua" mau="cam" tieu={x.ten} phu={`${x.ten_con} · đang giữ ${x.diem} sao · ${truoc(x.created_at)}`}
              phai={<Nut chu="Trao quà" nho bam={() => setTrao(x)} nhanDoc={`Trao ${x.ten} cho ${x.ten_con}`} />} />
          ))}</The>
        </>
      ) : null}

      {tuDong.length ? <DaXuLy ds={tuDong} /> : null}
    </Man>
  );
  }
}

function DaXuLy({ ds }: { ds: NonNullable<ChoDuyetMoi["tuDong"]> }) {
  return (
    <>
      <TieuMuc chu={`Đã xử lý hôm nay · ${ds.length}`} phai={{ chu: "Xem tất cả", bam: () => router.push("/thong-bao" as never) }} />
      <The>{ds.map((x, k) => (
        <HangViec key={x.id} dau={k === 0} trai={<BieuTron ic={x.nguon === "aiirob" ? "game" : "tick"} mau={x.nguon === "aiirob" ? "tim" : "xanh"} />} tieu={x.ten}
          phu={`${x.ten_con} · ${x.nguon === "aiirob" ? "tự chấm" : "tự cộng sao"} ${gioPhut(x.duyet_luc)}`} phai={<SaoVien n={x.diem} dau nho />} />
      ))}</The>
    </>
  );
}
