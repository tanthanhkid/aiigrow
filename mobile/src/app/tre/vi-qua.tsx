// con-vi-qua «Ví quà của Ken» (FR-04.03): phiếu quà QR mã duy nhất, dùng 1 lần, hạn 60 ngày — đưa nhân viên AiiCafe quét. Quà chờ Ba Mẹ trao, phiếu đã dùng.
import { router } from "expo-router";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BieuTron, CanhGiua, ChoTai, Chu, Dong, F, Nhan, Nhom, Nut, tien } from "@/lib/ui";
import { MaQr } from "@/lib/qr";
import { DiemTren, ManTre, ngayCua, useTaiTre } from "@/lib/ui-tre";
import { kid, type NhaTre, type ViQua } from "@/lib/api-tre";

export default function ViQuaTre() {
  const { d, loi, matMang, tai, dangTai } = useTaiTre("vi-qua", async () => {
    const [vi, nha] = await Promise.all([kid.goi<ViQua>("vi-qua"), kid.goi<NhaTre>("nha")]);
    return { vi, nha };
  });
  if (!d) return <ManTre tab="cua-hang"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const dung = d.vi.voucher.filter((v) => v.trang_thai === "da_phat_hanh");
  const khac = d.vi.voucher.filter((v) => v.trang_thai !== "da_phat_hanh");
  if (!d.vi.voucher.length && !d.vi.phieu.length) {
    return (
      <ManTre tab="cua-hang">
        <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
        <CanhGiua lv="qua" tieu="Ví quà còn trống" loi="Đổi điểm trong Cửa hàng là quà hiện ở đây.">
          <Nut chu="Vào Cửa hàng" bam={() => router.replace("/tre/cua-hang")} />
        </CanhGiua>
      </ManTre>
    );
  }
  return (
    <ManTre tab="cua-hang" tai={tai} dangTai={dangTai}>
      <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
      {dung.map((v) => (
        <View key={v.ma} style={{ borderRadius: 26, overflow: "hidden", backgroundColor: "#3b2210" }}
          accessibilityLabel={`Phiếu quà ${tien(v.menh_gia)}, mã ${v.ma}, dùng trước ${ngayCua(v.het_han)}`}>
          <LinearGradient colors={["#6b3f1d", "#3b2210"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, gap: 4 }}>
            <Text style={{ fontFamily: F.dam, fontSize: 13, color: "#fff" }}>AiiCafe · Phiếu quà</Text>
            <Text style={{ fontFamily: F.rat, fontSize: 26, color: "#fff", lineHeight: 32 }}>{`Phiếu quà ${tien(v.menh_gia)}`}</Text>
            <View style={{ alignItems: "center", marginTop: 8, marginBottom: 4 }}><MaQr noiDung={v.ma} co={200} /></View>
            <Text style={{ fontFamily: F.rat, fontSize: 16, color: "#fff", letterSpacing: 2, textAlign: "center", fontVariant: ["tabular-nums"] }} selectable>{v.ma}</Text>
            <Text style={{ fontFamily: F.dam, fontSize: 14, color: "#fff", textAlign: "center" }}>{`Dùng trước ${ngayCua(v.het_han)}`}</Text>
          </LinearGradient>
        </View>
      ))}
      {dung.length ? <Chu co={13} mau="#5f6b68" style={{ textAlign: "center" }}>Đưa mã này cho nhân viên AiiCafe quét. Mỗi phiếu chỉ dùng một lần.</Chu> : null}
      {d.vi.phieu.length || khac.length ? (
        <Nhom>
          {d.vi.phieu.map((p, i) => (
            <Dong key={p.id} dau={i === 0} tieu={p.ten} phu={`${p.loai === "voucher" ? "Chờ Ba Mẹ xác nhận" : "Chờ Ba Mẹ trao"} · đổi ${ngayCua(p.created_at).slice(0, 5)}`}
              trai={<BieuTron ic={p.loai === "voucher" ? "coc" : "qua"} mau="lam" />} phai={<Nhan chu={p.loai === "voucher" ? "Chờ duyệt" : "Chờ trao"} loai="canh" />} />
          ))}
          {khac.filter((v) => v.trang_thai !== "cho_xac_nhan").map((v, i) => (
            <Dong key={v.ma} dau={!d.vi.phieu.length && i === 0} tieu={`Phiếu quà AiiCafe ${tien(v.menh_gia)}`}
              phu={v.trang_thai === "da_dung" ? `Đã dùng ${ngayCua(v.dung_luc).slice(0, 5)}` : v.trang_thai === "het_han" ? `Hết hạn ${ngayCua(v.het_han).slice(0, 5)}` : "Đã thu hồi"}
              trai={<BieuTron ic="coc" mau="cam" />} phai={<Nhan chu={v.trang_thai === "da_dung" ? "Đã dùng" : v.trang_thai === "het_han" ? "Hết hạn" : "Thu hồi"} loai="xam" />} />
          ))}
        </Nhom>
      ) : null}
    </ManTre>
  );
}
