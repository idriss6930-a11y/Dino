import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { PlaceInput } from "./PlaceInput";
import { Button, Chip, ErrorBox, Field, s } from "./ui";
import { addDays, isIsoDate, today } from "@/lib/format";
import { qs } from "@/lib/api";
import type { Place } from "@/lib/types";

export type FlightParams = { origin: string; originLabel?: string; destination: string; destinationLabel?: string; departDate: string; returnDate?: string; adults: string; trip: "roundtrip" | "oneway" };

/** Formulaire de recherche de vols. Envoie vers l'onglet Vols avec les paramètres dans l'URL. */
export function FlightSearchForm({ initial, compact }: { initial?: Partial<FlightParams>; compact?: boolean }) {
  const [trip, setTrip] = useState<"roundtrip" | "oneway">(initial?.trip ?? "roundtrip");
  const [origin, setOrigin] = useState<Place | null>(initial?.origin ? { code: initial.origin, label: initial.originLabel ?? initial.origin } : { code: "PAR", label: "Paris (tous les aéroports)" });
  const [destination, setDestination] = useState<Place | null>(initial?.destination ? { code: initial.destination, label: initial.destinationLabel ?? initial.destination } : null);
  const [depart, setDepart] = useState(initial?.departDate ?? addDays(today(), 30));
  const [ret, setRet] = useState(initial?.returnDate ?? addDays(today(), 37));
  const [adults, setAdults] = useState(initial?.adults ?? "1");
  const [error, setError] = useState("");

  function submit() {
    setError("");
    if (!origin) return setError("Choisissez une ville ou un aéroport de départ dans la liste.");
    if (!destination) return setError("Choisissez une destination dans la liste.");
    if (!isIsoDate(depart) || depart < today()) return setError("Date d'aller invalide (format AAAA-MM-JJ, à partir d'aujourd'hui).");
    if (trip === "roundtrip" && (!isIsoDate(ret) || ret < depart)) return setError("La date de retour doit suivre la date d'aller (format AAAA-MM-JJ).");
    const n = Number(adults);
    if (!Number.isInteger(n) || n < 1 || n > 9) return setError("Entre 1 et 9 adultes.");
    router.push(
      `/vols?${qs({ trip, origin: origin.code, originLabel: origin.label, destination: destination.code, destinationLabel: destination.label, departDate: depart, returnDate: trip === "roundtrip" ? ret : undefined, adults: n })}`,
    );
  }

  return (
    <View style={{ gap: 12 }} accessibilityLabel="Recherche de vols">
      <View style={[s.row, { flexWrap: "wrap" }]}>
        <Chip label="Aller-retour" active={trip === "roundtrip"} onPress={() => setTrip("roundtrip")} />
        <Chip label="Aller simple" active={trip === "oneway"} onPress={() => setTrip("oneway")} />
      </View>
      <PlaceInput label="Départ" value={origin} onChange={setOrigin} placeholder="Ville ou aéroport" />
      <PlaceInput label="Destination" value={destination} onChange={setDestination} placeholder="Ex. Lisbonne" />
      <View style={s.row}>
        <Field label="Aller (AAAA-MM-JJ)" value={depart} onChangeText={setDepart} keyboardType="numbers-and-punctuation" maxLength={10} />
        {trip === "roundtrip" ? <Field label="Retour" value={ret} onChangeText={setRet} keyboardType="numbers-and-punctuation" maxLength={10} /> : null}
      </View>
      {!compact && <Field label="Adultes" value={adults} onChangeText={setAdults} keyboardType="number-pad" maxLength={1} />}
      {error ? <ErrorBox message={error} /> : null}
      <Button label="Rechercher" variant="accent" onPress={submit} />
      <Text style={s.muted}>Billet, frais connus et coût total affichés séparément. Horaires en heure locale.</Text>
    </View>
  );
}
