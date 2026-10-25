"use client";
import { useState } from "react";
import { ChevronDown, ExternalLink, Luggage, RefreshCcw } from "lucide-react";
import type { FlightOffer, FlightSlice } from "@/lib/providers/types";
import { DataBadge, sourceKind } from "@/components/ui";
import { formatMoney } from "@/lib/utils/money";
import { formatDateFr, formatDuration } from "@/lib/utils/dates";

const time = (local: string) => local.slice(11, 16);

function SliceRow({ s }: { s: FlightSlice }) {
  const carriers = [...new Set(s.segments.map((g) => g.carrierName))].join(", ");
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
      <div className="text-right">
        <p className="text-lg font-bold tabular-nums text-deep-900">{time(s.departLocal)}</p>
        <p className="text-xs text-muted">{s.origin}</p>
      </div>
      <div className="min-w-0 text-center text-xs text-muted">
        <p>{formatDuration(s.durationMinutes)}</p>
        <div className="relative my-1 h-px bg-sage-300">
          {s.layovers.map((l, i) => (
            <span key={i} className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-orange-500" style={{ left: `${((i + 1) / (s.layovers.length + 1)) * 100}%` }} />
          ))}
        </div>
        <p className={s.stops ? "text-orange-600" : "text-deep-700"}>
          {s.stops === 0 ? "Direct" : `${s.stops} escale${s.stops > 1 ? "s" : ""} : ${s.layovers.map((l) => `${l.airport} ${formatDuration(l.minutes)}`).join(", ")}`}
        </p>
        <p className="truncate">{carriers}</p>
      </div>
      <div>
        <p className="text-lg font-bold tabular-nums text-deep-900">
          {time(s.arriveLocal)}
          {s.dayShift !== 0 && <sup className="ml-0.5 text-xs text-orange-600" title="Arrivée un autre jour (heure locale)">{s.dayShift > 0 ? `+${s.dayShift}` : s.dayShift}</sup>}
        </p>
        <p className="text-xs text-muted">{s.destination}</p>
      </div>
    </div>
  );
}

export function OfferCard({ offer, highlight }: { offer: FlightOffer; highlight?: string }) {
  const [open, setOpen] = useState(false);
  const p = offer.price;
  const notIncluded = p.lines.filter((l) => !l.included);
  return (
    <article className="card overflow-hidden" data-testid="flight-offer">
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {highlight && <span className="chip border-orange-400 bg-orange-400/10 text-orange-600">{highlight}</span>}
            <DataBadge kind={sourceKind(offer.source)} />
            <span className="text-muted">via {offer.source.name}</span>
            {offer.alsoFrom?.length ? <span className="text-muted">· aussi chez {offer.alsoFrom.map((a) => `${a.source.name} (${formatMoney(a.totalCents, a.currency)})`).join(", ")}</span> : null}
          </div>
          {offer.slices.map((s, i) => (
            <div key={i}>
              <p className="mb-1 text-xs font-medium text-muted">
                {offer.slices.length === 2 ? (i === 0 ? "Aller" : "Retour") : `Trajet ${i + 1}`} · {formatDateFr(s.departLocal.slice(0, 10))}
              </p>
              <SliceRow s={s} />
            </div>
          ))}
        </div>
        <div className="flex flex-col items-start gap-1 border-t border-sage-100 pt-3 md:w-56 md:items-end md:border-l md:border-t-0 md:pl-4 md:pt-0 md:text-right">
          <p className="text-xs text-muted">Coût total estimé</p>
          <p className="text-2xl font-black text-deep-900">{formatMoney(p.estimatedTotalCents, p.currency)}</p>
          <p className="text-xs text-muted">
            Billet {formatMoney(p.ticketTotalCents, p.currency)}
            {p.estimatedTotalCents > p.ticketTotalCents && ` + ${formatMoney(p.estimatedTotalCents - p.ticketTotalCents, p.currency)} de frais connus (vos besoins)`}
          </p>
          {p.estimatedTotalCents === p.ticketTotalCents && notIncluded.length > 0 && (
            <p className="text-xs text-muted">En option : {notIncluded.map((l) => `${l.label.toLowerCase()} ${formatMoney(l.cents, p.currency)}`).join(", ")}</p>
          )}
          <p className="text-xs text-muted">{formatMoney(p.perPassengerCents, p.currency)} / passager (billet)</p>
          <BookingButton offer={offer} />
          <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-deep-700" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            Détails <ChevronDown size={14} className={open ? "rotate-180" : ""} />
          </button>
        </div>
      </div>
      {open && (
        <div className="grid gap-4 border-t border-sage-100 bg-sage-50/60 p-4 text-sm md:grid-cols-3">
          <div>
            <p className="mb-1 font-semibold text-deep-900">Détail du prix</p>
            <ul className="space-y-1">
              {p.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>
                    {l.label}
                    {!l.included && <span className="text-xs text-orange-600"> (non inclus dans le billet)</span>}
                    {l.kind === "estimate" && <span className="text-xs text-muted"> (estimation)</span>}
                  </span>
                  <span className="tabular-nums">{formatMoney(l.cents, p.currency)}</span>
                </li>
              ))}
            </ul>
            {p.original.currency !== p.currency && (
              <p className="mt-2 text-xs text-muted">
                Prix d&apos;origine : {formatMoney(p.original.cents, p.original.currency)}. {p.fxRateNote}
              </p>
            )}
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 font-semibold text-deep-900">
              <Luggage size={14} /> Bagages
            </p>
            <p>Cabine : {offer.baggage.cabinBags ?? "non précisé"}</p>
            <p>Soute : {offer.baggage.checkedBags === null ? "non précisé" : offer.baggage.checkedBags === 0 ? "non inclus" : `${offer.baggage.checkedBags} inclus`}</p>
            {offer.baggage.checkedBagFeeCents != null && <p>Supplément soute connu : {formatMoney(offer.baggage.checkedBagFeeCents, p.currency)}</p>}
            {offer.baggage.note && <p className="text-xs text-muted">{offer.baggage.note}</p>}
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 font-semibold text-deep-900">
              <RefreshCcw size={14} /> Conditions
            </p>
            <p>Remboursable : {offer.conditions.refundable == null ? "non précisé" : offer.conditions.refundable ? "oui" : "non"}</p>
            <p>Modifiable : {offer.conditions.changeable == null ? "non précisé" : offer.conditions.changeable ? "oui" : "non"}</p>
            {offer.conditions.note && <p className="text-xs text-muted">{offer.conditions.note}</p>}
            <p className="mt-2 text-xs text-muted">
              Vols : {offer.slices.flatMap((s) => s.segments.map((g) => `${g.flightNumber} ${g.origin}→${g.destination} ${time(g.departLocal)}–${time(g.arriveLocal)}`)).join(" · ")}
            </p>
            <p className="text-xs text-muted">Horaires en heure locale de chaque aéroport. Prix obtenu le {new Date(offer.fetchedAt).toLocaleString("fr-FR")}.</p>
          </div>
        </div>
      )}
    </article>
  );
}

function BookingButton({ offer }: { offer: FlightOffer }) {
  const b = offer.booking;
  if (b.type === "unavailable")
    return (
      <p className="mt-2 rounded-lg bg-sage-100 px-2 py-1 text-xs text-deep-700" title="Aucun lien de réservation pour cette offre">
        {b.label}
      </p>
    );
  return (
    <a href={b.url} target="_blank" rel="noopener noreferrer sponsored" className="btn-accent mt-2">
      {b.label} <ExternalLink size={14} />
      {b.type === "affiliate_redirect" && <span className="rounded bg-white/20 px-1 text-[10px]">affilié</span>}
    </a>
  );
}
