import { Text, View } from "react-native";
import type { HotelOffer } from "@/lib/types";
import { money } from "@/lib/format";
import { C } from "@/lib/theme";
import { Badge, Card, s, sourceBadge } from "./ui";
import { Booking } from "./FlightCard";

const BOARD: Record<string, string> = { breakfast: "Petit-déjeuner inclus", half_board: "Demi-pension", full_board: "Pension complète", room_only: "Sans repas" };

export function HotelCard({ offer }: { offer: HotelOffer }) {
  const r = offer.property.rating;
  const p = offer.price;
  return (
    <Card>
      <View style={[s.row, { flexWrap: "wrap", gap: 6 }]}>
        <Badge kind={sourceBadge(offer.source)} />
        <Text style={s.muted}>via {offer.source.name}</Text>
      </View>
      <Text style={s.h2}>{offer.property.name}</Text>
      <Text style={s.muted}>
        {offer.property.neighborhood ? `${offer.property.neighborhood} · ` : ""}
        {offer.property.distanceToCenterKm.toFixed(1)} km du centre
      </Text>
      {r ? (
        <View style={s.row}>
          <View style={{ backgroundColor: C.deep800, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: C.white, fontWeight: "800" }}>{((r.score / r.scale) * 10).toFixed(1)}</Text>
          </View>
          <Text style={s.muted}>/10 · {r.count} avis</Text>
        </View>
      ) : (
        <Text style={s.muted}>Pas encore de note</Text>
      )}
      <Text style={s.text}>
        {offer.roomName}
        {BOARD[offer.board] ? ` · ${BOARD[offer.board]}` : ""}
        {offer.cancellation.refundable ? ` · Annulation gratuite${offer.cancellation.freeUntil ? ` jusqu'au ${offer.cancellation.freeUntil}` : ""}` : offer.cancellation.refundable === false ? " · Non remboursable" : ""}
      </Text>
      {offer.valueScore !== null ? (
        <Text style={{ color: C.deep700, fontSize: 13 }}>
          <Text style={{ fontWeight: "800" }}>Qualité-prix {offer.valueScore.toFixed(1)}/10 : </Text>
          {offer.valueExplanation}
        </Text>
      ) : null}
      <View style={{ borderTopWidth: 1, borderTopColor: C.sage100, paddingTop: 8, gap: 2 }}>
        <Text style={s.muted}>{money(p.perNightCents, p.currency)} / nuit</Text>
        <Text style={s.price}>{money(p.estimatedTotalCents, p.currency)}</Text>
        <Text style={s.muted}>total estimé pour {offer.nights} nuit(s)</Text>
        {p.payAtPropertyCents > 0 ? <Text style={s.muted}>dont {money(p.payAtPropertyCents, p.currency)} à payer sur place</Text> : null}
      </View>
      <Booking booking={offer.booking} />
    </Card>
  );
}
