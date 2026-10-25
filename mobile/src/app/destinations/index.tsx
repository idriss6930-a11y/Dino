import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { Card, ErrorBox, Header, Loading, Screen, s } from "@/components/ui";
import { apiGet } from "@/lib/api";
import type { DestinationSummary } from "@/lib/types";

export default function Destinations() {
  const [list, setList] = useState<DestinationSummary[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    apiGet<{ destinations: DestinationSummary[] }>("/api/destinations")
      .then((r) => setList(r.destinations))
      .catch((e: Error) => setError(e.message));
  }, []);
  return (
    <Screen>
      <Header title="Destinations" subtitle="Le meilleur moment pour partir, mois par mois." mood="explorer" />
      {error ? <ErrorBox message={error} /> : null}
      {!list && !error && <Loading />}
      {list?.map((d) => (
        <Pressable key={d.slug} accessibilityRole="link" onPress={() => router.push(`/destinations/${d.slug}`)}>
          <Card>
            <Text style={s.h2}>{d.name}</Text>
            <Text style={s.muted}>
              {d.country}
              {d.hiddenGem ? " · méconnue" : ""}
            </Text>
            <Text style={s.text} numberOfLines={2}>
              {d.summary}
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
