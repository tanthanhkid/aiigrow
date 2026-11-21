// #536: Con đã có máy ghép chưa — đúng Con đó (máy chung chưa gán Con không tính), bỏ máy đang gỡ. Thuần, test được không cần expo.
export const mayDaGhepCuaCon = (ds: { con: string | null; conDs?: { id: string }[] | null; dangGo?: unknown }[], con: string) =>
  ds.some((m) => !m.dangGo && (m.conDs ? m.conDs.some((c) => c.id === con) : m.con === con));
