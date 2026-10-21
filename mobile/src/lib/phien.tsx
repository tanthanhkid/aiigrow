// Phiên Ba Mẹ: nạp token lúc mở app; hết phiên (401) ⇒ về màn Chào. Đăng nhập / đăng ký xong gọi `vao(token)`.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { bm } from "./api";

type Phien = { san: boolean; co: boolean; vao: (token: string, moi?: boolean) => Promise<void>; ra: () => Promise<void> };
const Ctx = createContext<Phien>({ san: false, co: false, vao: async () => {}, ra: async () => {} });

export function PhienProvider({ children }: { children: ReactNode }) {
  const [san, setSan] = useState(false);
  const [co, setCo] = useState(false);
  useEffect(() => {
    bm.nap().then((t) => { setCo(!!t); setSan(true); });
    bm.onHetPhien(() => { setCo(false); router.replace("/chao"); });
  }, []);
  const vao = useCallback(async (t: string, moi?: boolean) => {
    await bm.dat(t);
    setCo(true);
    router.replace(moi ? "/thiet-lap/ten-con" : "/");
  }, []);
  const ra = useCallback(async () => {
    try { await bm.goi("dang-xuat", {}); } catch { /* vẫn xoá phiên trên máy */ }
    await bm.dat(null);
    setCo(false);
    router.replace("/chao");
  }, []);
  return <Ctx.Provider value={{ san, co, vao, ra }}>{children}</Ctx.Provider>;
}

export const usePhien = () => useContext(Ctx);
