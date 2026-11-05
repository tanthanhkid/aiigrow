// bm1-ob-mau «Giao việc cho X» (bước 2/4, thiết kế chốt 04/11): chọn bộ việc (Tự lập · Học tập · Vận động · Sáng tạo), Rob gợi ý theo tuổi,
// mỗi việc một dòng (icon, lặp lại, số sao, chọn/bỏ), «Thêm việc riêng», tổng «Đủ N việc ⭐ X sao → đổi X phút chơi» (10 sao = 10 phút, L1).
// «Giao N việc cho X» ⇒ tạo từng việc (POST nhiem-vu, giao cho Con này) ⇒ Giờ chơi. Bộ việc theo máy chủ (L9) là việc của nhánh S1 —
// ở đây tạo việc thường đúng như hiện trên màn (cột DB `diem` = sao).
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { bm } from "@/lib/api";
import { BONG } from "@/lib/clay";
import { DauMan, LienKet, ThanhBuoc, TieuDe } from "@/lib/lan-dau";
import { layTl } from "@/lib/thiet-lap";
import { BaoLoi, Chu, Icon, Icon3D, M, Man, Nhan, Nut, Rob, The, useLam, type TenIcon } from "@/lib/ui";

type Viec = { ten: string; ic: TenIcon | "rob"; lap: string; sao: number; nhom: string; toiDa?: number };
const BO: { ma: string; ten: string; ic: TenIcon; ds: Viec[] }[] = [
  { ma: "tu_lap", ten: "Tự lập", ic: "nha", ds: [
    { ten: "Dọn phòng", ic: "lau", lap: "Mỗi ngày", sao: 10, nhom: "viec_nha", toiDa: 1 },
    { ten: "Đọc sách 20 phút", ic: "sach", lap: "Mỗi ngày", sao: 10, nhom: "doc_sach", toiDa: 1 },
    { ten: "Tự đánh răng", ic: "coc", lap: "Sáng và tối", sao: 10, nhom: "ky_nang", toiDa: 2 },
    { ten: "Tự xếp cặp", ic: "mu", lap: "Thứ 2 – Thứ 6", sao: 10, nhom: "ky_nang", toiDa: 1 },
    { ten: "Học 1 bài với AiiRob", ic: "rob", lap: "Mỗi ngày", sao: 20, nhom: "hoc_tap", toiDa: 1 },
  ] },
  { ma: "hoc_tap", ten: "Học tập", ic: "sach", ds: [
    { ten: "Đọc sách 20 phút", ic: "sach", lap: "Mỗi ngày", sao: 10, nhom: "doc_sach", toiDa: 1 },
    { ten: "Làm bài tập về nhà", ic: "but", lap: "Thứ 2 – Thứ 6", sao: 10, nhom: "hoc_tap", toiDa: 1 },
    { ten: "Luyện viết 1 trang", ic: "but", lap: "Mỗi ngày", sao: 10, nhom: "hoc_tap", toiDa: 1 },
    { ten: "Học 1 bài với AiiRob", ic: "rob", lap: "Mỗi ngày", sao: 20, nhom: "hoc_tap", toiDa: 1 },
  ] },
  { ma: "van_dong", ten: "Vận động", ic: "chay", ds: [
    { ten: "Nhảy dây 10 phút", ic: "chay", lap: "Mỗi ngày", sao: 10, nhom: "van_dong", toiDa: 1 },
    { ten: "Tập thể dục buổi sáng", ic: "chay", lap: "Mỗi ngày", sao: 10, nhom: "van_dong", toiDa: 1 },
    { ten: "Đạp xe / chạy bộ 30 phút", ic: "chay", lap: "Cuối tuần", sao: 20, nhom: "van_dong", toiDa: 1 },
  ] },
  { ma: "sang_tao", ten: "Sáng tạo", ic: "but", ds: [
    { ten: "Vẽ một bức tranh", ic: "but", lap: "Mỗi ngày", sao: 10, nhom: "ky_nang", toiDa: 1 },
    { ten: "Làm đồ thủ công", ic: "ban", lap: "Cuối tuần", sao: 20, nhom: "ky_nang", toiDa: 1 },
    { ten: "Viết nhật ký 5 câu", ic: "sach", lap: "Mỗi ngày", sao: 10, nhom: "ky_nang", toiDa: 1 },
  ] },
];

export default function ObMau() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [bo, setBo] = useState(0);
  const [bo2, setBo2] = useState<Record<string, boolean>>({});          // «<bộ>|<tên>» ⇒ bỏ chọn (mặc định: chọn hết bộ đang xem)
  const { lam, loi, dangChay } = useLam();
  const ds = BO[bo].ds;
  const chon = ds.filter((v) => !bo2[`${bo}|${v.ten}`]);
  const tong = chon.reduce((s, v) => s + v.sao, 0);
  const tuoi = tl.namSinh ? new Date().getFullYear() - tl.namSinh : null;
  const giao = () => lam(async () => {
    if (!tl.conId) throw new Error("Chưa biết giao việc cho con nào — quay lại bước hồ sơ con.");
    const co = new Set((await bm.goi<{ ds: { ten: string; giao_cho: string | null }[] }>("nhiem-vu")).ds.filter((x) => x.giao_cho === tl.conId).map((x) => x.ten));
    for (const v of chon) if (!co.has(v.ten)) {
      await bm.goi("nhiem-vu", { ten: v.ten, nhom: v.nhom, diem: v.sao, giao_cho: tl.conId, toi_da_ngay: v.toiDa ?? 1, mo_ta: v.lap,
        ...(v.ic === "rob" ? { bang_chung: "tu_dong", tu_duyet: true } : {}) });
    }
    router.push("/thiet-lap/gio");
  });
  return (
    <Man dau={<DauMan ve="/thiet-lap/ten-con" phai={<ThanhBuoc dang={1} />} />}
      day={<><BaoLoi loi={loi} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
          <Chu kieu="dam" co={13.5} mau={M.chu2}>{`Đủ ${chon.length} việc`}</Chu>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Nhan loai="diem" ic="sao" chu={`${tong} sao`} /><Chu co={13.5} mau={M.chu2}>→ đổi</Chu><Nhan chu={`${tong} phút chơi`} />
          </View>
        </View>
        <Nut chu={chon.length ? `Giao ${chon.length} việc cho ${ten}` : "Để sau, sang Giờ chơi"} rong dangChay={dangChay} bam={chon.length ? giao : () => router.push("/thiet-lap/gio")} /></>}>
      <TieuDe chu={`Giao việc cho ${ten}`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingRight: 8 }}>
        {BO.map((b, i) => (
          <Pressable key={b.ma} onPress={() => setBo(i)} accessibilityRole="tab" accessibilityState={{ selected: i === bo }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 46, paddingHorizontal: 14, borderRadius: 23,
              backgroundColor: i === bo ? M.chinh : M.the, boxShadow: i === bo ? BONG.ngoc : BONG.nho }}>
            <Icon3D ten={b.ic} co={22} /><Chu kieu="rat" co={15} mau={i === bo ? "#fff" : M.chu}>{b.ten}</Chu>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {tuoi ? <Nhan loai="xam" chu={`Hợp ${tuoi}–${tuoi + 1} tuổi`} /> : null}
        <Nhan loai="xam" chu={`~${Math.max(15, chon.length * 6)} phút/ngày`} />
        <Nhan loai="ok" chu="Rob gợi ý" />
      </View>
      <The sat>
        {ds.map((v, i) => {
          const k = `${bo}|${v.ten}`, co = !bo2[k];
          return (
            <Pressable key={k} onPress={() => setBo2((x) => ({ ...x, [k]: co }))} accessibilityRole="checkbox" accessibilityState={{ checked: co }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14, minHeight: 64, borderTopWidth: i ? 1 : 0, borderTopColor: "#efefec" }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#f1f0ec", alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
                {v.ic === "rob" ? <Rob ten="hoc" co={40} /> : <Icon3D ten={v.ic} co={30} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}><Chu kieu="rat" co={15.5}>{v.ten}</Chu><Chu co={13} mau={M.chu3}>{v.lap}</Chu></View>
              <Nhan loai="diem" ic="sao" chu={`${v.sao} sao`} />
              <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: co ? M.chinh : "#e6e5e1", boxShadow: co ? BONG.ngoc : BONG.lom }}>
                {co ? <Icon ten="tick" mau="#fff" co={16} /> : null}
              </View>
            </Pressable>
          );
        })}
      </The>
      <LienKet chu="+ Thêm việc riêng" bam={() => router.push({ pathname: "/giao-nv", params: tl.conId ? { con: tl.conId } : {} })} />
    </Man>
  );
}
