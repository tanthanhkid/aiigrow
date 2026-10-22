// bm-cai-dat: Ba Mẹ (vai), thành viên gia đình (mời / đổi quyền ở /thanh-vien), thông báo + giờ yên lặng, giờ chơi theo từng Con, phân loại app & web, quy tắc tự động, trợ giúp, đăng xuất.
import { router } from "expo-router";
import { bm, type GiaDinh } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { Avt, BieuTron, ChoTai, Dong, Man, Nhan, Nhom, NhomTieu, Nut, Rob, useTai } from "@/lib/ui";

type Toi = { baMe: { id: string; ten: string; dinhDanh: string; vai: "chu" | "duyet" | "xem" } };
const VAI = { chu: "Chủ gia đình", duyet: "Thành viên phê duyệt", xem: "Chỉ xem" } as const;

export default function CaiDat() {
  const { ra } = usePhien();
  const { d, loi, matMang, tai } = useTai(async () => ({
    toi: await bm.goi<Toi>("toi"), g: await bm.goi<GiaDinh>("gia-dinh"), tv: (await bm.goi<{ ds: { id: string; ten: string; vai: keyof typeof VAI }[] }>("thanh-vien")).ds,
    luat: (await bm.goi<{ chuaXep: unknown[] }>("luat")).chuaXep.length,
  }));
  if (!d) return <Man tieuLon="Cài đặt"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const khac = d.tv.filter((x) => x.id !== d.toi.baMe.id);
  return (
    <Man tieuLon="Cài đặt" day={<Nut chu="Đăng xuất" ic="thoat" loai="vien" rong bam={ra} />}>
      <Nhom>
        <Dong dau tieu={d.toi.baMe.ten} phu={`${VAI[d.toi.baMe.vai]} · ${d.toi.baMe.dinhDanh}`} trai={<Avt ten={d.toi.baMe.ten} mau="#0b7a6e" />} />
      </Nhom>
      <NhomTieu chu="Gia đình" />
      <Nhom>
        <Dong dau tieu="Thành viên" phu={khac.length ? khac.map((x) => `${x.ten} (${VAI[x.vai].toLowerCase()})`).join(" · ") : "Chỉ mình Ba/Mẹ — mời Ba, Ông Bà cùng duyệt"} trai={<BieuTron ic="nguoi" />}
          bam={() => router.push("/thanh-vien")} />
        {d.g.con.map((c) => <Dong key={c.id} tieu={`Giờ chơi của ${c.ten}`} phu={`Trần ${c.tranNgay} phút/ngày`} trai={<BieuTron ic="dongho" />} bam={() => router.push(`/gio/${c.id}`)} />)}
        {d.g.con.map((c) => <Dong key={`web-${c.id}`} tieu={`Web của ${c.ten}`} phu="Thống kê, cho phép hoặc chặn từng trang" trai={<BieuTron ic="web" mau="lam" />} bam={() => router.push(`/web/${c.id}`)} />)}
        <Dong tieu="App & web" phu={d.luat ? `${d.luat} mục chưa xếp` : "Đã xếp hết"} trai={<BieuTron ic="luoi" />} phai={d.luat ? <Nhan loai="loi" chu={String(d.luat)} /> : undefined}
          bam={() => router.push("/app-web")} />
        <Dong tieu="An toàn thiết bị" phu="Tuân thủ từng máy, mở khẩn cấp, gỡ từ xa" trai={<BieuTron ic="khien" />} bam={() => router.push("/may")} />
        <Dong tieu="Cảnh báo & quy tắc tự động" phu="Ngoại lệ, gợi ý, an toàn thiết bị" trai={<BieuTron ic="tia" mau="vang" />} bam={() => router.push("/canh-bao")} />
        {d.g.con.map((c) => <Dong key={`hs-${c.id}`} tieu={`Hồ sơ & máy của ${c.ten}`} phu="Mức bảo vệ, mã PIN, ghép máy" trai={<BieuTron ic="khien" />} bam={() => router.push(`/ho-so/${c.id}`)} />)}
      </Nhom>
      <NhomTieu chu="Thông báo" />
      <Nhom>
        <Dong dau tieu="Thông báo" phu="Việc mới của cả nhà, gộp gọn" trai={<BieuTron ic="chuong" />} bam={() => router.push("/thong-bao")} />
        <Dong tieu="Giờ yên lặng" phu="Không đẩy lên màn khoá, trừ cảnh báo nghiêm trọng" trai={<BieuTron ic="trang_ngu" mau="tim" />} bam={() => router.push("/thong-bao/cai-dat")} />
      </Nhom>
      <NhomTieu chu="Trợ giúp" />
      <Nhom>
        <Dong dau tieu="Chat với AiiLab" phu="Người thật trả lời, thường trong 5 phút" trai={<Rob ten="rob-goc" co={44} />} bam={() => router.push("/ho-tro")} />
      </Nhom>
    </Man>
  );
}
