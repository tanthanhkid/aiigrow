// «Sửa việc» (thiết kế 14/11 bm-viec-duyet/06 them-ncq0jtzo) + bảng «Xoá việc «X»?» (07 them-4axhvgpl): hình + tên, Con nhận ⭐5/10/20/30,
// Làm khi nào?, Con báo xong bằng (Chụp ảnh · Ghi âm · Bấm «Xong»), «Ba Mẹ xem rồi mới cộng sao», «Áp cho» các con (nhà > 1 con), «Xoá việc này»,
// «Lưu việc «X»». Lưu = POST nhiem-vu/:id (chỉ trường đã đổi). «Áp cho»: máy chủ giữ mỗi việc cho MỘT con (hoặc cả nhà) ⇒ đổi danh sách con
// = thêm bản sao cho con mới chọn (POST nhiem-vu {giao_cho: id[]}, con đã có việc cùng tên thì bỏ qua) + tắt việc này nếu con của nó bị bỏ chọn.
// Xoá = tắt việc (bat: false — sao con đang có giữ nguyên, lịch sử giữ). Người trông giúp (dữ liệu cũ): chỉ xem.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BangTruot, Bao, BaoLoi, baoKhiVe, Chips, ChoTai, Chu, CongTac, M, Man, Nut, ONhap, The, TickDong, useLam, useTai } from "@/lib/ui";
import { CAU_TRONG_GIUP, hinhNv, quyenToi, type NhiemVuMoi } from "@/lib/hang-ngay";
import { viecCuaCon } from "@/lib/nv-tab";
import { tenHopLe } from "@/lib/form-viec";
import { ChonO, MucTieu, OLomIcon } from "@/lib/ui-viec";

const LAP = [{ gia: "hang_ngay", chu: "Mỗi ngày" }, { gia: "ngay_thuong", chu: "Thứ 2 – Thứ 6" }, { gia: "cuoi_tuan", chu: "Cuối tuần" }];
const BAO = [{ gia: "anh", chu: "Chụp ảnh", ic: "camera" as const }, { gia: "ghi_am", chu: "Ghi âm", ic: "tai" as const }, { gia: "xong", chu: "Bấm «Xong»", ic: "tick" as const }];

export default function SuaViec() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [nv, g, quyen] = await Promise.all([bm.goi<{ ds: NhiemVuMoi[] }>("nhiem-vu"), bm.goi<GiaDinh>("gia-dinh"), quyenToi()]);
    return { v: nv.ds.find((x) => x.id === id) ?? null, ds: nv.ds, con: g.con, baMe: quyen === "ba_me" };
  });
  const [ten, setTen] = useState<string | null>(null);
  const [sao, setSao] = useState<number | null>(null);
  const [lap, setLap] = useState<string | null>(null);
  const [bc, setBc] = useState<string | null>(null);
  const [duyet, setDuyet] = useState<boolean | null>(null);
  const [apCho, setApCho] = useState<string[] | null>(null);
  const [xoa, setXoa] = useState(false);
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = "Sửa việc";
  if (!d) return <Man lui={{ chu: "" }} tieu={tieu}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const v = d.v;
  if (!v) return <Man lui={{ chu: "" }} tieu={tieu}><Bao loai="lam" ic="tick" tieu="Việc này không còn nữa" loi="Có thể người khác trong nhà đã xoá." /></Man>;
  const lapGoc = v.lap_lai ?? ((v as { kieu?: string }).kieu === "mot_lan" ? "mot_lan" : "hang_ngay");
  const bcGoc = v.bang_chung === "tu_dong" ? "xong" : v.bang_chung;
  const goc = { ten: v.ten, sao: v.diem, lap: lapGoc, bc: bcGoc, duyet: !v.tu_duyet, apCho: v.giao_cho ? [v.giao_cho] : d.con.map((c) => c.id) };
  const f = { ten: ten ?? goc.ten, sao: sao ?? goc.sao, lap: lap ?? goc.lap, bc: bc ?? goc.bc, duyet: duyet ?? goc.duyet, apCho: apCho ?? goc.apCho };
  const dsLap = LAP.some((x) => x.gia === lapGoc) ? LAP : [...LAP, { gia: lapGoc, chu: lapGoc === "mot_lan" ? "Một lần" : "Các thứ đã chọn" }];
  const dsBao = BAO.some((x) => x.gia === bcGoc) ? BAO : [...BAO, { gia: bcGoc, chu: bcGoc === "van_ban" ? "Viết" : bcGoc, ic: "but" as const }];
  const dsSao = [5, 10, 20, 30].includes(goc.sao) ? [5, 10, 20, 30] : [...[5, 10, 20, 30], goc.sao].sort((a, b) => a - b);
  const conCua = v.giao_cho ? d.con.find((c) => c.id === v.giao_cho) : null;
  const tenCon = conCua?.ten ?? "Các con";
  const conLai = conCua ? viecCuaCon(d.ds, conCua.id).filter((x) => x.id !== v.id).length : null;
  const [ic] = hinhNv(v);

  const luu = () => lam(async () => {
    // chỉ gửi trường Ba Mẹ ĐÃ đổi: suaNv ghép lên bản cũ ⇒ giữ nguyên toi_da_ngay, nhom, giờ nhắc, việc AiiRob tự chấm (review PR #183)
    const than: Record<string, unknown> = {};
    if (f.ten.trim() !== goc.ten) than.ten = f.ten.trim();
    if (f.sao !== goc.sao) than.diem = f.sao;
    if (f.lap !== goc.lap) { than.lap_lai = f.lap; if (goc.lap === "mot_lan") than.toi_da_ngay = 1; }
    if (f.bc !== goc.bc) than.bang_chung = f.bc;
    if (f.duyet !== goc.duyet) than.tu_duyet = !f.duyet;
    if (Object.keys(than).length) await bm.goi(`nhiem-vu/${v.id}`, than);
    // «Áp cho» đổi ⇒ bản sao cho con mới, tắt việc này nếu con của nó (hoặc «cả nhà») không còn đúng danh sách
    const doiApCho = f.apCho.length !== goc.apCho.length || f.apCho.some((x) => !goc.apCho.includes(x));
    if (doiApCho && f.apCho.length) {
      const giuViecNay = !!v.giao_cho && f.apCho.includes(v.giao_cho);
      const tenMoi = f.ten.trim();
      const moi = f.apCho.filter((c) => c !== (giuViecNay ? v.giao_cho : null)
        && !d.ds.some((x) => x.bat && x.id !== v.id && x.ten === tenMoi && (x.giao_cho === c || x.giao_cho === null)));
      if (moi.length) {
        await bm.goi("nhiem-vu", { ten: tenMoi, hinh: v.hinh, diem: f.sao, nhom: (v as { nhom?: string }).nhom, bo: v.bo, lap_lai: f.lap,
          gio_nhac: v.gio_nhac, bang_chung: f.bc, tu_duyet: !f.duyet, toi_da_ngay: f.lap === "mot_lan" ? null : (v as { toi_da_ngay?: number | null }).toi_da_ngay ?? 1, giao_cho: moi });
      }
      if (!giuViecNay) await bm.goi(`nhiem-vu/${v.id}`, { bat: false });
    }
    baoKhiVe(`Đã lưu việc «${f.ten.trim()}»`);
    router.back();
  });
  const tat = () => lam(async () => {
    await bm.goi(`nhiem-vu/${v.id}`, { bat: false });
    setXoa(false);
    baoKhiVe(`Đã xoá «${v.ten}»`);
    router.back();
  });
  return (
    <Man lui={{ chu: "" }} tieu={tieu}
      day={d.baMe ? <><BaoLoi loi={xoa ? null : loiLam} /><Nut chu={`Lưu việc «${f.ten.trim() || v.ten}»`} ic="tick" rong dangChay={dangChay}
        tat={!tenHopLe(f.ten) || !f.apCho.length} bam={luu} /></> : undefined}>
      {d.baMe ? (
        <>
          <View style={{ alignItems: "center" }}><OLomIcon ic={ic} co={72} nen="#f9e7d2" /></View>
          <ONhap nhan="Tên việc" value={f.ten} onChangeText={setTen} maxLength={90} />
          <MucTieu chu="Con nhận bao nhiêu sao?" />
          <ChonO ds={dsSao.map((x) => ({ gia: x, chu: `${x}` }))} chon={f.sao} doi={setSao} sao />
          <MucTieu chu="Làm khi nào?" />
          <ChonO ds={dsLap} chon={f.lap} doi={setLap} />
          <MucTieu chu="Con báo xong bằng" />
          <ChonO ds={dsBao} chon={f.bc} doi={setBc} />
          <The style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Chu kieu="rat">Ba Mẹ xem rồi mới cộng sao</Chu>
              <Chu co={13} mau={M.chu3}>Tắt thì con báo xong là nhận sao</Chu>
            </View>
            <CongTac nhan="Ba Mẹ xem rồi mới cộng sao" bat={f.duyet} doi={setDuyet} />
          </The>
          {d.con.length > 1 ? (
            <>
              <MucTieu chu="Áp cho" />
              <Chips ds={d.con.map((c) => ({ gia: c.id, chu: c.ten }))} chon={f.apCho}
                doi={(c) => setApCho(f.apCho.includes(c) ? f.apCho.filter((x) => x !== c) : [...f.apCho, c])} />
            </>
          ) : null}
          <Nut chu="Xoá việc này" ic="x" loai="huy" rong bam={() => setXoa(true)} />
        </>
      ) : <Bao loai="lam" ic="khoa" tieu={v.ten} loi={CAU_TRONG_GIUP} />}
      <BangTruot mo={xoa} dong={() => setXoa(false)} tieu={`Xoá việc «${v.ten}»?`}>
        <View>
          <TickDong chu={`${tenCon} không thấy việc này nữa`} />
          <TickDong chu={conCua ? `${conCua.soDu} sao con đang có vẫn giữ nguyên` : "Sao con đang có vẫn giữ nguyên"} />
          {conCua && conLai !== null ? <TickDong chu={`Ngày của ${conCua.ten} còn ${conLai} việc`} /> : null}
        </View>
        <BaoLoi loi={loiLam} />
        <Nut chu={`Xoá «${v.ten}»`} loai="huy" rong dangChay={dangChay} bam={tat} />
        <Nut chu="Giữ lại việc này" loai="ma" rong bam={() => setXoa(false)} />
      </BangTruot>
    </Man>
  );
}
