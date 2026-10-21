import { Stack } from "expo-router";
import { useFonts, Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { M } from "@/lib/mau";
import { PhienProvider } from "@/lib/phien";

export default function Goc() {
  const [xong] = useFonts({ Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold });
  if (!xong) return null;
  return (
    <SafeAreaProvider>
      <PhienProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: M.nen } }} />
      </PhienProvider>
    </SafeAreaProvider>
  );
}
