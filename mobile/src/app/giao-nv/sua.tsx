// «Sửa việc» (thiết kế 14/11 bm-viec-duyet/06 them-ncq0jtzo) + bảng «Xoá việc «X»?» (07 them-4axhvgpl): hình + tên, Con nhận ⭐5/10/20/30,
// Làm khi nào?, Con báo xong bằng (Chụp ảnh · Ghi âm · Bấm «Xong»), «Ba Mẹ xem rồi mới cộng sao», «Áp cho» các con (nhà > 1 con), «Xoá việc này»,
// «Lưu việc «X»». Lưu = POST nhiem-vu/:id/luu {sua (chỉ trường đã đổi), apCho?} — MỘT giao dịch ở máy chủ (nhiem-vu.ts › luuNv): «Áp cho» thêm
// bản sao chép đủ cột của việc (giữ bang_chung / tu_duyet gốc — việc AiiRob tự chấm vẫn tự chấm) cho con mới chọn + tắt việc này nếu con của nó bị bỏ.
// Đã chọn (review PR #243): thiết kế chỉ có hình ở đầu màn và không có giờ nhắc ⇒ giữ hai thứ này ở dạng gọn — dải chọn hình dưới icon, chip «Nhắc con».
// Xoá = tắt việc (bat: false — sao con đang có giữ nguyên, lịch sử giữ). Người trông giúp (dữ liệu cũ): chỉ xem.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BangTruot, Bao, BaoLoi, baoKhiVe, Chips, ChoTai, Chu, CongTac, M, Man, Nut, ONhap, The, TickDong, useLam, useTai } from "@/lib/ui";
import { CAU_TRONG_GIUP, hinhNv, quyenToi, type NhiemVuMoi } from "@/lib/hang-ngay";
import { viecCuaCon } from "@/lib/nv-tab";
import { tenHopLe } from "@/lib/form-viec";
import { ChonO, OLomIcon } from "@/lib/ui-viec";
import { MucTieu } from "@/lib/ui-bm3";

const LAP = [{ gia: "hang_ngay", chu: "Mỗi ngày" }, { gia: "ngay_thuong", chu: "Thứ 2 – Thứ 6" }, { gia: "cuoi_tuan", chu: "Cuối tuần" }];
const HINH = ["choi", "sach", "day", "but", "cay", "bat", "ban_chai", "cap", "ao", "ban_hoc", "rau", "ngu"];
const NHAC = ["07:00", "17:00", "19:00", "20:00"];
const BAO = [{ gia: "anh", chu: "Chụp ảnh", ic: "camera" as const }, { gia: "ghi_am", chu: "Ghi âm", ic: "tai" as const }, { gia: "xong", chu: "Bấm «Xong»", ic: "tick" as const }];

export default function SuaViec() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [nv, g, quyen] = await Promise.all([bm.goi<{ ds: NhiemVuMoi[] }>("nhiem-vu"), bm.goi<GiaDinh>("gia-dinh"), quyenToi()]);
    return { v: nv.ds.find((x) => x.id === id) ?? null, ds: nv.ds, con: g.con, baMe: quyen === "ba_me" };
  });
  const [ten, setTen] = useState<string | null>(null);
  const [hinh, setHinh] = useState<string | null>(null);
  const [nhac, setNhac] = useState<string | null>(null);
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
  const goc = { ten: v.ten, sao: v.diem, lap: lapGoc, bc: bcGoc, duyet: !v.tu_duyet, apCho: v.giao_cho ? [v.giao_cho] : d.con.map((c) => c.id),
    hinh: v.hinh ?? "", nhac: v.gio_nhac ?? "" };
  const f = { ten: ten ?? goc.ten, sao: sao ?? goc.sao, lap: lap ?? goc.lap, bc: bc ?? goc.bc, duyet: duyet ?? goc.duyet, apCho: apCho ?? goc.apCho,
    hinh: hinh ?? goc.hinh, nhac: nhac ?? goc.nhac };
  const dsHinh = goc.hinh && !HINH.includes(goc.hinh) ? [goc.hinh, ...HINH] : HINH;
  const dsNhac = [{ gia: "", chu: "Không nhắc" }, ...[...new Set([...NHAC, ...(goc.nhac ? [goc.nhac] : [])])].sort().map((x) => ({ gia: x, chu: x.replace(/^0/, "") }))];
  const dsLap = LAP.some((x) => x.gia === lapGoc) ? LAP : [...LAP, { gia: lapGoc, chu: lapGoc === "mot_lan" ? "Một lần" : "Các thứ đã chọn" }];
  const dsBao = BAO.some((x) => x.gia === bcGoc) ? BAO : [...BAO, { gia: bcGoc, chu: bcGoc === "van_ban" ? "Viết" : bcGoc, ic: "but" as const }];
  const dsSao = [5, 10, 20, 30].includes(goc.sao) ? [5, 10, 20, 30] : [...[5, 10, 20, 30], goc.sao].sort((a, b) => a - b);
  const conCua = v.giao_cho ? d.con.find((c) => c.id === v.giao_cho) : null;
  const tenCon = conCua?.ten ?? "Các con";
  const conLai = conCua ? viecCuaCon(d.ds, conCua.id).filter((x) => x.id !== v.id).length : null;
  const [ic] = hinhNv({ ...v, hinh: f.hinh || v.hinh });

  const luu = () => lam(async () => {
    // chỉ gửi trường Ba Mẹ ĐÃ đổi: suaNv ghép lên bản cũ ⇒ giữ nguyên toi_da_ngay, nhom, việc AiiRob tự chấm (review PR #183)
    const than: Record<string, unknown> = {};
    if (f.ten.trim() !== goc.ten) than.ten = f.ten.trim();
    if (f.sao !== goc.sao) than.diem = f.sao;
    if (f.lap !== goc.lap) { than.lap_lai = f.lap; if (goc.lap === "mot_lan") than.toi_da_ngay = 1; }
    if (f.bc !== goc.bc) than.bang_chung = f.bc;
    if (f.duyet !== goc.duyet) than.tu_duyet = !f.duyet;
    if (f.hinh !== goc.hinh) than.hinh = f.hinh;
    if (f.nhac !== goc.nhac) than.gio_nhac = f.nhac || null;
    const doiApCho = f.apCho.length !== goc.apCho.length || f.apCho.some((x) => !goc.apCho.includes(x));
    if (Object.keys(than).length || doiApCho) await bm.goi(`nhiem-vu/${v.id}/luu`, { sua: than, ...(doiApCho ? { apCho: f.apCho } : {}) });
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
          <ChonO ds={dsHinh.map((h) => ({ gia: h, chu: "", ic: hinhNv({ hinh: h })[0], nhan: `Hình ${h}` }))} chon={f.hinh || null} doi={setHinh} />
          <ONhap nhan="Tên việc" value={f.ten} onChangeText={setTen} maxLength={90} />
          <MucTieu chu="Con nhận bao nhiêu sao?" />
          <ChonO ds={dsSao.map((x) => ({ gia: x, chu: `${x}` }))} chon={f.sao} doi={setSao} sao />
          <MucTieu chu="Làm khi nào?" />
          <ChonO ds={dsLap} chon={f.lap} doi={setLap} />
          <MucTieu chu="Nhắc con" />
          <Chips ds={dsNhac} chon={[f.nhac]} doi={setNhac} />
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
      <BangTruot mo={xoa} dong={() => setXoa(false)} tieu={`Xoá việc «${v.ten}»?`} hinh="lau">
        <View>
          <TickDong chu={`${tenCon} không thấy việc này nữa`} />
          <TickDong chu={conCua ? `${conCua.soDu} sao con đang có vẫn giữ nguyên` : "Sao con đang có vẫn giữ nguyên"} />
          {conCua && conLai !== null ? <TickDong chu={`Ngày của ${conCua.ten} còn ${conLai} việc`} /> : null}
        </View>
        <BaoLoi loi={loiLam} />
        <Nut chu={`Xoá «${v.ten}»`} loai="huy" rong dangChay={dangChay} bam={tat} />
        <Nut chu="Giữ lại việc này" loai="vien" rong bam={() => setXoa(false)} />
      </BangTruot>
    </Man>
  );
}
