// Màn Con (AiiGrow Kid) — mọi màn nằm dưới /tre/…: phiên Con riêng (TreProvider), không dùng phiên Ba Mẹ. Bản «Dịu» (06/11): nền kem phẳng.
import { Stack } from "expo-router";
import { D } from "@/lib/diu";
import { TreProvider } from "@/lib/ui-tre";

export default function TreLayout() {
  return (
    <TreProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: D.nen } }} />
    </TreProvider>
  );
}
