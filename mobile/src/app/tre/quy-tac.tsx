// con-quy-tac «Bảng quy tắc của nhà mình» (BRD 8.1, FR-06.05): giờ chơi, mỗi lần chơi, giá điểm/phút — công khai một chỗ, ai cũng thấy giống nhau.
// Con không thấy cấu hình nội bộ của Ba Mẹ. Teen: thêm bảng giá chi tiết (nhiệm vụ → điểm, quà → điểm).
import { BieuTron, Canh, ChoTai, Dong, Nhan, Nhom, NhomTieu } from "@/lib/ui";
import { ManTre, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type QuyTac } from "@/lib/api-tre";

const so = (n: number) => String(n).replace(".", ",");
const khung = (ds: { tu: string; den: string }[]) => (ds.length ? ds.map((k) => `${k.tu}–${k.den}`).join(", ") : "không có");

export default function QuyTacNha() {
  const { nhom } = useTre();
  const { d, loi, matMang, tai } = useTaiTre("quy-tac", () => kid.goi<QuyTac>("quy-tac"));
  if (!d) return <ManTre lui={{ chu: "Nhà", ve: "/tre/nha" }}><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  return (
    <ManTre lui={{ chu: "Nhà", ve: "/tre/nha" }}>
      <Canh lv="so-tay" mau="vang" tieu="Quy tắc nhà mình" loi="Ai cũng thấy giống nhau — công bằng!" thap />
      <Nhom>
        <Dong dau tieu="Giờ chơi" phu={`${khung(d.lich.ngayThuong)} · cuối tuần ${khung(d.lich.cuoiTuan)}`} trai={<BieuTron ic="dongho" />} />
        <Dong tieu="Mỗi lần chơi" phu={`Tối đa ${d.phienToiDa} phút, nghỉ ${d.nghiGiua} phút`} trai={<BieuTron ic="dong_ho_cat" mau="vang" />} />
        <Dong tieu="Mỗi ngày" phu={`Chơi tối đa ${d.tranNgay} phút`} trai={<BieuTron ic="lich" />} />
        <Dong tieu="Trò chơi" phu={`${so(d.giaPhut.game)} điểm/phút`} trai={<BieuTron ic="game" mau="vang" />} />
        <Dong tieu="Video ngắn" phu={`${so(d.giaPhut.video_ngan)} điểm/phút`} trai={<BieuTron ic="tia" mau="cam" />} />
        <Dong tieu="Mạng xã hội" phu={`${so(d.giaPhut.mxh)} điểm/phút`} trai={<BieuTron ic="tin" mau="tim" />} />
        <Dong tieu="Phim gia đình" phu={d.giaPhut.phim_gd ? `${so(d.giaPhut.phim_gd)} điểm/phút` : "Không trừ điểm"} trai={<BieuTron ic="ban" mau="lam" />} />
        <Dong tieu="Giờ ngủ" phu={`${d.lich.ngu.tu}–${d.lich.ngu.den} · máy nghỉ, chỉ còn app học`} trai={<BieuTron ic="trang_ngu" mau="tim" />} />
      </Nhom>
      {nhom === "teen" ? (
        <>
          {d.nhiemVu.length ? (
            <>
              <NhomTieu chu="Nhiệm vụ → điểm" />
              <Nhom>{d.nhiemVu.map((x, i) => <Dong key={`${x.ten}${i}`} dau={i === 0} tieu={x.ten} phai={<Nhan chu={`+${x.diem}`} loai="diem" />} />)}</Nhom>
            </>
          ) : null}
          {d.qua.length ? (
            <>
              <NhomTieu chu="Quà → điểm" />
              <Nhom>{d.qua.map((x, i) => <Dong key={`${x.ten}${i}`} dau={i === 0} tieu={x.ten} phai={<Nhan chu={`${x.diem} điểm`} loai="xam" />} />)}</Nhom>
            </>
          ) : null}
        </>
      ) : null}
    </ManTre>
  );
}
