// #751: trang giới hạn 13+ cho bé dưới 13 tuổi — máy chủ trả 409 `can_xac_nhan_tuoi` (lib/gioi-han-tuoi.ts) kèm câu cảnh báo. Hỏi Ba Mẹ «Vẫn cho phép» / «Thôi»;
// đồng ý ⇒ gửi lại kèm `xacNhanTuoi: true`; «Thôi» ⇒ ném HuyYen (useLam im lặng, không hiện lỗi).
import { Alert, Platform } from "react-native";
import { LoiApi } from "./api";

export class HuyYen extends Error {
  constructor() { super("Ba Mẹ chọn Thôi"); this.name = "HuyYen"; }
}

export const TIEU_DE_13 = "Trang này ghi từ 13 tuổi";

const hoi = (cau: string) => new Promise<boolean>((xong) => {
  if (Platform.OS === "web") { xong(typeof globalThis.confirm === "function" ? globalThis.confirm(`${TIEU_DE_13}\n\n${cau}`) : false); return; }
  Alert.alert(TIEU_DE_13, cau, [{ text: "Thôi", style: "cancel", onPress: () => xong(false) }, { text: "Vẫn cho phép", onPress: () => xong(true) }],
    { cancelable: true, onDismiss: () => xong(false) });
});

/** Chạy `goi(them)`; gặp cảnh báo tuổi ⇒ hỏi Ba Mẹ, đồng ý thì gọi lại với `{ xacNhanTuoi: true }`. */
export async function coXacNhanTuoi<T>(goi: (them: { xacNhanTuoi?: true }) => Promise<T>, hoiLai: (cau: string) => Promise<boolean> = hoi): Promise<T> {
  try {
    return await goi({});
  } catch (e) {
    if (!(e instanceof LoiApi) || e.ma !== "can_xac_nhan_tuoi") throw e;
    if (!(await hoiLai(e.message))) throw new HuyYen();
    return goi({ xacNhanTuoi: true });
  }
}
