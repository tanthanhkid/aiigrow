// Đăng nhập / tạo tài khoản bằng Google, Facebook (thiết kế chốt 04–05/11, màn Chào / Đăng ký / Đăng nhập) — expo-auth-session.
//   · Google: lấy id_token (web: popup, luồng id_token; iOS / Android: trình duyệt hệ thống + đổi mã lấy token, redirect
//     `vn.aiilab.aiigrow:/oauthredirect`) ⇒ POST dang-nhap/google.
//   · Facebook: lấy access token (redirect native `fb<APP_ID>://authorize`) ⇒ POST dang-nhap/facebook.
// Client id là giá trị CÔNG KHAI, gắn lúc dựng app bằng EXPO_PUBLIC_* (docs/OAUTH.md). Nút chỉ hiện khi app có client id cho nền tảng đang chạy
// VÀ máy chủ báo bật (GET cau-hinh-dang-nhap — thiếu env phía máy chủ thì ẩn, không để Ba Mẹ bấm vào lỗi 503).
// Popup web quay về /oauthredirect: _layout gọi WebBrowser.maybeCompleteAuthSession() (một chỗ duy nhất).
// Sau khi vào: giống đăng nhập / đăng ký thường (useVaoSau — dùng chung với màn Đăng nhập).
import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import type { AuthSessionResult } from "expo-auth-session";
import { bm } from "./api";
import { usePhien } from "./phien";
import { DieuKhoan, NutMxh, NutSdt, TieuDe } from "./lan-dau";

const GOOGLE = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
};
const FB_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || undefined;
const googleMayNay = Platform.OS === "ios" ? GOOGLE.ios : Platform.OS === "android" ? GOOGLE.android : GOOGLE.web;
/** Web: redirect về đúng nguồn đang chạy (prod https://aiigrow.aiilab.vn/oauthredirect) — native để thư viện tự chọn scheme. */
const veWeb = () => (Platform.OS === "web" ? `${globalThis.location?.origin ?? ""}/oauthredirect` : undefined);

export type LoaiMxh = "google" | "facebook";
/** Thân gửi máy chủ: {idToken} (Google) hoặc {accessToken} (Facebook). */
export type TokenMxh = { idToken: string } | { accessToken: string };
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

/** Ngữ cảnh rẽ nhánh sau khi vào: `moi` = token link mời (…/moi?ma=; "1" = được mời nhưng không có link), `duocMoi` = nhánh «Tôi được mời vào nhà». */
export type NgaCanh = { moi?: string; duocMoi?: boolean };
export type KetQuaVao = { token: string; moi?: boolean; loiMoi?: unknown[] };

/** Có phiên rồi thì đi đâu — chung cho đăng nhập mật khẩu (dang-nhap.tsx) và Google / Facebook. */
export function useVaoSau(nc: NgaCanh) {
  const { vao } = usePhien();
  return async (r: KetQuaVao) => {
    const denMoi = nc.moi && nc.moi !== "1" ? `/moi/vao?ma=${encodeURIComponent(nc.moi)}` : "/moi/vao";
    // tài khoản mới: như đăng ký (otp.tsx) — có lời mời / có link mời / nhánh được mời ⇒ màn Lời mời, không thì Lần đầu (tên Con)
    if (r.moi) { await vao(r.token, true, r.loiMoi?.length || nc.moi || nc.duocMoi ? denMoi : "/thiet-lap/ten-con"); return; }
    // tài khoản cũ: rẽ sang Lời mời chỉ khi nhà còn trống (moi/nhan đòi tài khoản trống) — không thì vào Trang chủ như cũ
    if (!r.loiMoi?.length && !nc.moi && !nc.duocMoi) { await vao(r.token); return; }
    await bm.dat(r.token);
    const g = await bm.goi<{ con: unknown[] }>("gia-dinh").catch(() => ({ con: [1] }));
    await vao(r.token, false, g.con.length ? "/" : denMoi);
  };
}

const LOI_HUY = "Chưa xác minh được — thử lại, hoặc dùng số điện thoại nhé.";

/** Nút Google / Facebook đã nối OAuth: lấy token xong gọi `khiCo`. Chỉ dựng khi `useCoMxh()` báo bật (hook thư viện ném lỗi khi thiếu client id).
 *  Đọc kết quả từ `response` của hook (không từ promise của promptAsync): Google trên iOS / Android chỉ có id_token SAU bước đổi mã. */
export function NutMxhThat(p: { loai: LoaiMxh; to?: boolean; bao: (chu: string) => void; khiCo: (t: TokenMxh) => Promise<void> }) {
  return p.loai === "google" ? <NutGoogle {...p} /> : <NutFacebook {...p} />;
}

function useXuLy(loai: LoaiMxh, res: AuthSessionResult | null, bao: (chu: string) => void, khiCo: (t: TokenMxh) => Promise<void>) {
  const dang = useRef(false);          // đang gửi máy chủ ⇒ bấm lại không mở cửa sổ mới (ref: không cần vẽ lại)
  const daXuLy = useRef<AuthSessionResult | null>(null);
  useEffect(() => {
    if (!res || daXuLy.current === res) return;
    daXuLy.current = res;
    if (res.type === "cancel" || res.type === "dismiss" || res.type === "opened" || res.type === "locked") return;   // Ba Mẹ tự đóng cửa sổ — không báo lỗi
    if (res.type !== "success") { bao(LOI_HUY); return; }
    const tk = loai === "google" ? res.params.id_token || res.authentication?.idToken : res.params.access_token || res.authentication?.accessToken;
    if (!tk) { bao(LOI_HUY); return; }
    dang.current = true;
    khiCo(loai === "google" ? { idToken: tk } : { accessToken: tk })
      .catch((e) => bao(e instanceof Error && e.message ? e.message : LOI_HUY))
      .finally(() => { dang.current = false; });
  }, [res]);          // eslint-disable-line react-hooks/exhaustive-deps
  return { dang };
}

type PNut = { to?: boolean; bao: (chu: string) => void; khiCo: (t: TokenMxh) => Promise<void> };
function NutGoogle({ to, bao, khiCo }: PNut) {
  const [req, res, moCua] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE.web, iosClientId: GOOGLE.ios, androidClientId: GOOGLE.android, selectAccount: true, redirectUri: veWeb(),
  });
  const { dang } = useXuLy("google", res, bao, khiCo);
  return <NutMxh loai="google" to={to} bam={() => { if (req && !dang.current) moCua().catch(() => bao(LOI_HUY)); }} />;
}

function NutFacebook({ to, bao, khiCo }: PNut) {
  const [req, res, moCua] = Facebook.useAuthRequest({ clientId: FB_APP_ID, scopes: ["public_profile", "email"], redirectUri: veWeb() });
  const { dang } = useXuLy("facebook", res, bao, khiCo);
  return <NutMxh loai="facebook" to={to} bam={() => { if (req && !dang.current) moCua().catch(() => bao(LOI_HUY)); }} />;
}

/** Nút «Tiếp tục với Google / Facebook» ở màn Chào / Đăng ký / Đăng nhập: token ⇒ POST dang-nhap/<loai> ⇒ vào. */
export function NutDangNhapMxh({ loai, to, bao, nc = {} }: { loai: LoaiMxh; to?: boolean; bao: (chu: string) => void; nc?: NgaCanh }) {
  const vaoSau = useVaoSau(nc);
  return <NutMxhThat loai={loai} to={to} bao={bao} khiCo={async (t) => vaoSau(await bm.goi<KetQuaVao>(`dang-nhap/${loai}`, t))} />;
}

/** Phần dưới màn «Tạo tài khoản» / «Vào nhà cùng …» (bm1-chao + nhánh được mời): tiêu đề, một câu, Google (to), Facebook + Số điện thoại,
 *  điều khoản. Nút MXH nào chưa bật thì ẩn — Số điện thoại giãn ra chiếm chỗ. */
export function ChonCachTaoTk({ tieu, loi, sdt, bao, nc }: { tieu: string; loi: string; sdt: () => void; bao: (chu: string) => void; nc?: NgaCanh }) {
  const co = useCoMxh();
  return (
    <View style={{ gap: 14 }}>
      <TieuDe chu={tieu} phu={loi} giua />
      {co.google ? <NutDangNhapMxh loai="google" to bao={bao} nc={nc} /> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {co.facebook ? <NutDangNhapMxh loai="facebook" bao={bao} nc={nc} /> : null}
        <NutSdt bam={sdt} />
      </View>
      <DieuKhoan />
    </View>
  );
}
