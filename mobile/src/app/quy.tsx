// bm-quy-thieu: quỹ phiếu quà trả trước (FR-04.03) — nạp tại quầy AiiCafe (nhân viên ghi nhận ngay) hoặc chuyển khoản rồi nhắn AiiLab.
// Chưa có cổng thanh toán tự ghi nhận (cần tài khoản dịch vụ — KE-HOACH 5): không hiện nút «chuyển khoản tự động».
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { Bao, BieuTron, Canh, ChoTai, Dong, gioPhut, Man, Nhan, Nhom, NhomTieu, Nut, tien, useTai } from "@/lib/ui";

type Quy = { soDu: number; giaoDich: { so_tien: number; loai: string; ghi_chu: string; created_at: string }[] };

export default function QuyQua() {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<Quy>("quy"));
  if (!d) return <Man lui={{ chu: "Điểm & quà" }} tieu="Quỹ phiếu quà"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  return (
    <Man lui={{ chu: "Điểm & quà" }} tieu="Quỹ phiếu quà" day={<Nut chu="Chat với AiiLab để nạp" ic="tin" rong bam={() => router.push("/ho-tro")} />}>
      <Canh lv={d.soDu < 50_000 ? "trong-loi" : "qua"} mau={d.soDu < 50_000 ? "hong" : "vang"} thap tieu={`Quỹ còn ${tien(d.soDu)}`}
        loi={d.soDu < 50_000 ? "Con muốn đổi phiếu quà thì quỹ cần đủ mệnh giá. Điểm của Con vẫn giữ nguyên." : "Con đổi phiếu quà được ngay khi đủ điểm."} />
      <Nhom>
        <Dong dau tieu="Nạp tại quầy AiiCafe" phu="Nhân viên ghi nhận ngay, quỹ cập nhật trong vài giây" trai={<BieuTron ic="coc" mau="cam" />} />
        <Dong tieu="Chuyển khoản" phu="Nhắn AiiLab nội dung chuyển khoản — AiiLab ghi nhận trong 15 phút" trai={<BieuTron ic="qr" />} />
      </Nhom>
      <Bao loai="lam" ic="mat" tieu="Con đang thấy gì?" loi="«Đợi Ba Mẹ nạp quỹ nhé» — không có chữ lỗi, điểm không bị trừ." />
      {d.giaoDich.length ? (
        <>
          <NhomTieu chu="Giao dịch quỹ" />
          <Nhom>
            {d.giaoDich.map((g, i) => <Dong key={i} dau={i === 0} tieu={g.loai === "nap" ? "Nạp quỹ" : g.loai === "phat_hanh" ? `Phát hành ${g.ghi_chu}` : "Hoàn"}
              phu={gioPhut(g.created_at)} trai={<BieuTron ic={g.loai === "nap" ? "cong" : "the_qua"} mau={g.loai === "nap" ? "xanh" : "vang"} />}
              phai={<Nhan loai={g.so_tien > 0 ? "ok" : "xam"} chu={`${g.so_tien > 0 ? "+" : "−"}${tien(Math.abs(g.so_tien))}`} />} />)}
          </Nhom>
        </>
      ) : null}
    </Man>
  );
}
