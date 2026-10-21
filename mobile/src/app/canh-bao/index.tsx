// bm-canh-bao: ngoại lệ vượt ngưỡng + gợi ý chỉnh cấu hình (Ba Mẹ chọn, FR-07.01/07.03), an toàn thiết bị (FR-07.02).
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm, type CanhBao, type GiaDinh } from "@/lib/api";
import { BieuTron, Canh, CanhGiua, ChoTai, Chu, Dong, gioPhut, HaiNut, M, Man, Nhan, Nhom, NhomTieu, Nut, The, useHoanTac, useLam, useTai } from "@/lib/ui";

const MUC = { thong_tin: ["Thông tin", "lam"], chu_y: ["Chú ý", "canh"], nghiem_trong: ["Nghiêm trọng", "loi"] } as const;
const AN_TOAN = ["lech_gio", "ngung_chay", "go_cai_dat", "tai_khoan_la", "offline_lau", "safe_mode", "bang_chung_trung"];

export default function DsCanhBao() {
  const { d, loi, matMang, tai } = useTai(async () => ({ ds: (await bm.goi<{ ds: CanhBao[] }>("canh-bao")).ds, g: await bm.goi<GiaDinh>("gia-dinh") }));
  const { lam } = useLam();
  const { bao, noi } = useHoanTac();
  const [boQua, setBoQua] = useState<string[]>([]);      // «Bỏ qua» gợi ý (thiết kế bm-canh-bao) — chỉ ẩn trên màn này, không đổi cấu hình
  const an = (k: string) => { setBoQua((x) => [...x, k]); bao("Đã bỏ qua gợi ý", () => setBoQua((x) => x.filter((y) => y !== k))); };
  if (!d) return <Man lui={{ chu: "Hôm nay" }} tieu="Cảnh báo"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const ten = (id: string | null) => d.g.con.find((c) => c.id === id)?.ten ?? "";
  const ngoaiLe = d.ds.filter((x) => x.loai.startsWith("ngoai_le") || x.loai === "lech_nguoi_duyet");
  const anToan = d.ds.filter((x) => AN_TOAN.includes(x.loai));
  const khac = d.ds.filter((x) => !ngoaiLe.includes(x) && !anToan.includes(x));
  if (!d.ds.length) {
    return (
      <Man lui={{ chu: "Hôm nay" }} tieu="Cảnh báo">
        <CanhGiua lv="ngu" tieu="Tuần này yên ả" loi="Không có ngoại lệ vượt ngưỡng, máy nào cũng ổn.">
          <Nut chu="Xem báo cáo tuần" bam={() => router.push("/bao-cao")} />
        </CanhGiua>
      </Man>
    );
  }
  const manh = ngoaiLe.find((x) => x.loai === "ngoai_le_manh");
  const tuDong = (con: string) => lam(async () => { await bm.goi(`con/${con}/cau-hinh`, { tu_dong_15: true }); bao(`Đã bật tự đồng ý 15 phút cho ${ten(con)}`); });
  return (
    <Man lui={{ chu: "Hôm nay" }} tieu="Cảnh báo" noi={noi}>
      {ngoaiLe.length ? <Canh lv="trong-loi" mau="hong" tieu={manh ? manh.noi_dung.split(".")[0] : "Ngoại lệ đang tăng"} loi="Cảnh báo không chặn quyết định của Ba Mẹ — chỉ để cả nhà cùng nhìn số." /> : null}
      {ngoaiLe.length && boQua.length < (ngoaiLe[0].child_id ? 2 : 1) ? (
        <>
          <NhomTieu chu="Rob gợi ý — Ba Mẹ chọn" />
          {boQua.includes("diem") ? null : <The dem style={{ gap: 8 }}>
            <Chu kieu="rat">Tăng điểm nhiệm vụ Con hay làm</Chu>
            <Chu co={13} mau={M.chu3}>Con hết điểm nhanh thì dễ xin ngoại lệ. Tăng điểm một nhiệm vụ để Con tự kiếm thêm.</Chu>
            <HaiNut><Nut chu="Sửa điểm nhiệm vụ" nho bam={() => router.push("/diem-qua")} /><Nut chu="Bỏ qua" nho loai="vien" bam={() => an("diem")} /></HaiNut>
          </The>}
          {ngoaiLe[0].child_id && !boQua.includes("tu_dong") ? (
            <The dem style={{ gap: 8 }}>
              <Chu kieu="rat">Tự đồng ý 15 phút nếu đủ điểm, 1 lần/ngày</Chu>
              <Chu co={13} mau={M.chu3}>Bớt việc phải duyệt tay. Mọi lần tự duyệt vẫn ghi nhật ký.</Chu>
              <HaiNut><Nut chu="Bật quy tắc" nho loai="vien" bam={() => tuDong(ngoaiLe[0].child_id!)} /><Nut chu="Bỏ qua" nho loai="ma" bam={() => an("tu_dong")} /></HaiNut>
            </The>
          ) : null}
        </>
      ) : null}
      {[["An toàn thiết bị", anToan], ["Khác", khac]].map(([t, ds]) => (ds as CanhBao[]).length ? (
        <View key={t as string} style={{ gap: 12 }}>
          <NhomTieu chu={t as string} />
          <Nhom>
            {(ds as CanhBao[]).map((x, i) => (
              <Dong key={x.id} dau={i === 0} tieu={x.noi_dung} phu={`${ten(x.child_id) ? `${ten(x.child_id)} · ` : ""}${gioPhut(x.created_at)}`}
                trai={<BieuTron ic={x.loai === "lech_gio" ? "dongho" : x.loai === "offline_lau" ? "wifi" : "canh_bao"} mau={x.muc === "nghiem_trong" ? "do" : "cam"} />}
                phai={<Nhan chu={MUC[x.muc][0]} loai={MUC[x.muc][1]} />} bam={() => router.push(`/canh-bao/${x.id}`)} />
            ))}
          </Nhom>
        </View>
      ) : null)}
      {ngoaiLe.map((x) => <Chu key={x.id} co={13} mau={M.chu3}>{`${gioPhut(x.created_at)} · ${x.noi_dung}`}</Chu>)}
    </Man>
  );
}
