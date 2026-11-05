// Lời mời vào nhà (L6, thiết kế 05/11): kiểu dữ liệu xem trước lời mời + thẻ lời mời dùng ở /moi và /moi/vao.
import { View } from "react-native";
import { Avt, Chu, M, MAU_CON, The } from "./ui";

export type XemMoi = { tenGiaDinh: string; nguoiMoi: string | null; quyen?: "ba_me" | "trong_giup"; tenQuyen?: string; tenGoi: string; tenCon?: string[]; het: string };
export const ma0 = (m?: string) => String(m ?? "").replace(/[^A-Za-z0-9_-]/g, "");

/** «Bảo Anh, Bảo Minh» / «Bảo Anh và Bảo Minh». */
export const noiTen = (ds: string[] = [], va = false) => (ds.length < 2 ? ds.join("") : va ? `${ds.slice(0, -1).join(", ")} và ${ds[ds.length - 1]}` : ds.join(", "));

/** Thẻ lời mời (dùng cả ở /moi và màn thông báo): chữ cái người mời + 2 dòng + chấm tên các Con. */
export function TheLoiMoi({ x }: { x: XemMoi }) {
  const ai = x.nguoiMoi ?? x.tenGiaDinh;
  return (
    <The>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avt ten={ai} mau={MAU_CON[2]} co={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={15.5}>{`${ai} mời bạn vào nhà`}</Chu>
          {x.tenCon?.length ? <Chu co={13} mau={M.chu3}>{`Cùng trông ${noiTen(x.tenCon)}`}</Chu> : null}
        </View>
        <View style={{ flexDirection: "row" }}>
          {(x.tenCon ?? []).slice(0, 3).map((t, i) => <View key={t + i} style={{ marginLeft: i ? -8 : 0 }}><Avt ten={t} mau={MAU_CON[(i + 3) % MAU_CON.length]} co={28} /></View>)}
        </View>
      </View>
    </The>
  );
}

