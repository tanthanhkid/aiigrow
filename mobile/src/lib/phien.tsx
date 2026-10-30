// Phiên Ba Mẹ: nạp token lúc mở app; hết phiên (401) ⇒ về màn Chào. Đăng nhập / đăng ký xong gọi `vao(token)`.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { bm } from "./api";

/** ra({ daXoa: true }): tài khoản vừa bị xoá trên máy chủ (phiên đã mất) ⇒ không gọi dang-xuat, chỉ xoá token trên máy. */
type Phien = { san: boolean; co: boolean; vao: (token: string, moi?: boolean) => Promise<void>; ra: (o?: { daXoa?: boolean }) => Promise<void> };
const Ctx = createContext<Phien>({ san: false, co: false, vao: async () => {}, ra: async () => {} });

export function PhienProvider({ children }: { children: ReactNode }) {
  const [san, setSan] = useState(false);
  const [co, setCo] = useState(false);
  useEffect(() => {
    bm.nap().then((t) => { setCo(!!t); setSan(true); });   // nap không ném: đọc khoá máy lỗi ⇒ null (api.ts › kho.doc)
    bm.onHetPhien(() => { setCo(false); router.replace("/chao"); });
  }, []);
  const vao = useCallback(async (t: string, moi?: boolean) => {
    await bm.dat(t);
    setCo(true);
    // Cửa một chiều (skill appllama — Navigation law 3): đăng nhập/đăng ký xong thì gỡ hết màn Chào/Số điện thoại/Mã khỏi ngăn xếp
    // rồi thay bằng đích — vuốt lùi hay nút lùi Android không bao giờ quay lại màn Đăng nhập.
    if (router.canDismiss()) router.dismissAll();
    router.replace(moi ? "/thiet-lap/ten-con" : "/");
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
