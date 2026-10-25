import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { FlightCard } from "@/components/FlightCard";
import { FlightSearchForm, type FlightParams } from "@/components/FlightSearchForm";
import { DemoBanner } from "@/components/DemoBanner";
import { Button, Card, Chip, Empty, ErrorBox, Loading, Notice, Screen, s } from "@/components/ui";
import { apiGet, qs } from "@/lib/api";
import type { FlightSearchResult } from "@/lib/types";

const SORTS = [
  { id: "best", label: "Meilleur choix" },
  { id: "price", label: "Moins cher" },
  { id: "duration", label: "Plus rapide" },
] as const;

export default function Vols() {
  const p = useLocalSearchParams<Partial<Record<keyof FlightParams, string>>>();
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("best");
  const [data, setData] = useState<FlightSearchResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(10);
  const ready = !!(p.origin && p.destination && p.departDate);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setLoading(true);
    setError("");
    setShown(10);
    apiGet<FlightSearchResult>(`/api/flights/search?${qs({ trip: p.trip ?? "roundtrip", origin: p.origin, destination: p.destination, departDate: p.departDate, returnDate: p.returnDate, adults: p.adults ?? 1, sort })}`)
      .then((r) => alive && setData(r))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ready, p.trip, p.origin, p.destination, p.departDate, p.returnDate, p.adults, sort]);

  return (
    <Screen>
      <DemoBanner />
      <Card>
        <FlightSearchForm key={`${p.origin}-${p.destination}-${p.departDate}`} initial={{ ...p, trip: p.trip === "oneway" ? "oneway" : "roundtrip" } as Partial<FlightParams>} />
      </Card>
      {!ready && <Empty title="Où allez-vous ?" mood="explorer">Choisissez un départ, une destination et des dates.</Empty>}
      {ready && (
        <View style={[s.row, { flexWrap: "wrap" }]}>
          {SORTS.map((so) => (
            <Chip key={so.id} label={so.label} active={sort === so.id} onPress={() => setSort(so.id)} />
          ))}
        </View>
      )}
      {loading && <Loading label="DINO compare les vols…" />}
      {error ? <ErrorBox message={error} /> : null}
      {data && !loading && (
        <>
          {data.mode === "demo" && !data.warnings.length && <Notice>Tarifs et compagnies fictifs, générés pour tester l'application.</Notice>}
          {data.warnings.map((w) => (
            <Notice key={w} tone="info">
              {w}
            </Notice>
          ))}
          <Text style={s.muted}>
            {data.offers.length} offre(s) · {data.explanations.sort}
          </Text>
          {data.offers.length === 0 && <Empty title="Aucune offre trouvée">Essayez d'autres dates ou un aéroport proche.</Empty>}
          {data.offers.slice(0, shown).map((o, i) => (
            <FlightCard key={o.id} offer={o} highlight={i === 0 ? SORTS.find((x) => x.id === sort)?.label : undefined} />
          ))}
          {shown < data.offers.length && <Button label={`Voir plus (${data.offers.length - shown})`} variant="ghost" onPress={() => setShown((n) => n + 10)} />}
        </>
      )}
    </Screen>
  );
}
