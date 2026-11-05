// bm1-ob-mau «Giao việc cho X» (bước 2/4, thiết kế chốt 04/11, L9): chọn bộ việc (GET nhiem-vu/bo — Tự lập, Phụ việc nhà, Học tập, Khoẻ mạnh),
// mỗi việc một dòng (hình, lặp lại, số sao, bỏ / giữ tick), «Thêm việc riêng», tổng «Đủ N việc ⭐ X sao → đổi X phút chơi» (10 sao = 10 phút).
// «Giao N việc cho X» ⇒ POST nhiem-vu/bo {bo, con, chon} ⇒ Giờ chơi.
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { bm } from "@/lib/api";
import { BONG } from "@/lib/clay";
import { DauMan, LienKet, ThanhBuoc, TieuDe } from "@/lib/lan-dau";
import { layTl } from "@/lib/thiet-lap";
import { BaoLoi, ChoTai, Chu, Icon, Icon3D, M, Man, Nhan, Nut, Rob, The, useLam, useTai, type TenIcon } from "@/lib/ui";

type ViecBo = { ten: string; moTa: string; sao: number; tuCham: boolean; lapLai: string; hinh: string; nhan: string | null };
type BoViec = { ma: string; ten: string; tuoi: string; soViec: number; saoToiDaNgay: number; viec: ViecBo[] };

/** Hình của bộ / việc (máy chủ trả tên hình) ⇒ icon 3D có trong app. */
const HINH: Record<string, TenIcon> = { choi: "lau", ban_chai: "coc", sach: "sach", cap: "mu", cay: "nha", bat: "chen", ao: "nha", rac: "nha", ban_an: "chen",
  ban_hoc: "lau", vo: "but", but: "but", the_tu: "sach", day: "chay", the_duc: "chay", rau: "coc", ngu: "trang_ngu" };
const IC_BO: Record<string, TenIcon> = { tu_lap: "nha", viec_nha: "lau", hoc_tap: "sach", khoe_manh: "chay" };
const LAP: Record<string, string> = { hang_ngay: "Mỗi ngày", ngay_thuong: "Thứ 2 – Thứ 6", cuoi_tuan: "Cuối tuần", mot_lan: "Một lần" };

export default function ObMau() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const { d, loi: loiTai, matMang, tai } = useTai(() => bm.goi<{ ds: BoViec[] }>("nhiem-vu/bo"));
  const [bo, setBo] = useState(0);
  const [bo2, setBo2] = useState<Record<string, boolean>>({});          // «<bộ>|<tên>» ⇒ bỏ tick (mặc định giữ cả bộ)
  const { lam, loi, dangChay } = useLam();
  const dsBo = d?.ds ?? [];
  const b = dsBo[bo];
  const chon = b ? b.viec.filter((v) => !bo2[`${b.ma}|${v.ten}`]) : [];
  const tong = chon.reduce((s, v) => s + v.sao, 0);
  const giao = () => lam(async () => {
    if (!tl.conId) throw new Error("Chưa biết giao việc cho con nào — quay lại bước hồ sơ con.");
    await bm.goi("nhiem-vu/bo", { bo: b!.ma, con: tl.conId, chon: chon.map((v) => v.ten) });
    router.push("/thiet-lap/gio");
  });
  const dau = <DauMan ve="/thiet-lap/ten-con" phai={<ThanhBuoc dang={1} />} />;
  if (!b) return <Man dau={dau}><TieuDe chu={`Giao việc cho ${ten}`} /><ChoTai loi={loiTai} matMang={matMang} tai={tai} /></Man>;
  return (
    <Man dau={dau}
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
        {dsBo.map((x, i) => (
          <Pressable key={x.ma} onPress={() => setBo(i)} accessibilityRole="tab" accessibilityState={{ selected: i === bo }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 46, paddingHorizontal: 14, borderRadius: 23,
              backgroundColor: i === bo ? M.chinh : M.the, boxShadow: i === bo ? BONG.ngoc : BONG.nho }}>
            <Icon3D ten={IC_BO[x.ma] ?? "sao"} co={22} /><Chu kieu="rat" co={15} mau={i === bo ? "#fff" : M.chu}>{x.ten}</Chu>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        <Nhan loai="xam" chu={`Hợp ${b.tuoi}`} />
        <Nhan loai="xam" chu={`~${Math.max(15, chon.length * 6)} phút/ngày`} />
        <Nhan loai="ok" chu="Rob gợi ý" />
      </View>
      <The sat>
        {b.viec.map((v, i) => {
          const k = `${b.ma}|${v.ten}`, co = !bo2[k];
          return (
            <Pressable key={k} onPress={() => setBo2((x) => ({ ...x, [k]: co }))} accessibilityRole="checkbox" accessibilityState={{ checked: co }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14, minHeight: 64, borderTopWidth: i ? 1 : 0, borderTopColor: "#efefec" }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#f1f0ec", alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
                {v.hinh === "rob" ? <Rob ten="hoc" co={40} /> : <Icon3D ten={HINH[v.hinh] ?? "sao"} co={30} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}><Chu kieu="rat" co={15.5}>{v.ten}</Chu><Chu co={13} mau={M.chu3}>{v.nhan ?? LAP[v.lapLai] ?? ""}</Chu></View>
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
