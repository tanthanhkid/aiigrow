// Đăng nhập / tạo tài khoản bằng Google, Facebook (thiết kế chốt 04–05/11, màn Chào / Đăng ký / Đăng nhập) — expo-auth-session.
//   · Google: lấy id_token (web: popup; iOS / Android: trình duyệt hệ thống, redirect `vn.aiilab.aiigrow:/oauthredirect`) ⇒ POST dang-nhap/google.
//   · Facebook: lấy access token (redirect native `fb<APP_ID>://authorize`) ⇒ POST dang-nhap/facebook.
// Client id là giá trị CÔNG KHAI, gắn lúc dựng app bằng EXPO_PUBLIC_* (docs/OAUTH.md). Nút chỉ hiện khi app có client id cho nền tảng đang chạy
// VÀ máy chủ báo bật (GET cau-hinh-dang-nhap — thiếu env phía máy chủ thì ẩn, không để Ba Mẹ bấm vào lỗi 503).
// Sau khi vào: giống đăng nhập / đăng ký thường — có lời mời chờ cho email này (hoặc đang ở nhánh «Tôi được mời») ⇒ màn Lời mời.
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import type { AuthSessionResult } from "expo-auth-session";
import { bm } from "./api";
import { usePhien } from "./phien";
import { DieuKhoan, NutMxh, NutSdt, TieuDe } from "./lan-dau";

// Bản web: trang /oauthredirect mở trong popup phải báo kết quả về cửa sổ app rồi tự đóng (gọi càng sớm càng tốt — cả ở _layout).
WebBrowser.maybeCompleteAuthSession();

const GOOGLE = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
};
const FB_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || undefined;
const googleMayNay = Platform.OS === "ios" ? GOOGLE.ios : Platform.OS === "android" ? GOOGLE.android : GOOGLE.web;
/** Web: redirect về đúng nguồn đang chạy (prod https://aiigrow.aiilab.vn/oauthredirect) — native để thư viện tự chọn scheme. */
const veWeb = () => (Platform.OS === "web" ? `${globalThis.location?.origin ?? ""}/oauthredirect` : undefined);

type CauHinh = { google: boolean; facebook: boolean };
let nhoCauHinh: Promise<CauHinh> | null = null;
/** Nút nào hiện được: máy chủ bật + app có client id. Lỗi mạng ⇒ coi như tắt (vẫn còn đăng nhập bằng SĐT), lần mở màn sau hỏi lại. */
export function useCoMxh(): CauHinh {
  const [ch, setCh] = useState<CauHinh>({ google: false, facebook: false });
  useEffect(() => {
    if (!googleMayNay && !FB_APP_ID) return;
    nhoCauHinh ??= bm.goi<CauHinh>("cau-hinh-dang-nhap").catch(() => { nhoCauHinh = null; return { google: false, facebook: false }; });
    let song = true;
    nhoCauHinh.then((r) => song && setCh({ google: !!r.google && !!googleMayNay, facebook: !!r.facebook && !!FB_APP_ID }));
    return () => { song = false; };
  }, []);
  return ch;
}

/** Ngữ cảnh rẽ nhánh sau khi vào: `moi` = token link mời (…/moi?ma=), `duocMoi` = nhánh «Tôi được mời vào nhà» không có link. */
export type NgaCanh = { moi?: string; duocMoi?: boolean };
type KetQua = { token: string; moi?: boolean; loiMoi?: unknown[] };

function useVaoSau(nc: NgaCanh) {
  const { vao } = usePhien();
  return async (r: KetQua) => {
    const denMoi = nc.moi && nc.moi !== "1" ? `/moi/vao?ma=${encodeURIComponent(nc.moi)}` : "/moi/vao";
    // tài khoản mới: như đăng ký (otp.tsx) — có lời mời / có link mời / nhánh được mời ⇒ màn Lời mời, không thì Lần đầu (tên Con)
    if (r.moi) { await vao(r.token, true, r.loiMoi?.length || nc.moi || nc.duocMoi ? denMoi : "/thiet-lap/ten-con"); return; }
    // tài khoản cũ: như đăng nhập (dang-nhap.tsx) — rẽ sang Lời mời chỉ khi nhà còn trống (moi/nhan đòi tài khoản trống)
    if (!r.loiMoi?.length && !nc.moi && !nc.duocMoi) { await vao(r.token); return; }
    await bm.dat(r.token);
    const g = await bm.goi<{ con: unknown[] }>("gia-dinh").catch(() => ({ con: [1] }));
    await vao(r.token, false, g.con.length ? "/" : denMoi);
  };
}

const LOI_HUY = "Chưa đăng nhập được — thử lại, hoặc dùng số điện thoại nhé.";

/** Một nút Google / Facebook đã nối OAuth. Chỉ dựng khi `useCoMxh()` báo bật (hook của thư viện ném lỗi khi thiếu client id). */
export function NutMxhThat({ loai, to, bao, nc = {} }: { loai: "google" | "facebook"; to?: boolean; bao: (chu: string) => void; nc?: NgaCanh }) {
  return loai === "google" ? <NutGoogle to={to} bao={bao} nc={nc} /> : <NutFacebook to={to} bao={bao} nc={nc} />;
}

function useXuLy(loai: "google" | "facebook", bao: (chu: string) => void, nc: NgaCanh) {
  const vaoSau = useVaoSau(nc);
  const [dang, setDang] = useState(false);
  const xuLy = async (kq: AuthSessionResult) => {
    if (kq.type === "cancel" || kq.type === "dismiss") return;                 // Ba Mẹ tự đóng cửa sổ — không báo lỗi
    if (kq.type !== "success") { bao(LOI_HUY); return; }
    const body = loai === "google"
      ? { idToken: kq.params.id_token ?? kq.authentication?.idToken }
      : { accessToken: kq.params.access_token ?? kq.authentication?.accessToken };
    if (!Object.values(body)[0]) { bao(LOI_HUY); return; }
    setDang(true);
    try { await vaoSau(await bm.goi<KetQua>(`dang-nhap/${loai}`, body)); }
    catch (e) { bao(e instanceof Error && e.message ? e.message : LOI_HUY); }
    finally { setDang(false); }
  };
  return { dang, xuLy };
}

function NutGoogle({ to, bao, nc }: { to?: boolean; bao: (chu: string) => void; nc: NgaCanh }) {
  const [req, , moCua] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE.web, iosClientId: GOOGLE.ios, androidClientId: GOOGLE.android, selectAccount: true, redirectUri: veWeb(),
  });
  const { dang, xuLy } = useXuLy("google", bao, nc);
  return <NutMxh loai="google" to={to} bam={() => { if (req && !dang) moCua().then(xuLy, () => bao(LOI_HUY)); }} />;
}

function NutFacebook({ to, bao, nc }: { to?: boolean; bao: (chu: string) => void; nc: NgaCanh }) {
  const [req, , moCua] = Facebook.useAuthRequest({ clientId: FB_APP_ID, scopes: ["public_profile", "email"], redirectUri: veWeb() });
  const { dang, xuLy } = useXuLy("facebook", bao, nc);
  return <NutMxh loai="facebook" to={to} bam={() => { if (req && !dang) moCua().then(xuLy, () => bao(LOI_HUY)); }} />;
}

/** Phần dưới màn «Tạo tài khoản» / «Vào nhà cùng …» (bm1-chao + nhánh được mời): tiêu đề, một câu, Google (to), Facebook + Số điện thoại,
 *  điều khoản. Nút MXH nào chưa bật thì ẩn — Số điện thoại giãn ra chiếm chỗ. */
export function ChonCachTaoTk({ tieu, loi, sdt, bao, nc }: { tieu: string; loi: string; sdt: () => void; bao: (chu: string) => void; nc?: NgaCanh }) {
  const co = useCoMxh();
  return (
    <View style={{ gap: 14 }}>
      <TieuDe chu={tieu} phu={loi} giua />
      {co.google ? <NutMxhThat loai="google" to bao={bao} nc={nc} /> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {co.facebook ? <NutMxhThat loai="facebook" bao={bao} nc={nc} /> : null}
        <NutSdt bam={sdt} />
      </View>
      <DieuKhoan />
    </View>
  );
}
