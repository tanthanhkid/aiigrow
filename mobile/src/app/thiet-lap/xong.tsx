// bm-ob-xong: thiết lập xong — tóm tắt, nhắc nếu máy còn thiếu quyền.
import { router } from "expo-router";
import { bm, type ConChiTiet } from "@/lib/api";
import { layTl } from "@/lib/thiet-lap";
import { Bao, Canh, Man, Nut, The, TickDong, useTai, XuongTai } from "@/lib/ui";

export default function ObXong() {
  const tl = layTl();
  const { d } = useTai(() => (tl.conId ? bm.goi<ConChiTiet>(`con/${tl.conId}`) : Promise.resolve(null)));
  const ten = d?.ten ?? tl.tenCon ?? "Con";
  const may = d?.may.filter((m) => !m.dungChung) ?? [];
  const thieu = may.filter((m) => m.baoVe !== "day_du");
  return (
    <Man day={<><Nut chu="Vào trang Hôm nay" rong bam={() => router.replace("/hom-nay")} /><Nut chu="Chat với AiiLab nếu cần giúp" loai="ma" rong bam={() => router.push("/ho-tro")} /></>}>
      <Canh lv="xong" tieu="Xong rồi!" loi={may.length ? `Máy của ${ten} đã được ghép.` : `Hồ sơ ${ten} đã sẵn sàng.`} />
      {tl.conId && !d ? <XuongTai /> : (
        <The dem>
          <TickDong chu={`Hồ sơ ${ten} · Nhóm ${(d?.nhom ?? tl.nhom) === "teen" ? "Teen" : "Nhí"}`} />
          {may.map((m) => <TickDong key={m.id} chu={`${m.ten} · ${m.baoVe === "day_du" ? "Bảo vệ đầy đủ" : "Bảo vệ một phần"}`} trang={m.baoVe === "day_du" ? "xong" : "x"} />)}
          {!may.length ? <TickDong chu="Chưa ghép máy nào — ghép sau ở hồ sơ Con" trang="sau" /> : null}
          <TickDong chu="Nhiệm vụ & phần thưởng theo mẫu" />
          {d ? <TickDong chu={`Giờ chơi ${d.lich.ngayThuong[0]?.tu ?? "—"}–${d.lich.ngayThuong[0]?.den ?? "—"} · trần ${d.thamSo.tran_ngay} phút/ngày`} /> : null}
        </The>
      )}
      {thieu.map((m) => <Bao key={m.id} tieu={`${m.ten} còn thiếu quyền cần cấp`} loi={m.nen === "windows" ? "Mở khay AiiGrow trên máy đó (đăng nhập tài khoản Windows của Con) để cấp nốt quyền bảo vệ." : "Mở AiiGrow trên máy đó để cấp nốt quyền bảo vệ."} />)}
    </Man>
  );
}
