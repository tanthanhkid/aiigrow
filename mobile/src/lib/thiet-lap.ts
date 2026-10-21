// Trạng thái trình hướng dẫn 5 bước (BRD 6.1) giữa các màn: Con vừa tạo, loại thiết bị đã chọn.
type TL = { conId?: string; tenCon?: string; nhom?: "nhi" | "teen"; nen?: "windows" | "mac" | "ios" | "android" };
let tl: TL = {};
export const datTl = (x: TL) => { tl = { ...tl, ...x }; };
export const layTl = () => tl;
