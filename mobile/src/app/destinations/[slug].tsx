import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Badge, Button, Card, ErrorBox, Header, Loading, Notice, Screen, s } from "@/components/ui";
import { apiGet, qs } from "@/lib/api";
import { C } from "@/lib/theme";
import type { DestinationDetail } from "@/lib/types";

const SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function cellColor(v: number) {
  if (v >= 75) return { bg: C.sage400, fg: C.white };
  if (v >= 50) return { bg: C.sage100, fg: C.deep800 };
  return { bg: C.orange400, fg: C.white };
}

export default function DestinationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [d, setD] = useState<DestinationDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    apiGet<DestinationDetail>(`/api/destinations/${slug}`)
      .then(setD)
      .catch((e: Error) => setError(e.message));
  }, [slug]);

  if (error)
    return (
      <Screen>
        <ErrorBox message={error} />
      </Screen>
    );
  if (!d)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  const rows: { label: string; get: (m: DestinationDetail["months"][number]) => string | number; score?: boolean }[] = [
    { label: "T° max / min", get: (m) => `${m.tmax}° ${m.tmin}°` },
    { label: "Pluie (mm)", get: (m) => m.precip },
    { label: "Météo", get: (m) => m.weather, score: true },
    { label: "Prix (100 = bas)", get: (m) => m.price, score: true },
    { label: "Calme", get: (m) => m.crowd, score: true },
    { label: "Global", get: (m) => m.overall, score: true },
  ];
  const next = new Date();
  const flexMonth = `${next.getUTCFullYear() + (next.getUTCMonth() === 11 ? 1 : 0)}-${String(((next.getUTCMonth() + 1) % 12) + 1).padStart(2, "0")}`;
  return (
    <Screen>
      <Stack.Screen options={{ title: d.destination.name }} />
      <Header title={d.destination.name} subtitle={`${d.destination.country} · ${d.destination.summary}`} mood="explorer" />
      <Card>
        <Text style={s.h2}>Quand partir ?</Text>
        <Text style={s.text}>
          Meilleurs mois au global : <Text style={{ fontWeight: "800" }}>{d.best.overall.join(", ")}</Text>
        </Text>
        <Text style={s.text}>{d.best.explanation}</Text>
        <View style={s.row}>
          <Badge kind="estimation" />
          <Text style={[s.muted, { flex: 1 }]}>{d.climateSource.label}</Text>
        </View>
      </Card>
      <Card>
        <Text style={s.h2}>Calendrier sur 12 mois</Text>
        <Text style={s.muted}>Météo, prix et affluence sont trois notions distinctes, notées sur 100. Faites défiler vers la droite.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 110 }} />
              {SHORT.map((m) => (
                <Text key={m} style={{ width: 54, textAlign: "center", fontWeight: "700", color: C.deep800 }}>
                  {m}
                </Text>
              ))}
            </View>
            {rows.map((r) => (
              <View key={r.label} style={{ flexDirection: "row", marginTop: 4 }}>
                <Text style={{ width: 110, color: C.deep800, fontSize: 13 }}>{r.label}</Text>
                {d.months.map((m) => {
                  const v = r.get(m);
                  const col = r.score ? cellColor(Number(v)) : { bg: C.cream100, fg: C.ink };
                  return (
                    <View key={m.month} style={{ width: 50, marginHorizontal: 2, backgroundColor: col.bg, borderRadius: 6, paddingVertical: 6 }}>
                      <Text style={{ textAlign: "center", color: col.fg, fontSize: 12, fontWeight: r.score ? "700" : "400" }}>{v}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </Card>
      <Notice tone="info">Prix et affluence sont des estimations éditoriales DINO, pas des tarifs. Lancez une recherche pour voir les prix disponibles.</Notice>
      <Button
        label="Voir les vols le mois prochain"
        onPress={() => router.push(`/vols?${qs({ origin: "PAR", originLabel: "Paris (tous les aéroports)", destination: d.destination.airports[0], destinationLabel: d.destination.name, departDate: `${flexMonth}-10`, returnDate: `${flexMonth}-17`, trip: "roundtrip", adults: 1 })}`)}
      />
    </Screen>
  );
}
