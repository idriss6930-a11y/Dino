import { Ionicons } from "@expo/vector-icons";
import type { ColorValue } from "react-native";
import { Tabs } from "expo-router/js-tabs";
import { C } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={typeof color === "string" ? color : C.deep800} size={size} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.deep800,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: C.white, borderTopColor: C.sage100 },
        headerStyle: { backgroundColor: C.cream50 },
        headerTintColor: C.deep900,
        headerTitleStyle: { fontWeight: "900" },
        sceneStyle: { backgroundColor: C.cream50 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Accueil", headerTitle: "🦖 DINO", tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="vols" options={{ title: "Vols", tabBarIcon: icon("airplane-outline") }} />
      <Tabs.Screen name="inspiration" options={{ title: "Où partir", tabBarIcon: icon("compass-outline") }} />
      <Tabs.Screen name="assistant" options={{ title: "Assistant", tabBarIcon: icon("chatbubble-ellipses-outline") }} />
      <Tabs.Screen name="compte" options={{ title: "Compte", tabBarIcon: icon("person-outline") }} />
    </Tabs>
  );
}
