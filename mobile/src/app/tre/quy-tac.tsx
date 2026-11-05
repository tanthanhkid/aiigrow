// con-quy-tac «Bảng quy tắc của nhà mình» (BRD 8.1, FR-06.05, thiết kế 05/11): giờ chơi mỗi ngày (một quỹ cho mọi app), 10 sao = N phút,
// giờ ngủ — công khai một chỗ, ai cũng thấy giống nhau. Con không thấy cấu hình nội bộ của Ba Mẹ. Teen: thêm nhiệm vụ → sao, quà → sao.
import { BieuTron, Canh, ChoTai, Dong, Nhan, Nhom, NhomTieu } from "@/lib/ui";
import { ManTre, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type QuyTac } from "@/lib/api-tre";

/** 05/11: quy-tac trả thêm quỹ ngày thường / cuối tuần + tỷ lệ sao (máy chủ cũ không có ⇒ dùng tranNgay, 10 sao = 10 phút). */
type QuyTacSao = QuyTac & { quyNgayThuong?: number; quyCuoiTuan?: number; phut10Sao?: number };


export default function QuyTacNha() {
  const { nhom } = useTre();
  const { d, loi, matMang, tai } = useTaiTre("quy-tac", () => kid.goi<QuyTacSao>("quy-tac"));
  if (!d) return <ManTre lui={{ chu: "Nhà", ve: "/tre/nha" }}><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  return (
    <ManTre lui={{ chu: "Nhà", ve: "/tre/nha" }}>
      <Canh lv="so-tay" mau="vang" tieu="Quy tắc nhà mình" loi="Ai cũng thấy giống nhau — công bằng!" thap />
      <Nhom>
        <Dong dau tieu="Giờ chơi mỗi ngày" phu={`Ngày thường ${d.quyNgayThuong ?? d.tranNgay} phút · cuối tuần ${d.quyCuoiTuan ?? d.quyNgayThuong ?? d.tranNgay} phút`}
          trai={<BieuTron ic="dongho" />} />
        <Dong tieu="Mọi app chơi dùng chung" phu="App học không tính giờ" trai={<BieuTron ic="game" mau="vang" />} />
        <Dong tieu="Sao đổi giờ chơi" phu={`10 sao = ${d.phut10Sao ?? 10} phút, cộng vào giờ chơi hôm nay`} trai={<BieuTron ic="sao" mau="vang" />} />
        <Dong tieu="App và web mới" phu="Xin Ba Mẹ duyệt — không dùng sao để mở" trai={<BieuTron ic="tin" mau="tim" />} />
        <Dong tieu="Giờ ngủ" phu={`${d.lich.ngu.tu}–${d.lich.ngu.den} · máy nghỉ, chỉ xin Ba Mẹ mở ngoại lệ`} trai={<BieuTron ic="trang_ngu" mau="tim" />} />
      </Nhom>
      {nhom === "teen" ? (
        <>
          {d.nhiemVu.length ? (
            <>
              <NhomTieu chu="Nhiệm vụ → sao" />
              <Nhom>{d.nhiemVu.map((x, i) => <Dong key={`${x.ten}${i}`} dau={i === 0} tieu={x.ten} phai={<Nhan chu={`+${x.diem}`} loai="diem" />} />)}</Nhom>
            </>
          ) : null}
          {d.qua.length ? (
            <>
              <NhomTieu chu="Quà → sao" />
              <Nhom>{d.qua.map((x, i) => <Dong key={`${x.ten}${i}`} dau={i === 0} tieu={x.ten} phai={<Nhan chu={`${x.diem} sao`} loai="xam" />} />)}</Nhom>
            </>
          ) : null}
        </>
      ) : null}
    </ManTre>
  );
}
