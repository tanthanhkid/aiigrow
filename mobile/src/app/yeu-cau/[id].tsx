// Xử lý yêu cầu của Con (FR-05.02):
//  • mở web / cài app (bm-yeu-cau-web): xếp vào Học tập (miễn phí) / Giải trí (trừ điểm), phạm vi Lần này / Hôm nay / Luôn luôn
//  • thêm giờ (bm-them-gio): «Trừ điểm» hoặc «Ngoại lệ — không trừ»; vượt ngưỡng ngoại lệ thì cảnh báo mềm/mạnh TRƯỚC khi xác nhận
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, tieuYc, type YeuCau } from "@/lib/api";
import {
  Bao, BaoLoi, BieuTron, Canh, ChoTai, ChonMot, Chu, gioPhut, HaiNut, M, Man, Nut, OChon, ONhap, BangTruot, baoKhiVe, useLam, useTai,
} from "@/lib/ui";

type ChiTiet = YeuCau & { trang_thai: string; soDu: number; giaPhut: number;
  xemTruoc: { mucCanhBao: "khong" | "mem" | "manh"; soTuan: number; cau: string | null }; ngoaiLeTheoNguoi: { ten: string; n: number }[] };

export default function XuLyYeuCau() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<ChiTiet>(`yeu-cau/${id}`));
  const [phanLoai, setPhanLoai] = useState<"hoc" | "giai_tri">("hoc");
  const [phamVi, setPhamVi] = useState<"lan_nay" | "hom_nay" | "vinh_vien">("vinh_vien");
  const [truDiem, setTruDiem] = useState<boolean | null>(null);
  const [phut, setPhut] = useState<number | null>(null);
  const [tuChoi, setTuChoi] = useState(false);
  const [lyDo, setLyDo] = useState("Hôm nay chơi đủ rồi");
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Chờ duyệt" }} tieu="Yêu cầu"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const web = d.loai === "mo_web" || d.loai === "cai_app";
  const p = phut ?? d.phut ?? 15;
  const diemCan = Math.ceil(p * d.giaPhut);
  const coTheTru = d.loai === "them_gio" && d.soDu >= diemCan;
  const tru = truDiem ?? false;          // thiết kế bm-them-gio: mặc định «Ngoại lệ» để cảnh báo ngoại lệ hiện TRƯỚC khi xác nhận
  const daXuLy = d.trang_thai !== "cho";
  const dongY = (tru = truDiem ?? false) => lam(async () => {
    await bm.goi(`yeu-cau/${id}/dong-y`, web ? { phanLoai, phamVi } : { truDiem: tru, phut: p });
    baoKhiVe(web ? `Đã đồng ý cho ${d.ten_con} mở ${d.gia_tri}` : tru ? `Đã cho ${d.ten_con} thêm ${p} phút, trừ ${diemCan} điểm` : `Đã cho ${d.ten_con} thêm ${p} phút (ngoại lệ)`);
    router.back();
  }, { hangDoi: true });
  const guiTuChoi = () => lam(async () => {
    await bm.goi(`yeu-cau/${id}/tu-choi`, { lyDo });
    baoKhiVe(`Đã trả lời ${d.ten_con}: ${lyDo}`);
    router.back();
  });
  const theo = d.ngoaiLeTheoNguoi.map((x) => `${x.ten} ${x.n}`).join(", ");
  return (
    <Man lui={{ chu: "Chờ duyệt" }} tieu={`Yêu cầu của ${d.ten_con}`} day={daXuLy ? <Nut chu="Về hộp chờ duyệt" rong bam={() => router.back()} /> : (
      <>
        <BaoLoi loi={loiLam} />
        <Nut rong dangChay={dangChay} bam={() => dongY()}
          chu={web ? "Đồng ý · mở trong 10 giây" : tru ? `Đồng ý · trừ ${diemCan} điểm` : `Vẫn cho · ngoại lệ ${p} phút`} />
        {/* thiết kế bm-them-gio: nút viền «Đổi sang trừ N điểm» — đồng ý luôn nhưng trừ điểm (không tính ngoại lệ) */}
        {!web && !tru && coTheTru ? (
          <HaiNut>
            <Nut chu={`Đổi sang trừ ${diemCan} điểm`} loai="vien" bam={() => dongY(true)} />
            <Nut chu="Từ chối" loai="huy" bam={() => setTuChoi(true)} />
          </HaiNut>
        ) : <Nut chu="Từ chối, kèm lý do" loai="huy" rong bam={() => setTuChoi(true)} />}
      </>
    )}>
      <Canh lv={web ? "nghi" : "cho"} thap tieu={`${d.ten_con} ${tieuYc(d).toLowerCase()}`} loi={`“${d.ly_do}” · gửi lúc ${gioPhut(d.created_at)}.`} />
      {daXuLy ? <Bao loai="lam" ic="tick" tieu="Yêu cầu này đã được xử lý" loi="Có thể người khác trong nhà đã trả lời trước." /> : web ? (
        <>
          <View>
            <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>Xếp vào</Chu>
            <View style={{ gap: 8 }}>
              <OChon chon={phanLoai === "hoc"} bam={() => setPhanLoai("hoc")} trai={<BieuTron ic="mu" />} tieu="Học tập — miễn phí" phu="Không trừ điểm, dùng cả giờ học" />
              <OChon chon={phanLoai === "giai_tri"} bam={() => setPhanLoai("giai_tri")} trai={<BieuTron ic="game" mau="vang" />} tieu={`Giải trí — ${d.giaPhut} điểm/phút`} phu="Chỉ trong giờ chơi" />
            </View>
          </View>
          <View>
            <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>Cho phép</Chu>
            <ChonMot ds={[{ gia: "lan_nay", chu: "Lần này" }, { gia: "hom_nay", chu: "Hôm nay" }, { gia: "vinh_vien", chu: "Luôn luôn" }]} gia={phamVi} doi={setPhamVi} />
          </View>
          {phamVi !== "vinh_vien" && d.xemTruoc.cau ? <Bao tieu={`Đây là ngoại lệ thứ ${d.xemTruoc.soTuan} tuần này`} loi={d.xemTruoc.cau} /> : null}
        </>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            {d.loai === "them_gio" ? (
              <OChon chon={tru} bam={() => setTruDiem(true)} trai={<BieuTron ic="xu" mau="vang" />} tieu={`Trừ ${diemCan} điểm của ${d.ten_con}`}
                phu={coTheTru ? `${d.ten_con} còn ${d.soDu} → ${d.soDu - diemCan} điểm · không tính ngoại lệ` : `${d.ten_con} chỉ còn ${d.soDu} điểm — chưa đủ`} />
            ) : null}
            <OChon chon={!tru} bam={() => setTruDiem(false)} trai={<BieuTron ic="qua" mau="cam" />} tieu="Ngoại lệ — không trừ điểm" phu="Ghi nhận là ngoại lệ" />
          </View>
          {!tru && d.xemTruoc.mucCanhBao !== "khong" ? (
            <Bao tieu={`Ngoại lệ thứ ${d.xemTruoc.soTuan} tuần này của ${d.ten_con}`} loi={`${theo ? `Các lần trước: ${theo}. ` : ""}${d.xemTruoc.mucCanhBao === "manh" ? d.xemTruoc.cau : "Thử «Trừ điểm» lần này?"}`} />
          ) : null}
          <View>
            <Chu kieu="rat" co={14} style={{ marginBottom: 6 }}>Thời lượng</Chu>
            <ChonMot ds={[15, 30, 60].map((x) => ({ gia: x, chu: `${x} phút` }))} gia={p} doi={setPhut} />
          </View>
        </>
      )}
      <BangTruot mo={tuChoi} dong={() => setTuChoi(false)} tieu={`Vì sao chưa cho ${d.ten_con}?`}>
        <View style={{ gap: 8 }}>
          {["Hôm nay chơi đủ rồi", "Làm nhiệm vụ để có thêm điểm nhé", "Trang này chưa phù hợp với con"].map((x) =>
            <OChon key={x} chon={lyDo === x} bam={() => setLyDo(x)} tieu={x} />)}
        </View>
        <ONhap nhan="Hoặc tự viết" value={lyDo} onChangeText={setLyDo} maxLength={120} />
        <Chu co={13} mau={M.chu3}>{`${d.ten_con} thấy lý do và gợi ý làm nhiệm vụ — không có thông báo tiêu cực đột ngột.`}</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu={`Gửi cho ${d.ten_con}`} rong dangChay={dangChay} tat={!lyDo.trim()} bam={guiTuChoi} />
      </BangTruot>
    </Man>
  );
}
