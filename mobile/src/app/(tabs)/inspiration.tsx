import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { PlaceInput } from "@/components/PlaceInput";
import { Badge, Button, Card, Chip, Empty, ErrorBox, Field, Header, Loading, Notice, Screen, s } from "@/components/ui";
import { apiGet, qs } from "@/lib/api";
import { money } from "@/lib/format";
import { C } from "@/lib/theme";
import type { InspirationResult, Place } from "@/lib/types";

const MONTHS = ["Flexible", "janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const CROWD = ["", "calme", "affluence moyenne", "forte affluence"];

export default function Inspiration() {
  const [origin, setOrigin] = useState<Place | null>({ code: "PAR", label: "Paris (tous les aéroports)" });
  const [budget, setBudget] = useState("600");
  const [nights, setNights] = useState("5");
  const [month, setMonth] = useState(0);
  const [data, setData] = useState<InspirationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function go() {
    setError("");
    if (!origin) return setError("Choisissez une ville de départ dans la liste.");
    setLoading(true);
    try {
      setData(await apiGet<InspirationResult>(`/api/inspiration?${qs({ origin: origin.code, budget: Number(budget) || 600, nights: Number(nights) || 5, month })}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header title="Je ne sais pas où partir" subtitle="Un budget, un mois : DINO propose des destinations et explique pourquoi." mood="thinking" />
      <Card>
        <PlaceInput label="Je pars de" value={origin} onChange={setOrigin} />
        <View style={s.row}>
          <Field label="Budget / pers. (€)" value={budget} onChangeText={(t) => setBudget(t.replace(/\D/g, ""))} keyboardType="number-pad" />
          <Field label="Nuits" value={nights} onChangeText={(t) => setNights(t.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={2} />
        </View>
        <Text style={s.label}>Mois</Text>
        <View style={[s.row, { flexWrap: "wrap", gap: 6 }]}>
          {MONTHS.map((m, i) => (
            <Chip key={m} label={m} active={month === i} onPress={() => setMonth(i)} />
          ))}
        </View>
        <Button label="Trouver où partir" variant="accent" onPress={go} loading={loading} />
      </Card>
      {error ? <ErrorBox message={error} /> : null}
      {loading && <Loading label="DINO cherche des idées…" />}
      {data && !loading && (
        <>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.h2}>
              {data.results.length} idée(s) · {data.monthLabel}
            </Text>
            <Badge kind="estimation" />
          </View>
          <Notice tone="info">{data.disclaimer}</Notice>
          {data.nothingFits && <Notice>Rien ne tient dans ce budget : voici les options les plus proches.</Notice>}
          {data.results.length === 0 && <Empty title="Aucune idée pour ces critères" />}
          {data.results.map((r) => (
            <Pressable key={r.destination.slug} accessibilityRole="link" onPress={() => router.push(`/destinations/${r.destination.slug}`)}>
              <Card>
                <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.h2}>{r.destination.name.fr}</Text>
                    <Text style={s.muted}>
                      {r.countryName} · {r.monthName}
                      {r.destination.hiddenGem ? " · méconnue" : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 22, fontWeight: "900", color: C.orange500 }}>≈ {money(r.estimate.perPersonCents, r.estimate.currency)}</Text>
                    <Text style={s.muted}>par personne</Text>
                  </View>
                </View>
                <Text style={s.text}>{r.destination.summary}</Text>
                <Text style={s.muted}>
                  🌡 {r.climate.tmax} °C · {r.climate.precip} mm{r.flightHours ? ` · ≈ ${r.flightHours} h de vol` : ""} · {CROWD[r.crowdLevel]}
                </Text>
                {r.reasons.map((x) => (
                  <Text key={x} style={{ color: C.deep700, fontSize: 13 }}>
                    ✓ {x}
                  </Text>
                ))}
                {r.warnings.map((x) => (
                  <Text key={x} style={{ color: C.orange600, fontSize: 13 }}>
                    ! {x}
                  </Text>
                ))}
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}
