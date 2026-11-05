// Phiên Ba Mẹ: nạp token lúc mở app; hết phiên (401) ⇒ về màn Chào. Đăng nhập / đăng ký xong gọi `vao(token)`.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { bm } from "./api";

/** ra({ daXoa: true }): tài khoản vừa bị xoá trên máy chủ (phiên đã mất) ⇒ không gọi dang-xuat, chỉ xoá token trên máy. */
/** vao(token, moi?, den?): `den` = đường vào sau khi có phiên (thiết kế 05/11: nhánh được mời ⇒ /moi/vao); không có ⇒ như cũ. */
type Phien = { san: boolean; co: boolean; vao: (token: string, moi?: boolean, den?: string) => Promise<void>; ra: (o?: { daXoa?: boolean }) => Promise<void> };
const Ctx = createContext<Phien>({ san: false, co: false, vao: async () => {}, ra: async () => {} });

export function PhienProvider({ children }: { children: ReactNode }) {
  const [san, setSan] = useState(false);
  const [co, setCo] = useState(false);
  useEffect(() => {
    bm.nap().then((t) => { setCo(!!t); setSan(true); });   // nap không ném: đọc khoá máy lỗi ⇒ null (api.ts › kho.doc)
    bm.onHetPhien(() => { setCo(false); router.replace("/chao"); });
  }, []);
  const vao = useCallback(async (t: string, moi?: boolean, den?: string) => {
    await bm.dat(t);
    setCo(true);
    router.replace((den ?? (moi ? "/thiet-lap/ten-con" : "/")) as never);
  }, []);
  const ra = useCallback(async (o?: { daXoa?: boolean }) => {
    if (!o?.daXoa) try { await bm.goi("dang-xuat", {}); } catch { /* vẫn xoá phiên trên máy */ }
    await bm.dat(null);
    setCo(false);
    router.replace("/chao");
  }, []);
  // Chưa nạp xong token thì chưa dựng màn: mở thẳng một đường dẫn (tải lại trang web, link sâu) không được gọi API khi chưa có Bearer.
  return <Ctx.Provider value={{ san, co, vao, ra }}>{san ? children : null}</Ctx.Provider>;
}

export const usePhien = () => useContext(Ctx);
