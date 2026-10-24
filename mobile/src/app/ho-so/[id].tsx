// bm-ho-so-con: hồ sơ Con & thiết bị — mức bảo vệ (Đầy đủ / Chưa đủ / Chưa bảo vệ), Online/Offline + lần đồng bộ cuối (FR-01.03),
// đổi tên Con, nhóm trải nghiệm, đặt lại PIN, ghép thêm máy. Gỡ máy: chuyển sang màn máy › «An toàn & gỡ cài đặt» (gỡ an toàn — chủ gia đình +
// mật khẩu, máy chỉ rời danh sách khi agent báo đã gỡ; không gỡ thẳng ở đây để khỏi bỏ AiiGrow «mồ côi» trên máy Con).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, chuanHoaTen, type ConChiTiet, vaiToi } from "@/lib/api";
import { saoChep } from "@/lib/luu-tep";
import { datTl } from "@/lib/thiet-lap";
import { DsThieuBaoVe, IC_NEN } from "@/lib/viec-nhanh";
import {
  BangTruot, BaoLoi, BieuTron, Canh, ChoTai, ChonMot, Chu, Dong, M, Man, Nhan, Nhom, Nut, ONhap, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";

const BAO_VE = { day_du: ["Đầy đủ", "ok"], mot_phan: ["Bảo vệ chưa đủ", "canh"], chua: ["Chưa bảo vệ", "loi"] } as const;
// Chữ giải thích dưới nhãn: nói RÕ thiếu gì và làm gì (không để Ba Mẹ đoán vì sao «Chưa đủ» / «Chưa bảo vệ»).

export default function HoSoCon() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d: con, loi, matMang, tai } = useTai(() => bm.goi<ConChiTiet>(`con/${id}`));
  // Vai Ba Mẹ — tải riêng: lỗi `toi` không làm hỏng cả màn; hàng «Tên» chỉ ẩn khi biết chắc là Chỉ xem (máy chủ chặn 403) (như mục liên kết AiiRob)
  const vai = useTai(vaiToi);
  const goc = con ? { con, xem: vai.d === "xem" } : null;
  const [mo, setMo] = useState<"ten" | "pin" | "nhom" | { go: string; ten: string } | null>(null);
  const [pin, setPin] = useState("");
  const [ten, setTen] = useState("");
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
  const dong = () => { setMo(null); setLoi(null); };      // đóng bảng nào cũng xoá lỗi, không dính sang bảng khác
  const { bao, noi } = useHoanTac();
  // M6: mã liên kết AiiRob «<family_id>.<child_id>» — tải riêng, lỗi thì chỉ ẩn mục này
  const lk = useTai(() => bm.goi<{ ma: string }>(`con/${id}/lien-ket-aiirob`));
  if (!goc) return <Man lui={{ chu: "Quay lại" }} tieu="Hồ sơ Con"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const d = goc.con;
  const may = d.may;
  const thieu = may.filter((m) => m.baoVe !== "day_du").length;
  return (
    <Man lui={{ chu: "Quay lại" }} tieu={d.ten} noi={noi}>
      <Canh lv="chi" thap tieu={may.length ? `${d.ten} có ${may.length} máy` : `${d.ten} chưa có máy nào`}
        loi={!may.length ? "Ghép bằng mã 6 số, chưa tới 2 phút." : thieu ? `${thieu} máy bảo vệ chưa đầy đủ — xem lý do và cách làm bên dưới.` : "Mọi máy đều được bảo vệ đầy đủ."} />
      {may.length ? (
        <Nhom>
          {may.map((m, i) => (
            <Dong key={m.id} dau={i === 0} tieu={m.ten} phu={`${m.truc ? "Online" : "Offline"} · đồng bộ ${truoc(m.lanCuoi) || "chưa lần nào"}${m.dungChung ? " · máy dùng chung" : ""}${m.lechGiay ? " · giờ máy lệch" : ""}`}
              trai={<BieuTron ic={IC_NEN[m.nen]} mau={m.baoVe === "day_du" ? "xanh" : "cam"} />} phai={<Nhan chu={BAO_VE[m.baoVe][0]} loai={BAO_VE[m.baoVe][1]} cham />}
              bam={() => setMo({ go: m.id, ten: m.ten })} />
          ))}
        </Nhom>
      ) : null}
      {may.filter((m) => m.baoVe !== "day_du").map((m) => (
        <Nhom key={`bv-${m.id}`}>
          <Dong dau tieu={`${m.ten}: ${m.baoVe === "chua" ? "chưa có thông tin bảo vệ" : "bảo vệ chưa đầy đủ"}`} phu={m.baoVeCau ?? "Chưa nhận được báo cáo từ máy."}
            trai={<BieuTron ic="canh_bao" mau="cam" />} bam={() => router.push(`/may/${m.id}`)} />
          <DsThieuBaoVe thieu={m.baoVeThieu} bam={() => router.push(`/may/${m.id}`)} />
        </Nhom>
      ))}
      <Nut chu="Ghép thêm máy" ic="laptop" loai="vien" rong bam={() => { datTl({ conId: d.id, tenCon: d.ten, nhom: d.nhom }); router.push("/thiet-lap/may"); }} />
      <Nhom>
        {goc.xem ? null : <Dong dau tieu="Tên" phu={`${d.ten} — đổi tên gọi của Con`} trai={<BieuTron ic="cuoi" mau="lam" />} bam={() => { setTen(d.ten); setLoi(null); setMo("ten"); }} />}
        <Dong dau={goc.xem} tieu="Nhóm trải nghiệm" phu={`${d.nhom === "teen" ? "Teen" : "Nhí"}${d.namSinh ? ` · ${new Date().getFullYear() - d.namSinh} tuổi` : ""}`} trai={<BieuTron ic="cuoi" mau="vang" />} bam={() => setMo("nhom")} />
        <Dong tieu={`Mã PIN của ${d.ten}`} phu="Đặt lại khi Con quên — Con đăng xuất ở mọi máy" trai={<BieuTron ic="khoa" />} bam={() => setMo("pin")} />
        <Dong tieu="Giờ chơi & giới hạn" phu={`Trần ${d.thamSo.tran_ngay} phút/ngày`} trai={<BieuTron ic="dongho" />} bam={() => router.push(`/gio/${d.id}`)} />
        <Dong tieu="Thời gian màn hình" phu="App và trang web trong tuần, theo mục" trai={<BieuTron ic="cot" mau="tim" />} bam={() => router.push(`/man-hinh/${d.id}`)} />
        <Dong tieu={`Web của ${d.ten}`} phu="Trang đã vào, thời gian, cho phép hoặc chặn từng trang" trai={<BieuTron ic="web" mau="lam" />} bam={() => router.push(`/web/${d.id}`)} />
        <Dong tieu="Ví điểm" phu={`${d.soDu} điểm · cấp ${d.capDo.cap}`} trai={<BieuTron ic="xu" mau="vang" />} bam={() => router.push(`/vi/${d.id}`)} />
      </Nhom>
      {lk.d ? (
        <Nhom>
          <Dong dau tieu="Liên kết AiiRob" phu={`Dán mã này vào AiiRob để bài học đạt tự cộng điểm cho ${d.ten}`} trai={<BieuTron ic="sach" />} />
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
            <Chu kieu="rat" co={14} so mau={M.chu2}>{lk.d.ma}</Chu>
            <Nut chu="Sao chép mã" nho loai="vien" rong bam={() => saoChep(lk.d!.ma).then((ok) => ok && bao("Đã sao chép mã — dán vào AiiRob"))} />
          </View>
        </Nhom>
      ) : null}
      <BangTruot mo={mo === "ten"} dong={dong} tieu={`Đổi tên ${d.ten}`}>
        <ONhap nhan="Tên của Con" value={ten} onChangeText={setTen} autoCapitalize="words" />
        <BaoLoi loi={loiLam} />
        <Nut chu="Lưu tên" rong dangChay={dangChay} tat={!chuanHoaTen(ten) || chuanHoaTen(ten) === chuanHoaTen(d.ten)} bam={() => lam(async () => {
          const moi = chuanHoaTen(ten);
          if (moi === chuanHoaTen(d.ten)) { dong(); return; }
          await bm.goi(`con/${d.id}/sua`, { ten: moi }); dong(); bao(`Đã đổi tên ${d.ten} thành ${moi}`); await tai();
        })} />
      </BangTruot>
      <BangTruot mo={mo === "pin"} dong={dong} tieu={`Mã PIN mới của ${d.ten}`}>
        <ONhap nhan="4–6 chữ số" value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry />
        <BaoLoi loi={loiLam} />
        <Nut chu="Lưu mã PIN" rong dangChay={dangChay} tat={!/^\d{4,6}$/.test(pin)} bam={() => lam(async () => {
          await bm.goi(`con/${d.id}/sua`, { pin }); dong(); setPin(""); bao(`Đã đặt PIN mới cho ${d.ten}`);
        })} />
      </BangTruot>
      <BangTruot mo={mo === "nhom"} dong={dong} tieu="Nhóm trải nghiệm">
        <ChonMot ds={[{ gia: "nhi" as const, chu: "Nhí (6–10)" }, { gia: "teen" as const, chu: "Teen (11–16)" }]} gia={d.nhom} doi={(v) => lam(async () => {
          await bm.goi(`con/${d.id}/sua`, { nhom: v }); dong(); await tai();
        })} />
        <Chu co={13} mau={M.chu3}>Nhí: icon to, ≤ 3 lựa chọn, Rob đọc to. Teen: gọn, đủ số liệu.</Chu>
      </BangTruot>
      {mo && typeof mo === "object" ? (
        <BangTruot mo dong={dong} tieu={`Gỡ ${mo.ten}`}>
          <Chu mau={M.chu2}>Gỡ an toàn: máy tự gỡ sạch AiiGrow ở lần đồng bộ tới rồi mới rời danh sách, để không có gì «dính» lại trên máy của Con. Cần nhập lại mật khẩu của chủ gia đình. Ở đó cũng có chế độ Giám sát / Chặn thật và cách gỡ tại máy khi không có mạng.</Chu>
          <Nut chu="Mở An toàn & gỡ cài đặt" rong bam={() => { const id = mo.go; dong(); router.push(`/may/${id}`); }} />
          <View><Nut chu="Giữ lại" loai="ma" rong bam={() => dong()} /></View>
        </BangTruot>
      ) : null}
    </Man>
  );
}
