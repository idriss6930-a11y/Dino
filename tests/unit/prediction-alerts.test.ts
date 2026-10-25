import { describe, expect, it } from "vitest";
import { analyzePriceHistory, dailyMin } from "@/lib/services/price-history";
import { decide, fingerprint } from "@/lib/services/alerts";
import { addDays } from "@/lib/utils/dates";

const series = (start: string, values: number[]) => values.map((cents, i) => ({ date: addDays(start, i), cents }));

describe("prévision de prix", () => {
  it("dit clairement quand les données sont insuffisantes", () => {
    const r = analyzePriceHistory({ points: series("2027-01-01", [100, 110, 105]), currentCents: 100, currency: "EUR", travelDate: "2027-04-01", today: "2027-01-03", isDemo: false });
    expect(r.available).toBe(false);
    expect(r.recommendation).toBe("insufficient_data");
    expect(r.confidence.level).toBe("aucune");
  });

  it("recommande d'acheter quand le prix est dans le bas de l'historique", () => {
    const pts = series("2027-01-01", [30000, 31000, 29500, 30500, 31500, 30200, 29800, 30800, 31200, 30100, 29900, 30400, 31000, 30600]);
    const r = analyzePriceHistory({ points: pts, currentCents: 25000, currency: "EUR", travelDate: "2027-03-01", today: "2027-01-14", isDemo: false });
    expect(r.available).toBe(true);
    expect(r.verdict).toBe("bon prix");
    expect(r.recommendation).toBe("buy_now");
    expect(r.stats!.percentile).toBeLessThan(10);
  });

  it("ne recommande pas d'acheter un prix élevé et ne promet jamais de baisse", () => {
    const pts = series("2027-01-01", [20000, 20500, 19800, 20200, 20100, 19900, 20300, 20000, 20400, 20200]);
    const r = analyzePriceHistory({ points: pts, currentCents: 26000, currency: "EUR", travelDate: "2027-03-15", today: "2027-01-10", isDemo: false });
    expect(r.verdict).toBe("prix élevé");
    expect(r.recommendation).not.toBe("buy_now");
    expect(r.recommendationText).not.toMatch(/va baisser|baissera/i);
    expect(r.confidence.score).toBeLessThanOrEqual(85);
  });

  it("ignore les observations futures et calcule l'anticipation à partir de la date d'achat", () => {
    const pts = [...series("2027-01-01", [100, 100, 100, 100, 100, 100, 100, 100]), { date: "2027-06-01", cents: 1 }];
    const r = analyzePriceHistory({ points: pts, currentCents: 100, currency: "EUR", travelDate: "2027-02-08", today: "2027-01-08", isDemo: true });
    expect(r.series.every((p) => p.date <= "2027-01-08")).toBe(true);
    expect(r.leadDays).toBe(31);
    expect(r.isDemo).toBe(true);
  });

  it("garde le minimum de chaque jour", () => {
    expect(dailyMin([{ date: "2027-01-01", cents: 300 }, { date: "2027-01-01", cents: 200 }, { date: "2027-01-02", cents: 250 }])).toEqual([
      { date: "2027-01-01", cents: 200 },
      { date: "2027-01-02", cents: 250 },
    ]);
  });
});

describe("décision d'alerte (anti-spam)", () => {
  it("notifie sous le prix maximal", () => {
    expect(decide({ current: 9000, reference: 12000, lastNotified: null, maxPriceCents: 10000, dropPct: null }).trigger).toBe(true);
  });
  it("ne renotifie pas au même niveau de prix", () => {
    expect(decide({ current: 9000, reference: 12000, lastNotified: 9100, maxPriceCents: 10000, dropPct: null }).trigger).toBe(false);
  });
  it("renotifie si le prix rebaisse nettement", () => {
    expect(decide({ current: 8500, reference: 12000, lastNotified: 9100, maxPriceCents: 10000, dropPct: null }).trigger).toBe(true);
  });
  it("notifie une baisse en pourcentage par rapport à la référence", () => {
    const d = decide({ current: 8800, reference: 10000, lastNotified: null, maxPriceCents: null, dropPct: 10 });
    expect(d.trigger).toBe(true);
    expect(d.changePct).toBe(-12);
  });
  it("ignore une hausse ou une petite baisse", () => {
    expect(decide({ current: 9500, reference: 10000, lastNotified: null, maxPriceCents: null, dropPct: 10 }).trigger).toBe(false);
    expect(decide({ current: 11000, reference: 10000, lastNotified: null, maxPriceCents: null, dropPct: 10 }).trigger).toBe(false);
  });
  it("produit une empreinte stable pour dédoublonner", () => {
    expect(fingerprint({ comparableKey: "CDG-LIS", priceCents: 100, currency: "EUR" })).toBe(fingerprint({ comparableKey: "CDG-LIS", priceCents: 100, currency: "EUR" }));
    expect(fingerprint({ comparableKey: "CDG-LIS", priceCents: 100, currency: "EUR" })).not.toBe(fingerprint({ comparableKey: "CDG-LIS", priceCents: 99, currency: "EUR" }));
  });
});
