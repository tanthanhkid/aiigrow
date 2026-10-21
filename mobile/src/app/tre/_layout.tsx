// Màn Con (AiiGrow Kid) — mọi màn nằm dưới /tre/…: phiên PIN riêng (TreProvider), không dùng phiên Ba Mẹ.
import { Stack } from "expo-router";
import { M } from "@/lib/ui";
import { TreProvider } from "@/lib/ui-tre";

export default function TreLayout() {
  return (
    <TreProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: M.nen } }} />
    </TreProvider>
  );
}
