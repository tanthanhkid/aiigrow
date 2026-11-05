// «Quà của con» (FR-04.03, thiết kế 05/11 con-ngay-thuong «Đã gửi Ba Mẹ» / «Ba Mẹ đã trao quà»): quà chờ Ba Mẹ trao + quà đã trao.
// 05/11 bỏ phiếu quà AiiCafe / mã QR — phiếu cũ còn hạn (nếu có) chỉ hiện một dòng để Ba Mẹ mang tới quầy.
import { router } from "expo-router";
import { BieuTron, CanhGiua, ChoTai, Chu, Dong, M, Nhan, Nhom, NhomTieu, Nut, tien } from "@/lib/ui";
import { DiemTren, ManTre, ngayCua, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type NhaTre, type ViQua } from "@/lib/api-tre";

export default function ViQuaTre() {
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre("vi-qua", async () => {
    const [vi, nha] = await Promise.all([kid.goi<ViQua>("vi-qua"), kid.goi<NhaTre>("nha")]);
    return { vi, nha };
  });
  if (!d) return <ManTre tab="cua-hang"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const cho = d.vi.phieu.filter((p) => p.loai !== "voucher");
  const daTrao = d.vi.daTrao ?? [];
  const phieuCu = d.vi.voucher.filter((v) => v.trang_thai === "da_phat_hanh");
  if (!cho.length && !daTrao.length && !phieuCu.length) {
    return (
      <ManTre tab="cua-hang">
        <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
        <CanhGiua lv="qua" tieu={`${ten} chưa có quà nào`} loi="Đổi sao trong «Sao & quà» là quà hiện ở đây.">
          <Nut chu="Vào Sao & quà" bam={() => router.replace("/tre/cua-hang")} />
        </CanhGiua>
      </ManTre>
    );
  }
  return (
    <ManTre tab="cua-hang" tai={tai} vongTai>
      <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
      {cho.length ? (
        <>
          <NhomTieu chu="Đã gửi Ba Mẹ · chờ trao" />
          <Nhom>
            {cho.map((p, i) => (
              <Dong key={p.id} dau={i === 0} tieu={p.ten} phu={`Đổi ${ngayCua(p.created_at).slice(0, 5)} · ${p.diem} sao`}
                trai={<BieuTron ic="qua" mau="lam" />} phai={<Nhan chu="Chờ trao" loai="canh" />} />
            ))}
          </Nhom>
        </>
      ) : null}
      {daTrao.length ? (
        <>
          <NhomTieu chu="Ba Mẹ đã trao" />
          <Nhom>
            {daTrao.map((p, i) => (
              <Dong key={p.id} dau={i === 0} tieu={p.ten} phu={`Nhận ${ngayCua(p.xu_ly_luc).slice(0, 5)}`}
                trai={<BieuTron ic="qua" mau="vang" />} phai={<Nhan chu="Đã trao" loai="ok" />} />
            ))}
          </Nhom>
        </>
      ) : null}
      {phieuCu.length ? (
        <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>
          {`Còn ${phieuCu.length} phiếu quà AiiCafe cũ (${phieuCu.map((v) => tien(v.menh_gia)).join(", ")}) — nhờ Ba Mẹ mang tới quầy trước ${ngayCua(phieuCu[0].het_han)}.`}
        </Chu>
      ) : null}
    </ManTre>
  );
}
