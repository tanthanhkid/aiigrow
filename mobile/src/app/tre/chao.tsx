// «Grow chào» bản «Dịu» (con-dt-cai 01 cdt-chao — lần đầu bé vào máy, BRD 6.1 bước 7): «Chào Bảo Anh! Mình là Grow · Mình giữ sao và phút chơi cùng
// con» + 3 dòng (Làm nhiệm vụ → được sao · 1 sao = 1 phút chơi · Muốn thêm? Xin Ba Mẹ — 15/11), tặng sao chào mừng một lần, đọc to được (web).
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { kid } from "@/lib/api-tre";
import { RobChao } from "@/lib/man-con";
import { ManD, NutD } from "@/lib/ui-diu";
import { coDocTo, docTo, useTre } from "@/lib/ui-tre";

export default function Chao() {
  const { ten } = useTre();
  const [sao, setSao] = useState<number | null>(null);
  useEffect(() => {
    kid.goi<{ diemChaoMung: number }>("chao", {}).then((r) => setSao(r.diemChaoMung)).catch(() => setSao(0));
  }, []);
  return (
    <ManD giua day={<>
      <NutD chu={sao ? `Nhận ${sao} sao · vào thôi` : "Vào thôi"} bam={() => router.replace("/tre/nha")} />
      {coDocTo() ? <NutD chu="Grow đọc to cho con nghe" loai="chu"
        bam={() => docTo(`Chào ${ten}! Mình là Grow. Mình giữ sao và phút chơi cùng con. Làm nhiệm vụ thì được sao. 1 sao bằng 1 phút chơi. Có sao là chơi, hoặc để dành đổi quà. Muốn thêm thì xin Ba Mẹ.`)} /> : null}
    </>}>
      <RobChao ten={ten || undefined} />
    </ManD>
  );
}
