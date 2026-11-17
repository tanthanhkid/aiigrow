// «<Con> đang xin phép» (thiết kế chốt 15/11 — bm-con-xin/01 them-a4nqjrmp): mọi lời xin đang chờ của một Con, mỗi lời xin một thẻ (lib/hom-nay-xin).
// App / web chưa có trong danh sách: «YouTube chưa có trong danh sách» · Thêm · Tính phút (trừ sao, 1 sao = 1 phút) / Thêm · Không tính phút / Bỏ qua.
// Xin vay sao: «Xin Ba Mẹ cho vay 20 sao · Laptop · hết sao, muốn chơi tiếp», viên «−20 sao · Đang nợ Ba Mẹ 20 sao», Không cho / Cho vay 20 sao.
// «Đã trả lời hôm nay»: lời xin app / web Ba Mẹ đã bỏ qua hôm nay (GET con/:id/hom-nay › biChan «chua_cho»).
// Cuối màn: chế độ của con («Theo danh sách — Chỉ mở app, web Ba Mẹ đã thêm · Đổi ›» → App & web) + ô lõm «Được mở N app».
// Mở từ Hôm nay / Báo cáo / Thông báo (?con=).
// #325 (bàn them-a4nqjrmp@v13): thẻ lời xin kiểu «dangXin» (ô icon · tiêu đề · «Laptop · con đang chờ» · giờ bên phải, ô lõm lời con / «… chưa có trong
// danh sách được mở», «Tính phút» nút lớn 2 dòng · «Không tính phút» ngọc nhạt · «Bỏ qua»); «Đã trả lời hôm nay» cột giờ; bỏ nút đáy «Xong, về Hôm nay»
// (bàn chỉ có nút lui). Chữ / logic theo issue: lời xin vay sao (#263/#265) và «Theo danh sách» (#262) — bàn còn «Thêm 20 phút chơi», «Chặn app & web».
import { cheDoTu } from "@/lib/app-web";
import { router, useLocalSearchParams } from "expo-router";
import { bm } from "@/lib/api";
import { soAppDuocMo, TieuMuc, type ChoDuyetMoi, type ConCt, type LuatDem, type QuyCon } from "@/lib/hang-ngay";
import { laAppWeb, tenMayXin, TheXin } from "@/lib/hom-nay-xin";
import { saoTu } from "@/lib/so-sao";
import { BONG } from "@/lib/clay";
import { OLomIcon } from "@/lib/ui-viec";
import { BaoLoi, CanhGiua, ChoTai, Chu, gioPhut, M, Man, The, useLam, useTai } from "@/lib/ui";
import { Pressable, View } from "react-native";
import type { HomNayDung } from "../da-dung/[con]";


export default function DangXin() {
  const { con } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const cd = await bm.goi<ChoDuyetMoi>("cho-duyet");
    const id = con ?? cd.yeuCau[0]?.child_id;
    const [ct, qy, hn, luat] = id ? await Promise.all([bm.goi<ConCt>(`con/${id}`), bm.goi<QuyCon>(`con/${id}/quy`).catch(() => null),
      bm.goi<HomNayDung>(`con/${id}/hom-nay`).catch(() => null), bm.goi<{ ds: LuatDem[] }>("luat").catch(() => null)]) : [null, null, null, null];
    const soApp = id && luat ? soAppDuocMo(luat.ds, id) : null;
    return { id, ds: cd.yeuCau.filter((y) => !id || y.child_id === id), ct, qy, daTraLoi: (hn?.biChan ?? []).filter((x) => x.ly === "chua_cho"), soApp };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Hôm nay" }} tieu="Con đang xin"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const ten = d.ct?.ten ?? "Con";
  const sao = saoTu(d.qy?.soSao ?? (d.ct ? { soDu: d.ct.soDu, ...(typeof d.ct.sao === "number" ? { sao: d.ct.sao } : {}) } : null));
  const moHet = cheDoTu(d.ct) === "mo_het";
  return (
    <Man lui={{ chu: "Hôm nay" }} tieuLon={d.ds.length ? `${ten} đang xin phép` : `${ten} không xin gì`} tai={tai} vongTai>
      {!d.ds.length ? <CanhGiua lv="canh-trong" tieu="Không có lời xin nào" loi={`Khi ${ten} xin vay sao hay xin thêm app, web vào danh sách, Grow báo Ba Mẹ ngay.`} /> : null}
      <BaoLoi loi={loiLam} />
      {d.ds.map((y) => (
        <The key={y.id} style={{ paddingVertical: 2 }}>
          <TheXin y={y} may={tenMayXin(y, d.ct?.may)} lam={(fn) => lam(fn)} dang={dangChay} sao={sao} dangXin
            truc={laAppWeb(y)} phu={laAppWeb(y) ? `${y.gia_tri} chưa có trong danh sách được mở` : undefined} />
        </The>
      ))}

      {d.daTraLoi.length ? (
        <>
          <TieuMuc chu="Đã trả lời hôm nay" />
          <The style={{ paddingVertical: 4, paddingHorizontal: 12 }}>
            {d.daTraLoi.map((x, k) => (
              <View key={`${x.ten}:${k}`} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 62, borderTopWidth: k ? 1.5 : 0, borderTopColor: "#ecebe7" }}>
                <Chu kieu="rat" co={13} mau="#565c59" so style={{ width: 42 }}>{gioPhut(x.luc)}</Chu>
                <OLomIcon ic="khoa" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Chu kieu="rat" co={15} dong={1}>{x.ten}</Chu>
                  <Chu kieu="dam" co={12.5} mau="#565c59" dong={1}>{`${x.may ? `${x.may.replace(/ của .*$/, "")} · ` : ""}xin lại được`}</Chu>
                </View>
                <Chu kieu="rat" co={12.5} mau="#565c59">Đã bỏ qua</Chu>
              </View>
            ))}
          </The>
        </>
      ) : null}

      {d.ct && d.id ? (
        // bàn .chan: dòng chế độ (ô icon ngọc nhạt · tên · câu · «Đổi ›») + ô lõm «Được mở N app»
        <The style={{ paddingTop: 4, paddingBottom: 8, paddingHorizontal: 12 }}>
          <Pressable onPress={() => router.push(`/app-web?con=${d.id}` as never)} accessibilityRole="button"
            style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64 }}>
            <OLomIcon ic={moHet ? "mo_khoa" : "khien"} co={44} nen="#dcebe6" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={15}>{moHet ? "Mở hết" : "Theo danh sách"}</Chu>
              <Chu kieu="dam" co={12.5} mau={M.chu2}>{moHet ? "Con mở mọi app, web · không tính phút" : "Chỉ mở app, web Ba Mẹ đã thêm"}</Chu>
            </View>
            <Chu kieu="rat" co={14} mau={M.chinhInk}>Đổi ›</Chu>
          </Pressable>
          {!moHet && d.soApp !== null ? (
            <Pressable onPress={() => router.push(`/app-web?con=${d.id}` as never)} accessibilityRole="button"
              style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, backgroundColor: "#ecebe7", boxShadow: BONG.lom }}>
              <Chu kieu="rat" co={13} mau={M.chu2}>{`Được mở ${d.soApp} app`}</Chu>
            </Pressable>
          ) : null}
        </The>
      ) : null}
    </Man>
  );
}
