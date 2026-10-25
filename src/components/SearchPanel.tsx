"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { BedDouble, Compass, Plane, SlidersHorizontal } from "lucide-react";
import { PlaceInput } from "./PlaceInput";
import { qs } from "@/lib/client/fetcher";
import { addDays, todayIn } from "@/lib/utils/dates";

type Place = { code: string; label: string };
export type CityOption = { slug: string; name: string };

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function nextMonths(n: number) {
  const t = todayIn();
  const y = Number(t.slice(0, 4));
  const m = Number(t.slice(5, 7));
  return Array.from({ length: n }, (_, i) => {
    const mm = ((m - 1 + i) % 12) + 1;
    const yy = y + Math.floor((m - 1 + i) / 12);
    return { value: `${yy}-${String(mm).padStart(2, "0")}`, label: `${MONTHS[mm - 1]} ${yy}` };
  });
}

export function SearchPanel({ cities, defaultOrigin, initialTab = "flights", only }: { cities: CityOption[]; defaultOrigin?: Place; initialTab?: "flights" | "hotels" | "inspire"; only?: "flights" }) {
  const [tab, setTab] = useState(initialTab);
  const tabs = [
    { id: "flights" as const, label: "Vols", Icon: Plane },
    { id: "hotels" as const, label: "Hôtels", Icon: BedDouble },
    { id: "inspire" as const, label: "Je ne sais pas où partir", Icon: Compass },
  ];
  return (
    <div className="card p-4 sm:p-6">
      {!only && <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Type de recherche">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={clsx("btn", tab === id ? "bg-deep-800 text-white" : "bg-sage-50 text-deep-800 hover:bg-sage-100")}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>}
      {tab === "flights" && <FlightForm defaultOrigin={defaultOrigin} />}
      {tab === "hotels" && <HotelForm cities={cities} />}
      {tab === "inspire" && <InspireForm defaultOrigin={defaultOrigin} />}
    </div>
  );
}

function FlightForm({ defaultOrigin }: { defaultOrigin?: Place }) {
  const router = useRouter();
  const sp = useSearchParams();
  const g = (k: string) => sp.get(k) ?? "";
  const today = todayIn();
  const [trip, setTrip] = useState<"roundtrip" | "oneway">(g("trip") === "oneway" ? "oneway" : "roundtrip");
  const [origin, setOrigin] = useState<Place>(g("origin") ? { code: g("origin"), label: g("origin") } : (defaultOrigin ?? { code: "PAR", label: "Paris (tous les aéroports)" }));
  const [destination, setDestination] = useState<Place>(g("destination") ? { code: g("destination"), label: g("destination") } : { code: "", label: "" });
  const [dateMode, setDateMode] = useState<"fixed" | "flexible">(g("flexMonth") ? "flexible" : "fixed");
  const [departDate, setDepartDate] = useState(g("departDate") || addDays(today, 30));
  const [returnDate, setReturnDate] = useState(g("returnDate") || addDays(g("departDate") || today, g("departDate") ? 7 : 37));
  const [month, setMonth] = useState(g("flexMonth") || nextMonths(2)[1].value);
  const [adults, setAdults] = useState(Number(g("adults") || 1));
  const [children, setChildren] = useState(Number(g("children") || 0));
  const [cabin, setCabin] = useState(g("cabin") || "economy");
  const [maxPrice, setMaxPrice] = useState(g("maxPrice"));
  const [showFilters, setShowFilters] = useState(false);
  const [maxStops, setMaxStops] = useState(g("maxStops"));
  const [departAfter, setDepartAfter] = useState(g("departAfter"));
  const [departBefore, setDepartBefore] = useState(g("departBefore"));
  const [checkedBag, setCheckedBag] = useState(g("checkedBag") === "true");
  const [maxDurationHours, setMaxDurationHours] = useState(g("maxDurationHours"));
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!origin.code) return setError("Choisissez un aéroport ou une ville de départ dans la liste.");
    if (destination.code === "ANYWHERE" || !destination.code) {
      if (!destination.code && destination.label) return setError("Choisissez une destination dans la liste, ou « Partout ».");
      const m = dateMode === "flexible" ? Number(month.slice(5, 7)) : Number(departDate.slice(5, 7));
      return router.push(`/inspiration?${qs({ origin: origin.code, budget: maxPrice || 800, travelers: adults + children, month: m })}`);
    }
    const common = { origin: origin.code, destination: destination.code, adults, children, cabin, maxPrice, maxStops, departAfter, departBefore, checkedBag, maxDurationHours };
    if (dateMode === "flexible") return router.push(`/vols?${qs({ ...common, trip, flexMonth: month })}`);
    if (trip === "roundtrip" && returnDate < departDate) return setError("La date de retour doit suivre la date de départ.");
    router.push(`/vols?${qs({ ...common, trip, departDate, returnDate: trip === "roundtrip" ? returnDate : undefined })}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Recherche de vols">
      <div className="flex flex-wrap gap-4 text-sm">
        {[
          ["roundtrip", "Aller-retour"],
          ["oneway", "Aller simple"],
        ].map(([v, l]) => (
          <label key={v} className="flex items-center gap-2">
            <input type="radio" name="trip" checked={trip === v} onChange={() => setTrip(v as "roundtrip" | "oneway")} /> {l}
          </label>
        ))}
        <a href="/vols?trip=multicity" className="btn-link text-sm">
          Multi-destinations
        </a>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <PlaceInput name="origin" label="Départ" value={origin} onChange={setOrigin} placeholder="Ville ou aéroport" />
        <PlaceInput name="destination" label="Destination" value={destination} onChange={setDestination} placeholder="Ville, aéroport… ou « Partout »" allowAnywhere />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="dateMode" checked={dateMode === "fixed"} onChange={() => setDateMode("fixed")} /> Dates précises
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="dateMode" checked={dateMode === "flexible"} onChange={() => setDateMode("flexible")} /> Dates flexibles (calendrier du mois)
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dateMode === "fixed" ? (
          <>
            <label className="field">
              <span>Aller</span>
              <input className="input" type="date" required min={today} value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
            </label>
            <label className="field">
              <span>Retour</span>
              <input className="input" type="date" disabled={trip === "oneway"} min={departDate} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </label>
          </>
        ) : (
          <label className="field sm:col-span-2">
            <span>Mois de départ</span>
            <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
              {nextMonths(12).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="field">
            <span>Adultes</span>
            <input className="input" type="number" min={1} max={9} value={adults} onChange={(e) => setAdults(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Enfants</span>
            <input className="input" type="number" min={0} max={8} value={children} onChange={(e) => setChildren(Number(e.target.value))} />
          </label>
        </div>
        <label className="field">
          <span>Classe</span>
          <select className="input" value={cabin} onChange={(e) => setCabin(e.target.value)}>
            <option value="economy">Économique</option>
            <option value="premium_economy">Premium éco</option>
            <option value="business">Affaires</option>
            <option value="first">Première</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="field w-40">
          <span>Budget max (€)</span>
          <input className="input" inputMode="numeric" placeholder="ex. 400" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ""))} />
        </label>
        <button type="button" className="btn-ghost" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal size={16} /> Filtres
        </button>
        <button type="submit" className="btn-accent ml-auto px-6 py-3 text-base">
          Rechercher
        </button>
      </div>
      {showFilters && (
        <div className="grid gap-3 rounded-xl bg-sage-50 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="field">
            <span>Escales</span>
            <select className="input" value={maxStops} onChange={(e) => setMaxStops(e.target.value)}>
              <option value="">Peu importe</option>
              <option value="0">Direct uniquement</option>
              <option value="1">1 escale max</option>
            </select>
          </label>
          <label className="field">
            <span>Départ après</span>
            <select className="input" value={departAfter} onChange={(e) => setDepartAfter(e.target.value)}>
              <option value="">—</option>
              {[6, 8, 10, 12, 14, 16].map((h) => (
                <option key={h} value={h}>
                  {h} h
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Départ avant</span>
            <select className="input" value={departBefore} onChange={(e) => setDepartBefore(e.target.value)}>
              <option value="">—</option>
              {[10, 12, 14, 18, 21, 24].map((h) => (
                <option key={h} value={h}>
                  {h} h
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Durée max (h)</span>
            <input className="input" inputMode="numeric" value={maxDurationHours} onChange={(e) => setMaxDurationHours(e.target.value.replace(/[^\d]/g, ""))} />
          </label>
          <label className="flex items-center gap-2 pt-5 text-sm">
            <input type="checkbox" checked={checkedBag} onChange={(e) => setCheckedBag(e.target.checked)} /> Bagage en soute
          </label>
        </div>
      )}
      {error && <p className="text-sm text-orange-600" role="alert">{error}</p>}
    </form>
  );
}

function HotelForm({ cities }: { cities: CityOption[] }) {
  const router = useRouter();
  const today = todayIn();
  const [city, setCity] = useState(cities[0]?.slug ?? "");
  const [checkin, setCheckin] = useState(addDays(today, 30));
  const [checkout, setCheckout] = useState(addDays(today, 34));
  const [adults, setAdults] = useState(2);
  const [rooms, setRooms] = useState(1);
  return (
    <form
      aria-label="Recherche d'hôtels"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/hotels?${qs({ city, checkin, checkout, adults, rooms })}`);
      }}
    >
      <label className="field lg:col-span-2">
        <span>Ville</span>
        <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Arrivée</span>
        <input className="input" type="date" min={today} value={checkin} onChange={(e) => setCheckin(e.target.value)} required />
      </label>
      <label className="field">
        <span>Départ</span>
        <input className="input" type="date" min={addDays(checkin, 1)} value={checkout} onChange={(e) => setCheckout(e.target.value)} required />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="field">
          <span>Adultes</span>
          <input className="input" type="number" min={1} max={12} value={adults} onChange={(e) => setAdults(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Chambres</span>
          <input className="input" type="number" min={1} max={6} value={rooms} onChange={(e) => setRooms(Number(e.target.value))} />
        </label>
      </div>
      <button type="submit" className="btn-accent self-end px-6 py-3 text-base">
        Comparer
      </button>
    </form>
  );
}

function InspireForm({ defaultOrigin }: { defaultOrigin?: Place }) {
  const router = useRouter();
  const [origin, setOrigin] = useState<Place>(defaultOrigin ?? { code: "PAR", label: "Paris (tous les aéroports)" });
  const [budget, setBudget] = useState("700");
  const [nights, setNights] = useState(5);
  const [month, setMonth] = useState("0");
  return (
    <form
      aria-label="Inspiration"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/inspiration?${qs({ origin: origin.code, budget, nights, month })}`);
      }}
    >
      <div className="lg:col-span-2">
        <PlaceInput name="origin" label="Je pars de" value={origin} onChange={setOrigin} />
      </div>
      <label className="field">
        <span>Budget par personne (€)</span>
        <input className="input" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))} required />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="field">
          <span>Nuits</span>
          <input className="input" type="number" min={1} max={60} value={nights} onChange={(e) => setNights(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Mois</span>
          <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="0">Flexible</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" className="btn-accent self-end px-6 py-3 text-base">
        Inspire-moi
      </button>
    </form>
  );
}
