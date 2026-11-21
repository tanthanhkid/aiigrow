// bm1-ob-ten-con (bước 1/5, thiết kế chốt 04/11 + PIN 06/11 L13): thẻ hồ sơ (chữ cái + màu + «9 tuổi · khoảng lớp 4»), tên gọi ở nhà, năm sinh, màu của con.
// «Lưu hồ sơ X» ⇒ POST thiet-lap {con} (tạo Con; gửi lại có con.id ⇒ sửa, không tạo trùng) ⇒ Giao việc. «Thêm con khác» (them-4sujddkb):
// lưu Con này rồi điền Con tiếp theo; màn Con thứ hai có «Xong, giao việc cho <Con đầu> trước». Bỏ chọn nhóm Nhí/Teen (máy chủ tự tính theo tuổi).
// PIN 06/11 (đảo L5): «Mã PIN vào máy · 4 số» ⇒ POST con/:id/pin sau khi lưu hồ sơ. #306: PIN 4 số BẮT BUỘC khi lưu một Con (cả 3 nút: Lưu hồ sơ · + Thêm con khác · Xong, giao việc…).
// Nút đáy (#306): «+ Thêm con khác» trên cùng; dưới nó MỘT nút nổi — chưa có con nào khác ⇒ «Lưu hồ sơ <Tên>»; đã thêm con khác ⇒ «Xong, giao việc cho <Con đầu> trước».
// Thiết kế chốt 14/11 (bm1-ob-ten-con «Sửa tay», them-hjjdppuw, them-4sujddkb): thẻ hồ sơ «Bảo Anh · 🐓 9 tuổi» (con giáp theo năm sinh — N11),
// ô năm sinh là nút mở bảng «Năm sinh» (bánh xe năm, «Chọn 2017»); PIN một ô (thiết kế bỏ «Nhập lại PIN» — PIN hiện số khi gõ nên không cần gõ lại).
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { ChonMauCon, namCua, ONamSinh, TheHoSoCon, ThePinCon, useAnhForm } from "@/lib/form-ho-so";
import { CHUA_LUU_ANH, coAnh, dongBoAnhCon, useAnhCon } from "@/lib/anh-con";
import { DauMan, LienKet, MAU_HO_SO, OLom } from "@/lib/lan-dau";
import { kiemPin } from "@/lib/s3";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl } from "@/lib/thiet-lap";
import { BaoLoi, baoKhiVe, Chu, Man, Nut, useLam } from "@/lib/ui";

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
  // mở lại màn cho Con ĐÃ lưu (sua): máy chủ báo Con đã có PIN ⇒ không bắt gõ lại, ô trống = giữ PIN cũ (không POST PIN)
  const [daCoPin, setDaCoPin] = useState(false);
  useEffect(() => {
    if (!sua || !tl0.conId) return;
    let huy = false;
    bm.goi<{ coPin?: boolean }>(`con/${tl0.conId}`).then((c) => { if (!huy) setDaCoPin(!!c?.coPin); }).catch(() => {});
    return () => { huy = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const af = useAnhForm();
  // mở lại màn (sua) ⇒ hiện ảnh đã lưu ở máy chủ + «Bỏ ảnh» (gỡ khi lưu)
  const [avatarLuu, setAvatarLuu] = useState<string | undefined>(sua ? tl0.daLuu?.find((c) => c.id === tl0.conId)?.avatar : undefined);
  const [boAnhLuu, setBoAnhLuu] = useState(false);
  const anhMay = useAnhCon(conId && !boAnhLuu ? { id: conId, avatar: avatarLuu } : null);
  const coAnhLuu = !!conId && !boAnhLuu && coAnh(avatarLuu);
  const daLuu = (tl0.daLuu ?? []).filter((c) => c.id !== conId);
  const { lam, loi, dangChay, setLoi } = useLam();
  const namSo = namCua(nam);
  const tenGon = ten.trim();
  const loiPin = kiemPin(pin, null, namSo);
  const pinDu = /^\d{4}$/.test(pin);
  const thieuPin = daCoPin ? pin !== "" && !pinDu : !pinDu;        // #306: PIN 4 số bắt buộc với Con chưa có PIN; Con đã có PIN: trống = giữ, gõ thì phải đủ 4 số
  const CAU_PIN = "Đặt mã PIN 4 số cho con trước.";
  const luu = async () => {
    if (thieuPin) throw new Error(CAU_PIN);        // #306: chốt chặn chung cho cả 3 nút
    // 15/11: Con mới tạo với 0 sao — sao khởi đầu Ba Mẹ chọn ở bước «Chơi bằng sao» (thiet-lap/gio), gửi kèm lần lưu cuối
    const r = await bm.goi<KqThietLap>("thiet-lap", { con: { ...(conId ? { id: conId } : {}), ten: tenGon, namSinh: namSo, avatar: `mau-${mau}` }, ...(conId ? {} : { saoKhoiDau: 0 }) });
    // nhớ Con vừa tạo TRƯỚC khi đặt PIN: lời đặt PIN lỗi ⇒ bấm lại chỉ sửa Con này (gửi con.id), không tạo Con thứ hai
    setConId(r.conId);
    if (pin) await bm.goi(`con/${r.conId}/pin`, { pin });        // trống (Con đã có PIN) ⇒ không đụng PIN cũ
    // ảnh lỗi KHÔNG làm hỏng việc lưu hồ sơ: báo «Chưa lưu được ảnh» rồi đi tiếp
    const anhKq = await dongBoAnhCon(r.conId, af.anh, boAnhLuu && !af.anh && coAnh(avatarLuu));
    if (!anhKq.ok) baoKhiVe(CHUA_LUU_ANH);
    const avatar = anhKq.avatar ?? (anhKq.ok ? `mau-${mau}${coAnh(avatarLuu) && !boAnhLuu ? avatarLuu!.slice(avatarLuu!.indexOf("|")) : ""}` : avatarLuu);
    if (anhKq.avatar) setAvatarLuu(anhKq.avatar);
    const ds = [...(layTl().daLuu ?? []).filter((c) => c.id !== r.conId), { id: r.conId, ten: r.ten, mau, namSinh: namSo, avatar }];
    return { r, ds, anhLoi: !anhKq.ok };
  };
  const tiep = () => lam(async () => {
    const { r, ds } = await luu();
    // #508: sửa hồ sơ Con ĐANG thiết lập (cùng id) ⇒ giữ mọi lựa chọn các bước sau (việc, quà, giờ, app, web); chỉ Con khác mới bắt đầu sạch
    const cungCon = !!conId && conId === layTl().conId;
    datTl({ conId: r.conId, tenCon: r.ten, namSinh: namSo, mau, daLuu: ds, nhom: namSo && new Date().getFullYear() - namSo >= 11 ? "teen" : "nhi",
      ...(cungCon ? {} : { apps: undefined, webs: undefined, cheDoChan: undefined, saoKhoiDau: undefined, gioiHan: undefined, viec: undefined, viecRieng: undefined }) });
    router.push({ pathname: "/thiet-lap/ghep", params: { con: r.conId, nguon: "lan-dau", sau: "mau" } });
  });
  const themCon = () => lam(async () => {
    const { ds } = await luu();
    datTl({ daLuu: ds, conId: undefined, tenCon: undefined, namSinh: undefined, mau: undefined, gioiHan: undefined });
    setDaCoPin(false); setTen(""); setNam(""); setConId(undefined); setPin(""); af.bo(); setAvatarLuu(undefined); setBoAnhLuu(false); setMau(ds.length % MAU_HO_SO.length);
  });
  const conDau = daLuu[0];
  return (
    <Man dau={<DauMan ve="/" phai={<ThanhBuoc5 dang={0} />} />}
      day={<><BaoLoi loi={loi} />
        {/* #306: «+ Thêm con khác» lên trên; nút nổi ngay dưới — «Lưu hồ sơ X» (chưa thêm con nào khác) hoặc «Xong, giao việc cho <Con đầu> trước» (đã thêm) */}
        <LienKet chu="+ Thêm con khác" bam={() => (!tenGon ? setLoi("Nhập tên con này trước, rồi thêm con khác.") : thieuPin ? setLoi(loiPin ?? CAU_PIN) : loiPin ? setLoi(loiPin) : themCon())} />
        {conDau ? (
          <Nut chu={`Xong, giao việc cho ${conDau.ten} trước`} rong dangChay={dangChay} tat={!!tenGon && (thieuPin || !!loiPin || (nam !== "" && !namSo))} bam={() => lam(async () => {
            if (tenGon) { if (thieuPin) throw new Error(CAU_PIN); if (loiPin) throw new Error(loiPin); const { ds } = await luu(); datTl({ daLuu: ds }); }        // Con đang điền dở vẫn được lưu, không mất lặng lẽ
            datTl({ conId: conDau.id, tenCon: conDau.ten, mau: conDau.mau, namSinh: conDau.namSinh,
              ...(conDau.id === layTl().conId ? {} : { apps: undefined, webs: undefined, cheDoChan: undefined, saoKhoiDau: undefined, gioiHan: undefined, viec: undefined, viecRieng: undefined }) });
            router.push({ pathname: "/thiet-lap/ghep", params: { con: conDau.id, nguon: "lan-dau", sau: "mau" } });
          })} />
        ) : (
          <Nut chu={`Lưu hồ sơ ${tenGon || "của con"}`} rong dangChay={dangChay} tat={!tenGon || (nam !== "" && !namSo) || thieuPin || !!loiPin} bam={tiep} />
        )}</>}>
      <TheHoSoCon ten={ten} nam={nam} mau={mau} anh={af.uri ?? anhMay} f={af} coAnh={coAnhLuu} boDaLuu={() => setBoAnhLuu(true)} />
      <OLom nhan="Tên gọi ở nhà" value={ten} onChangeText={setTen} placeholder="Bảo Anh" maxLength={30} autoComplete="off" />
      <ONamSinh nam={nam} doi={setNam} />
      <ChonMauCon mau={mau} doi={setMau} />
      {/* PIN vào máy (06/11): bé chạm tên + PIN để vào máy dùng chung — không mắng lúc đang gõ (ThePinCon chỉ báo khi đủ 4 số) */}
      <ThePinCon pin={pin} doi={setPin} loi={loiPin} batBuoc={!daCoPin} cau={daCoPin ? <>Con đã có PIN — để trống nếu giữ nguyên, gõ 4 số mới để đổi</> : <><Chu kieu="rat" co={13}>Bé dùng PIN này để vào máy</Chu> · không dùng ngày sinh</>} />
    </Man>
  );
}
