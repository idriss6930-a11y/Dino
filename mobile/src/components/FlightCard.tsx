import { Linking, Pressable, Text, View } from "react-native";
import type { FlightOffer } from "@/lib/types";
import { dateFr, duration, hhmm, money } from "@/lib/format";
import { C } from "@/lib/theme";
import { Badge, Card, s, sourceBadge } from "./ui";

export function FlightCard({ offer, highlight }: { offer: FlightOffer; highlight?: string }) {
  const p = offer.price;
  const extras = p.lines.filter((l) => !l.included);
  return (
    <Card>
      <View style={[s.row, { flexWrap: "wrap", gap: 6 }]}>
        {highlight ? <Badge kind="demo" label={highlight} /> : null}
        <Badge kind={sourceBadge(offer.source)} />
        <Text style={s.muted}>via {offer.source.name}</Text>
      </View>
      {offer.slices.map((sl, i) => (
        <View key={i} style={{ gap: 2 }}>
          <Text style={s.muted}>
            {offer.slices.length === 2 ? (i === 0 ? "Aller" : "Retour") : `Trajet ${i + 1}`} · {dateFr(sl.departLocal.slice(0, 10))}
          </Text>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: C.deep900 }}>{hhmm(sl.departLocal)}</Text>
              <Text style={s.muted}>{sl.origin}</Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={s.muted}>{duration(sl.durationMinutes)}</Text>
              <View style={{ height: 1, backgroundColor: C.sage400, alignSelf: "stretch", marginVertical: 3 }} />
              <Text style={{ color: sl.stops ? C.orange600 : C.deep700, fontSize: 12 }}>{sl.stops ? `${sl.stops} escale${sl.stops > 1 ? "s" : ""}` : "Direct"}</Text>
              <Text style={[s.muted, { fontSize: 11 }]} numberOfLines={1}>
                {sl.segments[0]?.carrierName}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: C.deep900 }}>
                {hhmm(sl.arriveLocal)}
                {sl.dayShift ? <Text style={{ fontSize: 12, color: C.orange600 }}> +{sl.dayShift}</Text> : null}
              </Text>
              <Text style={s.muted}>{sl.destination}</Text>
            </View>
          </View>
        </View>
      ))}
      <View style={{ borderTopWidth: 1, borderTopColor: C.sage100, paddingTop: 8, gap: 2 }}>
        <Text style={s.muted}>Coût total estimé</Text>
        <Text style={s.price}>{money(p.estimatedTotalCents, p.currency)}</Text>
        <Text style={s.muted}>
          Billet {money(p.ticketTotalCents, p.currency)} · {money(p.perPassengerCents, p.currency)} / passager
        </Text>
        {extras.map((l) => (
          <Text key={l.label} style={s.muted}>
            En option : {l.label} {money(l.cents, p.currency)}
          </Text>
        ))}
      </View>
      <Booking booking={offer.booking} />
    </Card>
  );
}

export function Booking({ booking }: { booking: FlightOffer["booking"] }) {
  if (booking.type === "unavailable")
    return (
      <View style={{ backgroundColor: C.sage100, borderRadius: 10, padding: 8 }}>
        <Text style={{ color: C.deep700, fontSize: 13 }}>{booking.label}</Text>
      </View>
    );
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(booking.url)} style={[s.button, { backgroundColor: C.orange500 }]}>
      <Text style={[s.buttonText, { color: C.white }]}>
        {booking.label}
        {booking.type === "affiliate_redirect" ? " · lien affilié" : ""}
      </Text>
    </Pressable>
  );
}
