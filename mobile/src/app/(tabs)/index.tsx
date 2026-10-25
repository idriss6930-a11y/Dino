import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Dino, type DinoMood } from "@/components/Dino";
import { DemoBanner } from "@/components/DemoBanner";
import { FlightSearchForm } from "@/components/FlightSearchForm";
import { Card, Screen, s } from "@/components/ui";
import { C } from "@/lib/theme";

const SHORTCUTS: { title: string; text: string; href: string; mood: DinoMood }[] = [
  { title: "Je ne sais pas où partir", text: "Un budget, un mois : DINO propose et explique.", href: "/inspiration", mood: "thinking" },
  { title: "Hôtels", text: "Comparez le coût total et le rapport qualité-prix.", href: "/hotels", mood: "sleeping" },
  { title: "Destinations", text: "Le meilleur moment pour partir, mois par mois.", href: "/destinations", mood: "explorer" },
  { title: "Demander à DINO", text: "Décrivez votre envie en une phrase.", href: "/assistant", mood: "happy" },
];

export default function Home() {
  return (
    <Screen>
      <DemoBanner />
      <View style={[s.row, { alignItems: "flex-start" }]}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontSize: 30, fontWeight: "900", color: C.deep900, lineHeight: 34 }}>
            Le bon voyage, au bon prix, <Text style={{ color: C.orange500 }}>au bon moment.</Text>
          </Text>
          <Text style={s.muted}>DINO compare plusieurs sources, affiche le coût total réel et dit s'il vaut mieux acheter ou attendre. Chaque chiffre indique d'où il vient.</Text>
        </View>
        <Dino mood="explorer" size={84} />
      </View>
      <Card>
        <FlightSearchForm compact />
      </Card>
      {SHORTCUTS.map((sc) => (
        <Pressable key={sc.href} accessibilityRole="link" onPress={() => router.push(sc.href as never)}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Dino mood={sc.mood} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={s.h2}>{sc.title}</Text>
              <Text style={s.muted}>{sc.text}</Text>
            </View>
            <Text style={{ fontSize: 22, color: C.sage500 }}>›</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
