import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { DemoBanner } from "@/components/DemoBanner";
import { HotelCard } from "@/components/HotelCard";
import { Button, Card, Chip, Empty, ErrorBox, Field, Loading, Notice, Screen, s } from "@/components/ui";
import { apiGet, qs } from "@/lib/api";
import { addDays, isIsoDate, today } from "@/lib/format";
import type { DestinationSummary, HotelSearchResult } from "@/lib/types";

export default function Hotels() {
  const [cities, setCities] = useState<DestinationSummary[]>([]);
  const [city, setCity] = useState("lisbonne");
  const [checkin, setCheckin] = useState(addDays(today(), 30));
  const [checkout, setCheckout] = useState(addDays(today(), 34));
  const [adults, setAdults] = useState("2");
  const [data, setData] = useState<HotelSearchResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    apiGet<{ destinations: DestinationSummary[] }>("/api/destinations")
      .then((r) => setCities(r.destinations))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function search() {
    setError("");
    if (!isIsoDate(checkin) || !isIsoDate(checkout) || checkout <= checkin) return setError("Dates invalides : format AAAA-MM-JJ, départ après l'arrivée.");
    setLoading(true);
    try {
      setData(await apiGet<HotelSearchResult>(`/api/hotels/search?${qs({ city, checkin, checkout, adults, rooms: 1 })}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const visibleCities = showAll ? cities : cities.slice(0, 8);
  return (
    <Screen>
      <DemoBanner />
      <Card>
        <Text style={s.label}>Ville</Text>
        <View style={[s.row, { flexWrap: "wrap", gap: 6 }]}>
          {visibleCities.map((c) => (
            <Chip key={c.slug} label={c.name} active={city === c.slug} onPress={() => setCity(c.slug)} />
          ))}
          {cities.length > 8 && <Chip label={showAll ? "Moins" : `+ ${cities.length - 8} villes`} onPress={() => setShowAll((v) => !v)} />}
        </View>
        <View style={s.row}>
          <Field label="Arrivée (AAAA-MM-JJ)" value={checkin} onChangeText={setCheckin} maxLength={10} keyboardType="numbers-and-punctuation" />
          <Field label="Départ" value={checkout} onChangeText={setCheckout} maxLength={10} keyboardType="numbers-and-punctuation" />
        </View>
        <Field label="Adultes" value={adults} onChangeText={setAdults} keyboardType="number-pad" maxLength={1} />
        <Button label="Comparer les hôtels" variant="accent" onPress={search} loading={loading} />
      </Card>
      {error ? <ErrorBox message={error} /> : null}
      {loading && <Loading label="DINO compare les hébergements…" />}
      {!data && !loading && <Empty title="Choisissez une ville et des dates" mood="sleeping" />}
      {data && !loading && (
        <>
          {data.mode === "demo" && <Notice>Hébergements fictifs, générés pour tester l'application.</Notice>}
          <Text style={s.muted}>
            {data.offers.length} hébergement(s) à {data.destination.name} · {data.nights} nuit(s). Rapport qualité-prix = note des voyageurs comparée au prix total.
          </Text>
          {data.offers.slice(0, 15).map((o) => (
            <HotelCard key={o.id} offer={o} />
          ))}
        </>
      )}
    </Screen>
  );
}
