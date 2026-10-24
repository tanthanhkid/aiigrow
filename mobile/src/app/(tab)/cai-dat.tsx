// bm-cai-dat «Gia đình» (thay tab Cài đặt): chỉ còn việc ít đụng — Ba Mẹ (vai), các Con (hồ sơ, PIN, nhóm), thành viên, quy tắc tự động,
// thông báo + giờ yên lặng, trợ giúp, đăng xuất. Việc hằng ngày (web, app, giờ, máy) đã lên Trang chủ.
import { router } from "expo-router";
import { bm, type GiaDinh } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { Avt, BieuTron, ChoTai, Dong, MAU_CON, Man, Nhom, NhomTieu, Nut, Rob, useTai } from "@/lib/ui";

type Toi = { baMe: { id: string; ten: string; dinhDanh: string; vai: "chu" | "duyet" | "xem" }; laAdmin?: boolean };
const VAI = { chu: "Chủ gia đình", duyet: "Thành viên phê duyệt", xem: "Chỉ xem" } as const;

export default function CaiDat() {
  const { ra } = usePhien();
  const { d, loi, matMang, tai } = useTai(async () => ({
    toi: await bm.goi<Toi>("toi"), g: await bm.goi<GiaDinh>("gia-dinh"), tv: (await bm.goi<{ ds: { id: string; ten: string; vai: keyof typeof VAI }[] }>("thanh-vien")).ds,
  }));
  if (!d) return <Man tieuLon="Gia đình"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const khac = d.tv.filter((x) => x.id !== d.toi.baMe.id);
  return (
    <Man tieuLon="Gia đình" day={<Nut chu="Đăng xuất" ic="thoat" loai="vien" rong bam={ra} />}>
      <Nhom>
        <Dong dau tieu={d.toi.baMe.ten} phu={`${VAI[d.toi.baMe.vai]} · ${d.toi.baMe.dinhDanh}`} trai={<Avt ten={d.toi.baMe.ten} mau="#0f6b5c" />} />
      </Nhom>
      <NhomTieu chu="Các Con" />
      <Nhom>
        {d.g.con.map((c, i) => <Dong key={c.id} dau={i === 0} tieu={c.ten} phu="Hồ sơ, nhóm tuổi, mã PIN, liên kết AiiRob" trai={<Avt ten={c.ten} mau={MAU_CON[i % MAU_CON.length]} />}
          bam={() => router.push(`/ho-so/${c.id}`)} />)}
        <Dong dau={!d.g.con.length} tieu="Thêm Con" trai={<BieuTron ic="cong" />} bam={() => router.push("/thiet-lap/ten-con")} />
      </Nhom>
      <NhomTieu chu="Mọi người" />
      <Nhom>
        <Dong dau tieu="Thành viên" phu={khac.length ? khac.map((x) => `${x.ten} (${VAI[x.vai].toLowerCase()})`).join(" · ") : "Chỉ mình Ba/Mẹ — mời Ba, Ông Bà cùng duyệt"} trai={<BieuTron ic="nguoi" />}
          bam={() => router.push("/thanh-vien")} />
        <Dong tieu="Cảnh báo & quy tắc tự động" phu="Ngoại lệ, gợi ý, an toàn thiết bị" trai={<BieuTron ic="tia" mau="vang" />} bam={() => router.push("/canh-bao")} />
      </Nhom>
      <NhomTieu chu="Thông báo" />
      <Nhom>
        <Dong dau tieu="Thông báo" phu="Việc mới của cả nhà, gộp gọn" trai={<BieuTron ic="chuong" />} bam={() => router.push("/thong-bao")} />
        <Dong tieu="Giờ yên lặng" phu="Không đẩy lên màn khoá, trừ cảnh báo nghiêm trọng" trai={<BieuTron ic="trang_ngu" mau="tim" />} bam={() => router.push("/thong-bao/cai-dat")} />
      </Nhom>
      <NhomTieu chu="Trợ giúp" />
      <Nhom>
        <Dong dau tieu="Chat với AiiLab" phu="Người thật trả lời, thường trong 5 phút" trai={<Rob ten="rob-goc" co={44} />} bam={() => router.push("/ho-tro")} />
        {d.toi.laAdmin ? <Dong tieu="Hộp thư hỗ trợ" phu="Tin của các gia đình gửi AiiLab — dành cho quản trị" trai={<BieuTron ic="tin" mau="tim" />} bam={() => router.push("/admin-ho-tro")} /> : null}
      </Nhom>
    </Man>
  );
}
