import { describe, expect, it } from "vitest";
import { screenContent, usefulnessScore } from "@/lib/services/community";
import { parseQuery } from "@/lib/ai/parser";
import { parseSections } from "@/lib/ai/assistant";
import { bestMonths, scoreMonths } from "@/lib/services/seasons";
import { computeBudget } from "@/lib/services/budget";
import { getDestination } from "@/data/destinations";
import { worldStats } from "@/lib/services/me";
import { recommend } from "@/lib/services/recommendations";

const base = { title: "Prendre le bus de nuit", body: "Le bus de nuit relie l'aéroport au centre pour quelques euros, toutes les 20 minutes.", kind: "experience", accountAgeMinutes: 10_000 };

describe("modération automatique", () => {
  it("publie un conseil normal", () => {
    expect(screenContent(base).status).toBe("published");
  });
  it("refuse la promotion non déclarée et les excès de liens", () => {
    expect(() => screenContent({ ...base, body: base.body + " Utilisez le code DINO10 pour -10 % avec mon lien." })).toThrow();
    expect(() => screenContent({ ...base, body: "https://a.fr https://b.fr https://c.fr " + base.body })).toThrow();
  });
  it("met en attente les motifs d'arnaque et les liens de comptes neufs", () => {
    expect(screenContent({ ...base, body: base.body + " Contactez-moi sur WhatsApp pour réserver." }).status).toBe("pending");
    expect(screenContent({ ...base, body: base.body + " https://exemple.fr", accountAgeMinutes: 5 }).status).toBe("pending");
  });
  it("accepte une promotion déclarée comme sponsorisée", () => {
    expect(screenContent({ ...base, kind: "sponsored", body: base.body + " Utilisez le code DINO10." }).status).toBe("published");
  });
});

describe("classement des conseils", () => {
  const now = new Date("2027-06-01T00:00:00Z");
  const t = { likeCount: 10, saveCount: 5, commentCount: 2, reportCount: 0, createdAt: new Date("2027-05-01T00:00:00Z"), verifiedAt: null, kind: "experience", category: "restaurants", bodyLength: 300, authorLikes: 50 };
  it("pénalise les signalements et l'ancienneté, valorise la vérification", () => {
    const s0 = usefulnessScore(t, now).score;
    expect(usefulnessScore({ ...t, reportCount: 3 }, now).score).toBeLessThan(s0);
    expect(usefulnessScore({ ...t, createdAt: new Date("2024-01-01") }, now).score).toBeLessThan(s0);
    expect(usefulnessScore({ ...t, verifiedAt: new Date("2027-05-20") }, now).score).toBeGreaterThan(s0);
  });
  it("déclasse légèrement le contenu sponsorisé", () => {
    expect(usefulnessScore({ ...t, kind: "sponsored" }, now).score).toBeLessThan(usefulnessScore(t, now).score);
  });
});

describe("analyse de requêtes en langage naturel (sans IA)", () => {
  it("extrait durée, mois, budget, envies et départ", () => {
    const p = parseQuery("Je veux partir cinq jours en avril, au soleil, avec 600 euros, au départ de Lyon");
    expect(p.nights).toBe(4);
    expect(p.month).toBe(4);
    expect(p.budget).toBe(600);
    expect(p.tags).toContain("plage");
    expect(p.origin).toBe("LYS");
    expect(p.intent).toBe("inspiration");
  });
  it("reconnaît une question de saison sur un pays", () => {
    const p = parseQuery("Est-ce une bonne idée de partir au Japon en août ?");
    expect(p.intent).toBe("best_time");
    expect(p.destinations).toContain("tokyo");
    expect(p.month).toBe(8);
  });
  it("reconnaît l'envie d'éviter la foule et une destination méconnue", () => {
    const p = parseQuery("une destination romantique, peu fréquentée, méconnue");
    expect(p.avoidCrowds).toBe(true);
    expect(p.hiddenGems).toBe(true);
    expect(p.tags).toContain("romantique");
  });
});

describe("réponse structurée de l'IA", () => {
  it("découpe les quatre sections", () => {
    const s = parseSections("## Faits vérifiés\n- A\n## Estimations\n- B\n## Prévisions\n- C\n## Recommandations\n- D\nIncertitudes : rien");
    expect(s.map((x) => x.title)).toEqual(["Faits vérifiés", "Estimations", "Prévisions", "Recommandations"]);
    expect(s[0].items).toEqual(["A"]);
  });
});

describe("saisons", () => {
  it("sépare météo, prix et affluence et trouve un mois moins cher et calme avec une météo correcte", () => {
    const d = getDestination("lisbonne")!;
    const scores = scoreMonths(d, d.climate.tmax.map((tmax, i) => ({ tmax, tmin: d.climate.tmin[i], precip: d.climate.precip[i] })));
    expect(scores).toHaveLength(12);
    const b = bestMonths(scores);
    expect(b.cheapAndQuiet.weather).toBeGreaterThanOrEqual(45);
    expect(scores[7].crowd).toBeLessThan(scores[0].crowd); // août plus fréquenté que janvier
  });
  it("classe un typhon en inconvénient, jamais en point fort", () => {
    const d = getDestination("tokyo")!;
    const s = scoreMonths(d, d.climate.tmax.map((tmax, i) => ({ tmax, tmin: d.climate.tmin[i], precip: d.climate.precip[i] })))[8];
    expect(s.pros.join(" ")).not.toMatch(/typhon/i);
  });
});

describe("budget", () => {
  it("produit trois scénarios ordonnés, chaque ligne étiquetée", async () => {
    const b = await computeBudget({ destination: "lisbonne", origin: "PAR", nights: 5, travelers: 2, month: 4 });
    const [eco, value, comfort] = b.scenarios.map((s) => s.totalCents);
    expect(eco).toBeLessThan(value);
    expect(value).toBeLessThan(comfort);
    expect(b.scenarios.every((s) => s.lines.every((l) => ["confirmé", "estimation"].includes(l.nature)))).toBe(true);
    expect(b.byMonth).toHaveLength(12);
  });
  it("marque le vol comme confirmé quand l'utilisateur fournit un prix réel", async () => {
    const b = await computeBudget({ destination: "lisbonne", origin: "PAR", nights: 5, travelers: 2, month: 4, flightPerPerson: 150 });
    const flight = b.scenarios[1].lines.find((l) => l.key === "flight");
    expect(flight?.nature).toBe("confirmé");
  });
});

describe("Mon monde et recommandations", () => {
  it("calcule les statistiques de voyage", () => {
    const st = worldStats([
      { countryIso: "FR", cityName: "", status: "visited" },
      { countryIso: "JP", cityName: "Kyoto", status: "visited" },
      { countryIso: "PE", cityName: "", status: "wishlist" },
    ]);
    expect(st.countries).toBe(2);
    expect(st.continents).toBe(2);
    expect(st.cities).toBe(1);
    expect(st.wishlistCountries).toBe(1);
  });
  it("explique chaque recommandation et réserve une place à la découverte", () => {
    const recs = recommend(
      { tagWeights: new Map([["plage", 5]]), dismissed: new Set(["bali"]), seen: new Set(), personalized: true },
      { month: 5, limit: 8 },
    );
    expect(recs.every((r) => r.reasons.length > 0)).toBe(true);
    expect(recs.some((r) => r.discovery)).toBe(true);
    expect(recs.map((r) => r.slug)).not.toContain("bali");
  });
  it("affiche une sélection non personnalisée si la personnalisation est désactivée", () => {
    const recs = recommend({ tagWeights: new Map(), dismissed: new Set(), seen: new Set(), personalized: false }, { month: 5, limit: 4 });
    expect(recs[0].reasons[0]).toMatch(/non personnalisée/);
  });
});
