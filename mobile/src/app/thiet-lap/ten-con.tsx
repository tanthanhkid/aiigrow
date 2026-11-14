// bm1-ob-ten-con (bước 1/5, thiết kế chốt 04/11 + PIN 06/11 L13): thẻ hồ sơ (chữ cái + màu + «9 tuổi · khoảng lớp 4»), tên gọi ở nhà, năm sinh, màu của con.
// «Lưu hồ sơ X» ⇒ POST thiet-lap {con} (tạo Con; gửi lại có con.id ⇒ sửa, không tạo trùng) ⇒ Giao việc. «Thêm con khác» (them-4sujddkb):
// lưu Con này rồi điền Con tiếp theo; màn Con thứ hai có «Xong, giao việc cho <Con đầu> trước». Bỏ chọn nhóm Nhí/Teen (máy chủ tự tính theo tuổi).
// PIN 06/11 (đảo L5): «Mã PIN vào máy · 4 số» — bỏ trống = chưa đặt (máy hỏi Ba Mẹ đặt sau); có PIN ⇒ POST con/:id/pin sau khi lưu hồ sơ.
// Thiết kế chốt 14/11 (bm1-ob-ten-con «Sửa tay», them-hjjdppuw, them-4sujddkb): thẻ hồ sơ «Bảo Anh · 🐓 9 tuổi» (con giáp theo năm sinh — N11),
// ô năm sinh là nút mở bảng «Năm sinh» (bánh xe năm, «Chọn 2017»); PIN một ô (thiết kế bỏ «Nhập lại PIN» — PIN hiện số khi gõ nên không cần gõ lại).
import { useState } from "react";
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { ChonMauCon, namCua, ONamSinh, TheHoSoCon, ThePinCon } from "@/lib/form-ho-so";
import { DauMan, LienKet, MAU_HO_SO, OLom } from "@/lib/lan-dau";
import { kiemPin } from "@/lib/s3";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl } from "@/lib/thiet-lap";
import { BaoLoi, Chu, Man, Nut, useLam } from "@/lib/ui";

type KqThietLap = { conId: string; ten: string };

export default function ObCon() {
  const tl0 = layTl();
  // Mở lại màn (Quay lại từ bước sau) ⇒ điền lại Con đang thiết lập; vào từ «Thêm Con» ở Trang chủ ⇒ form trống (daLuu rỗng, không có conId)
  const sua = !!tl0.conId && !!tl0.daLuu?.some((c) => c.id === tl0.conId);
  const [ten, setTen] = useState(sua ? tl0.tenCon ?? "" : "");
  const [nam, setNam] = useState(sua && tl0.namSinh ? String(tl0.namSinh) : "");
  const [mau, setMau] = useState(sua ? tl0.mau ?? 0 : (tl0.daLuu?.length ?? 0) % MAU_HO_SO.length);
  const [conId, setConId] = useState<string | undefined>(sua ? tl0.conId : undefined);
  const [pin, setPin] = useState("");
  const daLuu = (tl0.daLuu ?? []).filter((c) => c.id !== conId);
  const { lam, loi, dangChay, setLoi } = useLam();
  const namSo = namCua(nam);
  const tenGon = ten.trim();
  const loiPin = kiemPin(pin, null, namSo);
  const luu = async () => {
    const r = await bm.goi<KqThietLap>("thiet-lap", { con: { ...(conId ? { id: conId } : {}), ten: tenGon, namSinh: namSo, avatar: `mau-${mau}` } });
    // nhớ Con vừa tạo TRƯỚC khi đặt PIN: lời đặt PIN lỗi ⇒ bấm lại chỉ sửa Con này (gửi con.id), không tạo Con thứ hai
    setConId(r.conId);
    if (pin) await bm.goi(`con/${r.conId}/pin`, { pin });
    const ds = [...(layTl().daLuu ?? []).filter((c) => c.id !== r.conId), { id: r.conId, ten: r.ten, mau, namSinh: namSo }];
    return { r, ds };
  };
  const tiep = () => lam(async () => {
    const { r, ds } = await luu();
    datTl({ conId: r.conId, tenCon: r.ten, namSinh: namSo, mau, daLuu: ds, nhom: namSo && new Date().getFullYear() - namSo >= 11 ? "teen" : "nhi",
      apps: undefined, webs: undefined, cheDoChan: undefined, quy: undefined, cuoiTuan: undefined, ngu: undefined });
    router.push("/thiet-lap/mau");
  });
  const themCon = () => lam(async () => {
    const { ds } = await luu();
    datTl({ daLuu: ds, conId: undefined });
    setTen(""); setNam(""); setConId(undefined); setPin(""); setMau(ds.length % MAU_HO_SO.length);
  });
  const conDau = daLuu[0];
  return (
    <Man dau={<DauMan ve="/" phai={<ThanhBuoc5 dang={0} />} />}
      day={<><BaoLoi loi={loi} /><Nut chu={`Lưu hồ sơ ${tenGon || "của con"}`} rong dangChay={dangChay} tat={!tenGon || (nam !== "" && !namSo) || !!loiPin} bam={tiep} />
        {conDau ? <LienKet chu={`Xong, giao việc cho ${conDau.ten} trước`} bam={() => lam(async () => {
          if (tenGon) { if (loiPin) throw new Error(loiPin); const { ds } = await luu(); datTl({ daLuu: ds }); }        // Con đang điền dở vẫn được lưu, không mất lặng lẽ
          datTl({ conId: conDau.id, tenCon: conDau.ten, mau: conDau.mau, namSinh: conDau.namSinh, apps: undefined, webs: undefined, cheDoChan: undefined, quy: undefined, cuoiTuan: undefined, ngu: undefined });
          router.push("/thiet-lap/mau");
        })} />
          : <LienKet chu="+ Thêm con khác" bam={() => (!tenGon ? setLoi("Nhập tên con này trước, rồi thêm con khác.") : loiPin ? setLoi(loiPin) : themCon())} />}</>}>
      <TheHoSoCon ten={ten} nam={nam} mau={mau} />
      <OLom nhan="Tên gọi ở nhà" value={ten} onChangeText={setTen} placeholder="Bảo Anh" maxLength={30} autoComplete="off" />
      <ONamSinh nam={nam} doi={setNam} />
      <ChonMauCon mau={mau} doi={setMau} />
      {/* PIN vào máy (06/11): bé chạm tên + PIN để vào máy dùng chung — không mắng lúc đang gõ (ThePinCon chỉ báo khi đủ 4 số) */}
      <ThePinCon pin={pin} doi={setPin} loi={loiPin} cau={<><Chu kieu="rat" co={13}>Bé dùng PIN này để vào máy</Chu> · không dùng ngày sinh</>} />
    </Man>
  );
}
