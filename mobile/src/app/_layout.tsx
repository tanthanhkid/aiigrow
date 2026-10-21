import { Stack } from "expo-router";
import { useFonts, Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { M } from "@/lib/mau";

export default function Goc() {
  const [xong] = useFonts({ Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold });
  if (!xong) return null;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: M.nen } }} />;
}
