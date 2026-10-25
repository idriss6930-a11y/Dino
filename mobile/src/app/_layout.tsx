import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { C } from "@/lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.cream50 },
          headerTintColor: C.deep800,
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: C.cream50 },
          headerBackTitle: "Retour",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="hotels" options={{ title: "Hôtels" }} />
        <Stack.Screen name="destinations/index" options={{ title: "Destinations" }} />
        <Stack.Screen name="destinations/[slug]" options={{ title: "Destination" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
