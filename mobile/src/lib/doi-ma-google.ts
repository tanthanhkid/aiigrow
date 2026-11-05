// Google trên iOS / Android: trình duyệt hệ thống trả `code`, app tự đổi mã lấy id_token (PKCE). Bước đổi mã của expo-auth-session tự chạy thì
// lỗi bị nuốt (promise không có catch) ⇒ nút đứng im, Ba Mẹ không biết gì. Nên tắt tự đổi (shouldAutoExchangeCode: false) và đổi ở đây:
// lỗi mạng / mã hết hạn / Google từ chối / quá lâu ⇒ ném LoiDoiMa với câu báo rõ, màn gọi `bao()` hiện cho Ba Mẹ.
// Không import React Native ⇒ chạy thẳng bằng `node --test` (doi-ma-google.test.ts).

export const LOI_DOI_MA = "Google chưa xác nhận xong đăng nhập (mạng chập chờn hoặc quá lâu) — bấm lại «Tiếp tục với Google», hoặc dùng số điện thoại nhé.";
export const DOI_MA_TOI_DA_MS = 20_000;

export class LoiDoiMa extends Error {
  goc?: unknown;
  constructor(goc?: unknown) { super(LOI_DOI_MA); this.name = "LoiDoiMa"; this.goc = goc; }
}

type KetQuaGoogle = { params?: Record<string, string | undefined>; authentication?: { idToken?: string } | null };

/** Kết quả «success» của Google ⇒ id_token. Có sẵn (web: luồng id_token) thì trả luôn; có `code` thì đổi bằng `doi` (tối đa `choMs`).
 *  Không có cả hai, đổi lỗi, đổi xong mà không có id_token, hoặc quá giờ ⇒ LoiDoiMa. */
export async function layIdTokenGoogle(res: KetQuaGoogle, doi: (code: string) => Promise<{ idToken?: string }>, choMs = DOI_MA_TOI_DA_MS): Promise<string> {
  const san = res.params?.id_token || res.authentication?.idToken;
  if (san) return san;
  const code = res.params?.code;
  if (!code) throw new LoiDoiMa();
  let hen: ReturnType<typeof setTimeout> | undefined;
  try {
    const kq = await Promise.race([
      doi(code),
      new Promise<never>((_, tuChoi) => { hen = setTimeout(() => tuChoi(new Error("het_gio")), choMs); }),
    ]);
    if (!kq?.idToken) throw new Error("khong_co_id_token");
    return kq.idToken;
  } catch (e) {
    throw new LoiDoiMa(e);
  } finally {
    if (hen) clearTimeout(hen);
  }
}
