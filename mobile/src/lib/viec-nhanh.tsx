// Việc nhanh cho Ba Mẹ (QA 24/10, issue #70 §2): thẻ máy (Đang chặn / Chỉ theo dõi + đổi + mở khẩn cấp + mã mất mạng + sửa bảo vệ),
// thẻ «Đang chơi» (Dừng), app mới chưa xếp loại (3 nút Học tập · Giải trí · Chặn). Dùng ở Trang chủ; app mới còn ở Chờ duyệt.
// Mọi con số đọc từ máy chủ — mức bảo vệ lấy từ `baoVe` của máy chủ, không tự tính lại ở app.
import { router } from "expo-router";
import { View } from "react-native";
import { bm, TEN_CHE_DO, type AppChuaXep, type CheDoMay, type PhienDang, type TuanThuMay } from "./api";
import { datTl } from "./thiet-lap";
import { BaoLoi, BieuTron, cauLoi, Chu, HaiNut, M, Nhan, Nut, The, truoc, useLam, type TenIcon } from "./ui";

/** Icon theo nền tảng máy — dùng chung Trang chủ, Hồ sơ Con, danh sách máy. */
export const IC_NEN: Record<TuanThuMay["nen"], TenIcon> = { windows: "may_tinh", mac: "laptop", ios: "tablet", android: "dt" };
type Bao = (chu: string, hoan?: () => void) => void;
/** Hoàn tác hỏng (mất mạng, 403…) phải nói ra — không để Ba Mẹ tưởng đã hoàn tác. */
const baoLoiHoan = (bao: Bao, e: unknown) => bao(`Chưa hoàn tác được: ${cauLoi(e)}`);
/** Màu icon máy — MỘT quy tắc cho Trang chủ và danh sách máy: ngoài vòng ⇒ đỏ; lệch chuẩn hoặc bảo vệ chưa đủ ⇒ cam; còn lại xanh. */
export const mauMay = (m: TuanThuMay): "do" | "cam" | "xanh" =>
  (m.trangThai === "ngoai_vong" ? "do" : m.trangThai === "lech_chuan" || (m.baoVe && m.baoVe !== "day_du") ? "cam" : "xanh");

/** Thẻ một máy của Con ở Trang chủ. Chế độ chỉ có trên máy tính (Windows): máy khác không hiện nút đổi. */
export function TheMay({ m, tai, bao, xem }: { m: TuanThuMay; tai: () => void; bao: Bao; xem?: boolean }) {
  const { lam, loi, dangChay } = useLam();
  const win = m.nen === "windows";
  const dangGo = !!m.dangGo;
  const cho = !!(m.cheDoBaMeChon && m.cheDoMay && m.cheDoBaMeChon !== m.cheDoMay);
  // nhãn theo chế độ MÁY đang chạy (cheDoMay); lựa chọn của Ba Mẹ chưa tới máy thì hiện dòng «Đang chờ máy nhận…» bên dưới
  const cheDoThat = m.cheDoMay ?? m.cheDo;
  const doiSang: CheDoMay = m.cheDo === "chan" ? "giam-sat" : "chan";
  const chuaDu = !!m.baoVe && m.baoVe !== "day_du";            // máy chủ cũ không gửi baoVe ⇒ không báo
  const doi = () => lam(async () => {
    // Hoàn tác chỉ khi Ba Mẹ đã từng chọn: chưa chọn (máy tự báo) thì gửi lại sẽ «ghim» một lựa chọn chưa từng có
    const cu = m.cheDoBaMeChon;
    await bm.goi(`may/${m.id}/che-do`, { cheDo: doiSang });
    bao(`${m.ten}: ${doiSang === "chan" ? "Chặn thật" : "Chỉ theo dõi"} — máy nhận trong ≤ 3 phút`,
      cu ? () => { bm.goi(`may/${m.id}/che-do`, { cheDo: cu }).then(tai, (e) => { baoLoiHoan(bao, e); tai(); }); } : undefined);
    tai();
  });
  const thieu = m.baoVeThieu ?? [];
  // cùng chữ với Hồ sơ Con / màn máy: «chua» là chưa có thông tin, không phải «chưa đủ»; nhiều mục thiếu thì nói số mục
  const tieuBv = m.baoVe === "chua" ? "Chưa có thông tin bảo vệ" : "Bảo vệ chưa đủ";
  const lyDo = thieu.length > 1 ? `${thieu[0].ten} và ${thieu.length - 1} mục khác` : thieu[0]?.ten ?? m.baoVeCau;
  const dangKhan = !!m.moKhanCapDen && new Date(m.moKhanCapDen) > new Date();
  return (
    <The>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <BieuTron ic={IC_NEN[m.nen]} mau={mauMay(m)} />
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={15.5} dong={1}>{m.ten}</Chu>
          <Chu co={13} mau={M.chu3}>{`Đồng bộ ${truoc(m.lanCuoi) || "chưa lần nào"}${m.dungChung ? " · máy dùng chung" : ""}`}</Chu>
        </View>
        {win && cheDoThat ? <Nhan chu={cheDoThat === "chan" ? "Đang chặn" : "Chỉ theo dõi"} loai={cheDoThat === "chan" ? "ok" : "xam"} cham /> : null}
      </View>
      {dangGo ? <Chu co={13.5} mau={M.chu2} style={{ marginTop: 8 }}>Máy đang được gỡ AiiGrow — tạm không chặn gì.</Chu>
        : cho ? <Chu co={13.5} mau={M.chu2} style={{ marginTop: 8 }}>{`Đang chờ máy nhận ${TEN_CHE_DO[m.cheDoBaMeChon!]} (≤ 3 phút)`}</Chu> : null}
      {chuaDu ? (
        <View style={{ marginTop: 10, gap: 6 }}>
          <Chu kieu="dam" co={13.5} mau={M.canh}>{tieuBv}</Chu>
          <Chu co={13.5} mau={M.chu2}>{lyDo}</Chu>
          <HaiNut><Nut chu="Sửa" ic="khoa" nho loai="vien" bam={() => router.push(`/may/${m.id}`)} /></HaiNut>
        </View>
      ) : null}
      {xem ? null : <View style={{ marginTop: 12 }}>
        <HaiNut>
          {win && m.cheDo && !dangGo ? <Nut chu={doiSang === "chan" ? "Bật chặn thật" : "Chỉ theo dõi"} nho loai="vien" dangChay={dangChay} bam={doi} /> : null}
          {dangKhan || dangGo ? null : <Nut chu="Mở khẩn cấp" ic="mo_khoa" nho loai="vien" bam={() => router.push(`/may/${m.id}?mo=khan`)} />}
          {win ? <Nut chu="Mã khi mất mạng" nho loai="vien" bam={() => router.push(`/may/${m.id}?mo=offline`)} /> : null}
        </HaiNut>
      </View>}
      <BaoLoi loi={loi} />
    </The>
  );
}

/** «+ Thêm máy» cho Con đang xem. */
export const NutThemMay = ({ id, ten, nhom }: { id: string; ten: string; nhom: "nhi" | "teen" }) => (
  <Nut chu="Thêm máy" ic="cong" nho loai="vien" rong bam={() => { datTl({ conId: id, tenCon: ten, nhom }); router.push("/thiet-lap/may"); }} />
);

/** Thẻ «Đang chơi» của một phiên: Con, máy, app, phút còn lại, Dừng. */
export function TheDangChoi({ p, tai, bao, xem }: { p: PhienDang; tai: () => void; bao: Bao; xem?: boolean }) {
  const { lam, loi, dangChay } = useLam();
  return (
    <The>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <BieuTron ic="game" mau="vang" />
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={15.5}>{`${p.tenCon} ${p.tam ? "tạm nghỉ" : "đang chơi"} ${p.tenApp}`}</Chu>
          <Chu co={13} mau={M.chu3}>{`${p.may ? `${p.may} · ` : ""}còn ${p.conPhut} phút`}</Chu>
        </View>
        {xem ? null : <Nut chu="Dừng" nho loai="huy" dangChay={dangChay} bam={() => lam(async () => {
          await bm.goi(`phien/${p.id}/dung`, {});
          bao(`Đã dừng phiên chơi ${p.tenApp} của ${p.tenCon} — Con nghỉ giữa giờ rồi mới mở lại được`);
          tai();
        })} />}
      </View>
      <BaoLoi loi={loi} />
    </The>
  );
}

type LuatCu = { con: string; muc: string; ten: string; loai: string; nhom: string; het: string | null };
const LOAI_XEP = [["hoc", "Học tập"], ["giai_tri", "Giải trí"], ["chan", "Chặn"]] as const;

/** App mới Con vừa dùng mà chưa xếp loại: 3 nút xếp ngay (luật cả nhà, như màn Ứng dụng). */
export function AppMoi({ ds, tai, bao, toiDa = 3, xem }: { ds: AppChuaXep[]; tai: () => void; bao: Bao; toiDa?: number; xem?: boolean }) {
  const { lam, loi, dangChay } = useLam();
  if (!ds.length) return null;
  // Giải trí cần chọn nhóm (Trò chơi / Video ngắn / MXH…: giá và trần khác nhau) ⇒ mở màn Ứng dụng với app đã chọn sẵn, không đoán «khác»
  const xep = (x: AppChuaXep, loai: (typeof LOAI_XEP)[number]) => loai[0] === "giai_tri"
    ? router.push({ pathname: "/app-web", params: { xep: x.muc, ten: x.ten ?? x.muc } })
    : lam(async () => {
      const kq = await bm.goi<{ muc: string; truoc?: LuatCu | null }>("luat", { muc: x.muc, ten: x.ten ?? x.muc, loai: loai[0], nhom: "khac" });
      // Hoàn tác: có luật cũ ⇒ đặt lại đúng như cũ; chưa có ⇒ bỏ luật, app quay về «chờ xếp loại». Máy chủ cũ không gửi `truoc` ⇒ không hiện Hoàn tác.
      const hoan = kq && "truoc" in kq
        ? () => { (kq.truoc ? bm.goi("luat", kq.truoc) : bm.goi("luat/xoa", { muc: kq.muc })).then(tai, (e) => { baoLoiHoan(bao, e); tai(); }); }
        : undefined;
      bao(`Đã xếp ${x.ten ?? x.muc} vào ${loai[1]}`, hoan);
      tai();
    });
  return (
    <The>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <BieuTron ic="luoi" mau="tim" />
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={15.5}>{`${ds.length} app mới chờ xếp loại`}</Chu>
          <Chu co={13} mau={M.chu3}>Trên máy các Con · chưa xếp thì không mở được khi Chặn thật.</Chu>
        </View>
      </View>
      {ds.slice(0, toiDa).map((x) => (
        <View key={x.muc} style={{ marginTop: 12, gap: 8 }}>
          <Chu kieu="dam" co={14.5}>{x.ten ?? x.muc}<Chu co={13} mau={M.chu3}>{`  ·  ${x.phut} phút đã dùng`}</Chu></Chu>
          {xem ? null : <HaiNut>{LOAI_XEP.map((l) => <Nut key={l[0]} chu={l[1]} nho loai={l[0] === "chan" ? "huy" : "vien"} dangChay={dangChay} bam={() => xep(x, l)} />)}</HaiNut>}
        </View>
      ))}
      {ds.length > toiDa ? <View style={{ marginTop: 10 }}><Nut chu={`Xem tất cả (${ds.length})`} nho loai="ma" bam={() => router.push("/app-web")} /></View> : null}
      <BaoLoi loi={loi} />
    </The>
  );
}
