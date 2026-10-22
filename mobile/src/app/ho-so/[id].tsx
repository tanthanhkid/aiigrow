// bm-ho-so-con: hồ sơ Con & thiết bị — mức bảo vệ (Đầy đủ / Một phần / Chưa), Online/Offline + lần đồng bộ cuối (FR-01.03),
// nhóm trải nghiệm, đặt lại PIN, ghép thêm máy. Gỡ máy: chuyển sang màn máy › «An toàn & gỡ cài đặt» (gỡ an toàn — chủ gia đình +
// mật khẩu, máy chỉ rời danh sách khi agent báo đã gỡ; không gỡ thẳng ở đây để khỏi bỏ AiiGrow «mồ côi» trên máy Con).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type ConChiTiet } from "@/lib/api";
import { saoChep } from "@/lib/luu-tep";
import { datTl } from "@/lib/thiet-lap";
import {
  BangTruot, BaoLoi, BieuTron, Canh, ChoTai, ChonMot, Chu, Dong, M, Man, Nhan, Nhom, Nut, ONhap, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";

const BAO_VE = { day_du: ["Đầy đủ", "ok"], mot_phan: ["Một phần", "canh"], chua: ["Chưa bảo vệ", "loi"] } as const;
// Chữ giải thích dưới nhãn: nói RÕ thiếu gì và làm gì (không để Ba Mẹ đoán vì sao «Một phần» / «Chưa bảo vệ»).
const IC_NEN = { windows: "may_tinh", mac: "laptop", ios: "tablet", android: "dt" } as const;

export default function HoSoCon() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<ConChiTiet>(`con/${id}`));
  const [mo, setMo] = useState<"pin" | "nhom" | { go: string; ten: string } | null>(null);
  const [pin, setPin] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  // M6: mã liên kết AiiRob «<family_id>.<child_id>» — tải riêng, lỗi thì chỉ ẩn mục này
  const lk = useTai(() => bm.goi<{ ma: string }>(`con/${id}/lien-ket-aiirob`));
  if (!d) return <Man lui={{ chu: "Hôm nay" }} tieu="Hồ sơ Con"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const may = d.may;
  const thieu = may.filter((m) => m.baoVe !== "day_du").length;
  return (
    <Man lui={{ chu: "Hôm nay" }} tieu={d.ten} noi={noi}>
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
            trai={<BieuTron ic="canh_bao" mau="cam" />} />
          {(m.baoVeThieu ?? []).map((t) => <Dong key={t.ma} tieu={`Thiếu: ${t.ten}`} phu={`Cách làm: ${t.cach}`} trai={<BieuTron ic="khoa" />} />)}
        </Nhom>
      ))}
      <Nut chu="Ghép thêm máy" ic="laptop" loai="vien" rong bam={() => { datTl({ conId: d.id, tenCon: d.ten, nhom: d.nhom }); router.push("/thiet-lap/may"); }} />
      <Nhom>
        <Dong dau tieu="Nhóm trải nghiệm" phu={`${d.nhom === "teen" ? "Teen" : "Nhí"}${d.namSinh ? ` · ${new Date().getFullYear() - d.namSinh} tuổi` : ""}`} trai={<BieuTron ic="cuoi" mau="vang" />} bam={() => setMo("nhom")} />
        <Dong tieu={`Mã PIN của ${d.ten}`} phu="Đặt lại khi Con quên — Con đăng xuất ở mọi máy" trai={<BieuTron ic="khoa" />} bam={() => setMo("pin")} />
        <Dong tieu="Giờ chơi & giới hạn" phu={`Trần ${d.thamSo.tran_ngay} phút/ngày`} trai={<BieuTron ic="dongho" />} bam={() => router.push(`/gio/${d.id}`)} />
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
      <BangTruot mo={mo === "pin"} dong={() => setMo(null)} tieu={`Mã PIN mới của ${d.ten}`}>
        <ONhap nhan="4–6 chữ số" value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry />
        <BaoLoi loi={loiLam} />
        <Nut chu="Lưu mã PIN" rong dangChay={dangChay} tat={!/^\d{4,6}$/.test(pin)} bam={() => lam(async () => {
          await bm.goi(`con/${d.id}/sua`, { pin }); setMo(null); setPin(""); bao(`Đã đặt PIN mới cho ${d.ten}`);
        })} />
      </BangTruot>
      <BangTruot mo={mo === "nhom"} dong={() => setMo(null)} tieu="Nhóm trải nghiệm">
        <ChonMot ds={[{ gia: "nhi" as const, chu: "Nhí (6–10)" }, { gia: "teen" as const, chu: "Teen (11–16)" }]} gia={d.nhom} doi={(v) => lam(async () => {
          await bm.goi(`con/${d.id}/sua`, { nhom: v }); setMo(null); await tai();
        })} />
        <Chu co={13} mau={M.chu3}>Nhí: icon to, ≤ 3 lựa chọn, Rob đọc to. Teen: gọn, đủ số liệu.</Chu>
      </BangTruot>
      {mo && typeof mo === "object" ? (
        <BangTruot mo dong={() => setMo(null)} tieu={`Gỡ ${mo.ten}`}>
          <Chu mau={M.chu2}>Gỡ an toàn: máy tự gỡ sạch AiiGrow ở lần đồng bộ tới rồi mới rời danh sách, để không có gì «dính» lại trên máy của Con. Cần nhập lại mật khẩu của chủ gia đình. Ở đó cũng có chế độ Giám sát / Chặn thật và cách gỡ tại máy khi không có mạng.</Chu>
          <Nut chu="Mở An toàn & gỡ cài đặt" rong bam={() => { const id = mo.go; setMo(null); router.push(`/may/${id}`); }} />
          <View><Nut chu="Giữ lại" loai="ma" rong bam={() => setMo(null)} /></View>
        </BangTruot>
      ) : null}
    </Man>
  );
}
