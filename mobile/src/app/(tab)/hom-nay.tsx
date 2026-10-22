// bm-trang «Hôm nay» (FR-06.01): theo từng Con — 3 điều tích cực để khen, hộp Chờ duyệt nổi bật, ví điểm, giải trí hôm nay/trần,
// thiết bị + mức bảo vệ, cảnh báo cần xem. Ba Mẹ nắm tình hình trong ≤ 30 giây.
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type CanhBao, type ConChiTiet, type GiaDinh } from "@/lib/api";
import { ChuongTb } from "@/lib/chuong-tb";
import {
  Avt, BieuTron, Canh, CanhGiua, ChoTai, Chu, Dong, Icon, Luoi2, M, MAU_CON, Man, Nhan, Nhom, Nut, OSo, Tien, truoc, useTai,
} from "@/lib/ui";

const BAO_VE = { day_du: ["Đầy đủ", "ok"], mot_phan: ["Một phần", "canh"], chua: ["Chưa bảo vệ", "loi"] } as const;
const IC_NEN = { windows: "may_tinh", mac: "laptop", ios: "tablet", android: "dt" } as const;

export default function HomNay() {
  const { d, loi, matMang, tai, dangTai } = useTai(async () => {
    const g = await bm.goi<GiaDinh>("gia-dinh");
    const cb = await bm.goi<{ ds: CanhBao[] }>("canh-bao");
    return { g, cb: cb.ds.filter((x) => !x.da_doc) };
  });
  const [chon, setChon] = useState(0);
  if (!d) return <Man tieuLon="Hôm nay" chat><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!d.g.con.length) {
    return (
      <Man chat>
        <CanhGiua lv="canh-trong" tieu="Chưa có Con nào" loi="Thêm hồ sơ Con đầu tiên để bắt đầu.">
          <Nut chu="Thêm Con" ic="cong" bam={() => router.push("/thiet-lap/ten-con")} />
        </CanhGiua>
      </Man>
    );
  }
  const c = d.g.con[Math.min(chon, d.g.con.length - 1)];
  const cho = c.nhiemVuCho + c.yeuCauCho;
  const tichCuc = c.homNayConDa.length ? c.homNayConDa.join(" · ") : "Chưa có nhiệm vụ nào được duyệt hôm nay.";
  const cbCon = d.cb.filter((x) => !x.child_id || x.child_id === c.id);
  return (
    <Man chat tai={tai} dangTai={dangTai}>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        {d.g.con.map((x, i) => (
          <Pressable key={x.id} onPress={() => setChon(i)} accessibilityRole="tab" accessibilityState={{ selected: i === chon }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 10, borderRadius: 99, borderWidth: 1.5,
              borderColor: i === chon ? M.chinh : M.vien2, backgroundColor: i === chon ? "#f1faf7" : "#fff" }}>
            <Avt ten={x.ten} mau={MAU_CON[i % MAU_CON.length]} co={32} />
            <Chu kieu="dam" co={14.5} mau={i === chon ? M.chinhInk : M.chu2}>{x.ten}</Chu>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push("/thiet-lap/ten-con")} accessibilityRole="button"
          style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1.5, borderColor: M.vien2, backgroundColor: "#fff", justifyContent: "center" }}>
          <Chu kieu="dam" co={14.5} mau={M.chu2}>+ Con</Chu>
        </Pressable>
        <View style={{ marginLeft: "auto" }}><ChuongTb /></View>
      </View>
      <Canh lv="sao" tieu={`Hôm nay ${c.ten} đã…`} loi={tichCuc}>
        <Pressable onPress={() => router.push(`/loi-khen/${c.id}`)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
          <Nhan chu="Gửi lời khen" ic="tim" />
        </Pressable>
      </Canh>
      <Pressable onPress={() => router.push("/cho-duyet")} accessibilityRole="button"
        style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: cho ? "#f3c8bf" : M.vien, backgroundColor: cho ? "#fff8f6" : "#fff" }}>
        <BieuTron ic="chuong" mau={cho ? "do" : "xanh"} />
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={18}>{cho ? `${cho} việc chờ Ba Mẹ` : "Không có việc nào chờ"}</Chu>
          <Chu co={13.5} mau={M.chu3}>{cho ? `${c.nhiemVuCho} nhiệm vụ · ${c.yeuCauCho} yêu cầu` : "Khi Con nộp hay xin phép, Rob báo Ba Mẹ ngay"}</Chu>
        </View>
        <Icon ten="phai" mau={M.chu3} />
      </Pressable>
      <Luoi2>
        <OSo nho="Ví điểm" so={c.soDu} don=" điểm" phu={`Cấp ${c.capDo.cap} · chờ duyệt ${c.diemChoDuyet}`} bam={() => router.push(`/vi/${c.id}`)} />
        <OSo nho="Giải trí hôm nay" so={c.phutChoi} don={`/${c.tranNgay} phút`}>
          <View style={{ marginTop: 6 }}><Tien ti={c.tranNgay ? c.phutChoi / c.tranNgay : 0} mau={M.diem} /></View>
        </OSo>
      </Luoi2>
      <MayVaCanhBao key={c.id} con={c.id} canhBao={cbCon} />
    </Man>
  );
}

function MayVaCanhBao({ con, canhBao }: { con: string; canhBao: CanhBao[] }) {
  const ct = useTai(() => bm.goi<ConChiTiet>(`con/${con}`));
  const c = { id: con };
  const cbCon = canhBao;
  return (
      <Nhom>
        {(ct.d?.may ?? []).map((m, i) => (
          <Dong key={m.id} dau={i === 0} tieu={m.ten} phu={`${m.truc ? "Online" : "Offline"} · đồng bộ ${truoc(m.lanCuoi) || "chưa lần nào"}`}
            trai={<BieuTron ic={IC_NEN[m.nen]} mau={m.baoVe === "day_du" ? "xanh" : "cam"} />}
            phai={<Nhan chu={BAO_VE[m.baoVe][0]} loai={BAO_VE[m.baoVe][1]} cham />} bam={() => router.push(`/ho-so/${c.id}`)} />
        ))}
        {ct.d && !ct.d.may.length ? <Dong dau tieu="Chưa ghép máy nào" phu="Ghép bằng mã 6 số, chưa tới 2 phút" trai={<BieuTron ic="qr" />} bam={() => router.push(`/ho-so/${c.id}`)} /> : null}
        {cbCon.length ? (
          <Dong tieu={`${cbCon.length} cảnh báo cần xem`} phu={cbCon[0].noi_dung} trai={<BieuTron ic="canh_bao" mau="cam" />} bam={() => router.push("/canh-bao")} />
        ) : null}
      </Nhom>
  );
}
