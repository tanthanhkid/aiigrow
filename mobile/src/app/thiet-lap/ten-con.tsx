// bm1-ob-ten-con (bước 1/4, thiết kế chốt 04/11): thẻ hồ sơ (chữ cái + màu + «9 tuổi · khoảng lớp 4»), tên gọi ở nhà, năm sinh, màu của con.
// «Lưu hồ sơ X» ⇒ POST thiet-lap {con} (tạo Con; gửi lại có con.id ⇒ sửa, không tạo trùng) ⇒ Giao việc. «Thêm con khác» (them-4sujddkb):
// lưu Con này rồi điền Con tiếp theo; màn Con thứ hai có «Xong, giao việc cho <Con đầu> trước». Bỏ PIN (L5), bỏ chọn nhóm Nhí/Teen (máy chủ tự tính theo tuổi).
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm } from "@/lib/api";
import { BONG, KHOI, MEN } from "@/lib/clay";
import { cauTuoi, DauMan, LienKet, MAU_HO_SO, OLom, ThanhBuoc } from "@/lib/lan-dau";
import { datTl, layTl } from "@/lib/thiet-lap";
import { BaoLoi, Chu, Icon, LopMen, M, Man, Nut, Rob, useLam } from "@/lib/ui";

type KqThietLap = { conId: string; ten: string };

export default function ObCon() {
  const tl0 = layTl();
  // Mở lại màn (Quay lại từ bước sau) ⇒ điền lại Con đang thiết lập; vào từ «Thêm Con» ở Trang chủ ⇒ form trống (daLuu rỗng, không có conId)
  const sua = !!tl0.conId && !!tl0.daLuu?.some((c) => c.id === tl0.conId);
  const [ten, setTen] = useState(sua ? tl0.tenCon ?? "" : "");
  const [nam, setNam] = useState(sua && tl0.namSinh ? String(tl0.namSinh) : "");
  const [mau, setMau] = useState(sua ? tl0.mau ?? 0 : (tl0.daLuu?.length ?? 0) % MAU_HO_SO.length);
  const [conId, setConId] = useState<string | undefined>(sua ? tl0.conId : undefined);
  const daLuu = (tl0.daLuu ?? []).filter((c) => c.id !== conId);
  const { lam, loi, dangChay, setLoi } = useLam();
  const namSo = /^\d{4}$/.test(nam) ? Number(nam) : null;
  const tuoi = cauTuoi(namSo);
  const tenGon = ten.trim();
  const luu = async () => {
    const r = await bm.goi<KqThietLap>("thiet-lap", { con: { ...(conId ? { id: conId } : {}), ten: tenGon, namSinh: namSo, avatar: `mau-${mau}` } });
    const ds = [...(layTl().daLuu ?? []).filter((c) => c.id !== r.conId), { id: r.conId, ten: r.ten, mau, namSinh: namSo }];
    return { r, ds };
  };
  const tiep = () => lam(async () => {
    const { r, ds } = await luu();
    datTl({ conId: r.conId, tenCon: r.ten, namSinh: namSo, mau, daLuu: ds, nhom: namSo && new Date().getFullYear() - namSo >= 11 ? "teen" : "nhi",
      apps: undefined, cheDoChan: undefined, quy: undefined, ngu: undefined });
    router.push("/thiet-lap/mau");
  });
  const themCon = () => lam(async () => {
    const { ds } = await luu();
    datTl({ daLuu: ds, conId: undefined });
    setTen(""); setNam(""); setConId(undefined); setMau(ds.length % MAU_HO_SO.length);
  });
  const conDau = daLuu[0];
  const [dam, nhat] = MAU_HO_SO[mau];
  return (
    <Man dau={<DauMan ve="/" phai={<ThanhBuoc dang={0} />} />}
      day={<><BaoLoi loi={loi} /><Nut chu={`Lưu hồ sơ ${tenGon || "của con"}`} rong dangChay={dangChay} tat={!tenGon || (nam !== "" && !namSo)} bam={tiep} />
        {conDau ? <LienKet chu={`Xong, giao việc cho ${conDau.ten} trước`} bam={() => lam(async () => {
          if (tenGon) { const { ds } = await luu(); datTl({ daLuu: ds }); }        // Con đang điền dở vẫn được lưu, không mất lặng lẽ
          datTl({ conId: conDau.id, tenCon: conDau.ten, mau: conDau.mau, namSinh: conDau.namSinh, apps: undefined, cheDoChan: undefined, quy: undefined, ngu: undefined });
          router.push("/thiet-lap/mau");
        })} />
          : <LienKet chu="+ Thêm con khác" bam={() => (tenGon ? themCon() : setLoi("Nhập tên con này trước, rồi thêm con khác."))} />}</>}>
      <View style={{ minHeight: 170, borderRadius: 30, backgroundColor: nhat, padding: 18, flexDirection: "row", alignItems: "center", ...KHOI.the }}>
        <LopMen men={MEN.vien} bo={30} />
        {/* cột trái ≤ 44%: tên dài xuống dòng trước khi chạm Rob bên phải (cổng DE-ANH) */}
        <View style={{ gap: 10, alignItems: "flex-start", maxWidth: "44%" }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: dam, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#fff", boxShadow: BONG.nho }}>
            <Chu kieu="rat" co={38} mau={M.chu}>{(tenGon.split(/\s+/).pop() ?? "").charAt(0).toUpperCase() || "?"}</Chu>
          </View>
          <Chu kieu="rat" co={22}>{tenGon || "Con nhà mình"}</Chu>
          {tuoi ? <View style={{ backgroundColor: dam, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 }}><Chu kieu="rat" co={12} mau={M.chu}>{tuoi}</Chu></View> : null}
        </View>
        <View pointerEvents="none" style={{ position: "absolute", right: 6, bottom: 0, top: 6, width: "48%", alignItems: "flex-end", justifyContent: "flex-end" }}><Rob ten="chi" co={150} /></View>
      </View>
      <OLom nhan="Tên gọi ở nhà" value={ten} onChangeText={setTen} placeholder="Bảo Anh" maxLength={30} autoComplete="off" />
      <OLom nhan="Năm sinh" value={nam} onChangeText={(t) => setNam(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="2017" />
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Màu của con</Chu>
        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 4 }} accessibilityRole="radiogroup">
          {MAU_HO_SO.map(([m], i) => (
            <Pressable key={m} onPress={() => setMau(i)} accessibilityRole="radio" accessibilityState={{ checked: i === mau }} accessibilityLabel={`Màu ${i + 1}`}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...(i === mau ? { boxShadow: `0px 0px 0px 3px ${M.chu}` } : {}) }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: m, boxShadow: BONG.nho, alignItems: "center", justifyContent: "center" }}>
                {i === mau ? <Icon ten="tick" mau="#fff" co={16} /> : null}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Man>
  );
}
